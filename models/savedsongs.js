'use strict';
module.exports = function(sequelize, DataTypes) {
  var SavedSongs = sequelize.define('SavedSongs', {
    title: DataTypes.STRING,
    artist: DataTypes.STRING,
    url: DataTypes.STRING,
    filename: DataTypes.STRING,
    addedBy: DataTypes.STRING,
    playCount: DataTypes.INTEGER,
  }, {
    classMethods: {
      associate: function(models) {
        // associations can be defined here
      }
    }
  });
  return SavedSongs;
};