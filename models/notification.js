const { Model, DataTypes } = require('sequelize');

class Notification extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      textChannelId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      guildId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      voiceChannelId: {
        type: DataTypes.STRING,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'Notification'
    });
  }
}

module.exports = Notification;
