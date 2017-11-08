const express = require('express');
const db = require('./../models');
const morgan = require('morgan');
const path = require('path');
const redis = require('redis')
const bodyParser = require('body-parser')
const rd = redis.createClient()

const app = express();

app.use(bodyParser.json());

// Setup logger
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] :response-time ms'));

// Serve static assets
app.use(express.static(path.resolve(__dirname, '..', 'build')));

app.get('/api/saved', (req, res) => {
  console.log(`saved`)
  return db.SavedSongs.findAll({
    order: [['title','ASC']]
  })
  .then(d => {
    return res.json(d.map(e => e.get({plain:true})))
  })
})

app.get('/api/search', (req, res) => {
  console.log('Searching')
  return db.SavedSongs.findAll({
    where: {
      title: {
        $like: '%'+req.query.title+'%'
      }
    }//["title like '%'.req.params.title.'%'"]
  })
  .then(d => {
    res.json(d.map(e => e.get({plain:true})))
  })
  .catch(function(){
    res.json("Not Found")
  })
})

app.delete('/api/delete/:id', (req, res) => {
  console.log('deleting')
  return db.SavedSongs.destroy({
    where: {
      id: req.params.id
    }
  })
  .then(d => {
    console.log('Deleting')
    res.json(d.map(e => e.get({plain:true})))
  })
})

// Always return the main index.html, so react-router render the route in the client
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, '..', 'build', 'index.html'));
});

module.exports = app;

module.exports.db = db
module.exports.rd = rd