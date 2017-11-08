const app = require('./app')
const _c = require("./../config/config")
const rd = app.rd
const db = app.db
const WebSocket = require('ws')
const rp = require('request-promise')
const fs = require('fs')
const youtubedl = require('youtube-dl')

let playerStatus = false
let disControl = false
let onDownload = false

const ws = new WebSocket(`ws://${_c.mopidy}/mopidy/ws/`, {
  perMessageDeflate: false
});

ws.on('open', function open() {
  mopidApi('core.tracklist.set_consume', [true])
  console.log(`Mopidy Connected ...`)
});

/**
 * Event trigger
 */
ws.on('message', function incoming(data) {
  data = JSON.parse(data)
  if(data.event) {
    console.log(data.event)
    switch(data.event) {
      case 'tracklist_changed':
        getCurrentTrack()
        break;
      case 'track_playback_paused':
        getCurrentTrack()
        break;
      case 'track_playback_started':
        getCurrentTrack()
        break;
      case 'track_playback_resumed':
        getCurrentTrack()
        break;
      case 'track_playback_stoped':
        getCurrentTrack()
        break;
      case 'track_playback_ended':
        getCurrentTrack()
        break;
      case 'track_playback_ended':
        getCurrentTrack()
        break;
    }
  }
});

const mopidApi = function(method, params = []) {
  return rp({
    uri: `http://${_c.mopidy}/mopidy/rpc`,
    method: 'POST',
    body: {
      "jsonrpc": "2.0",
      "id": 1,
      "method": method,
      "params": params
    },
    json: true
  })
  .then(d => d.result)
}

/**
 * Get Player State
 */
const getState = function() {
  return mopidApi('core.playback.get_state')
}

// Store to Database
const storeToDb = function(title, url) {
  var m = url.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/)
  var id = m[5]
  if(onDownload) {
    setTimeout(function() {
      storeToDb(title, url)
      console.log(`Waiting Another Download Done ...`)
    }, 3000);
  } else {
    onDownload = true
    db.SavedSongs.findOne({
      where: {url}
    })
    .then(d => {
      if(!d) {
        saveFile(url, id, function(title, filename, url) {
          onDownload = false
          db.SavedSongs.create({
            title,
            url,
            filename,
            playCount: 1
          })
        })
      }
    }) 
  }
}

const saveFile = function(url, id, cb) {
  var title = ""
  try {
    var video = youtubedl(url,
      // Optional arguments passed to youtube-dl.
      ['-x', '--audio-format', 'mp3'],
      // Additional options can be given for calling `child_process.execFile()`.
      { cwd: __dirname });
    
      // Will be called when the download starts.
      video.on('info', function(info) {
        console.log('Download started');
        console.log('title: ' + info.title);
        console.log('size: ' + info.size);
        title = info.title
      });
      var stream = fs.createWriteStream(__dirname + '/../music/' + id + '.mp3')
      stream.on('close', () => {
        cb(title, id + '.mp3', id)
      })
      video.pipe(stream);
    } catch(e) {
      console.log(`Failed`)
      onDownload = false
    }
}

const PORT = process.env.PORT || 9000;

let playState = false
let playerTitle = "- idle"

var io = require('socket.io').listen(
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`App listening on port ${PORT}!`);
  })
);

/**
 * Get Current Track State
 */
const getCurrentTrack = function() {
  var current = {},
      queue = {}

  mopidApi('core.playback.get_current_tl_track')
  .then(_current => {
    current = _current
    return mopidApi('core.tracklist.get_tl_tracks')
  })
  .then(_queue => {
    queue = _queue.map(d => {
      var tlid = d.tlid
      d = d.track
      if(current) {
        if(tlid == current.tlid) d.active = 1
      }
      d.from = 'pedox'
      return d
    })
    return mopidApi('core.playback.get_state')
  })
  .then(state => {
    if (current) {
      playerTitle = state.toUpperCase() + ': ' + `${current.track.name}`
    } else {
      playerTitle = '- idle'
    }
    playState = (state == 'playing' ? true : false)
    io.emit('playerState', {
      playState,
      playerTitle,
      queue,
      disControl
    })
  })
}

io.sockets.on('connection', function (socket) {
  var ip = socket.request.connection.remoteAddress
  console.log(`Who is connected at ${ip}`)
  getCurrentTrack()
  rd.get('CLIENT:' + ip, (err, d) => {
    var state = {join: false}
    if(d !== null) {
        console.log(`${d} - is connected at ${ip}`)
        state.join = true
        state.name = d
    }
    socket.emit('session', state)
  })
  socket.on('join', (name) => {
    rd.get('CLIENT:' + ip, (err, d) => {
        if(d == null) {
            rd.set('CLIENT:' + ip, name)
        }
        socket.emit('session', {
          join: true,
          name: name
        })
    })
  })

  socket.on('addTrack', (ytUrl) => {
    var m = ytUrl.match(/^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/)
    var ytId = m[5]
    db.SavedSongs.findOne({where: {url:ytId}})
    .then(d => {
      if(d !== null) {
        d.playCount += 1
        d.save()
        if(fs.existsSync(__dirname + '/../music/' + d.filename)) {
          mopidApi('core.tracklist.add', [
            [
              {
                "comment": "",
                "name": `${d.title}`,
                "uri": "file:" + __dirname + '/../music/' + d.filename,
                "__model__": "Track"
              }
            ], 
            null,
            null,
          ])
          .then(d => {
            if(d == null) {
              socket.emit('onError', 'File Not Found')
            }
            getCurrentTrack()
          })
        } else {
          socket.emit('onError', 'File Not Found')  
        }
      } else {
        mopidApi('core.tracklist.add', [
          null, 
          null,
          "yt:" + ytUrl
        ])
        .then(d => {
          console.log(d)
          if(d == null) {
            socket.emit('onError', 'Invalid URL or Video is not found')
          } else {
            storeToDb(d[0].track.name, ytUrl)
          }
          getCurrentTrack()
        })
      }
    })
  })

  socket.on('addSavedToQueue', (key) => {
    db.SavedSongs.findById(key)
    .then(d => {
      if(d !== null) {
        if(fs.existsSync(__dirname + '/../music/' + d.filename)) {
          d.playCount += 1
          d.save()
          mopidApi('core.tracklist.add', [
            [
              {
                "comment": d.url,
                "name": `${d.title}`,
                "uri": "file:" + __dirname + '/../music/' + d.filename,
                "__model__": "Track"
              }
            ], 
            null,
            null,
          ])
          .then(d => {
            if(d == null) {
              socket.emit('onError', 'File Not Found')
            }
            getCurrentTrack()
          })
        } else {
          socket.emit('onError', 'File Not Found')  
        }
      } else {
        socket.emit('onError', 'File Not Found')
      }
    })

    
  })

  socket.on('playState', (state) => {
    if(state == 1) {
      mopidApi('core.playback.previous')
    } else if(state == 2) {
      mopidApi('core.playback.next')
    } else {
      if(playState) {
        mopidApi('core.playback.pause')
      } else {
        mopidApi('core.playback.play')
      }
    }
    getCurrentTrack()
  })
});