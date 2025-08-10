const { DataTypes, Model } = require('sequelize');

class MessageTemplate extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      content: {
        type: DataTypes.TEXT,
        allowNull: false
      }
    }, {
      sequelize,
      modelName: 'MessageTemplate',
      tableName: 'message_templates',
      timestamps: true
    });
  }
}

module.exports = MessageTemplate; 