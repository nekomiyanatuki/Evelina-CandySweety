const { DataTypes } = require('sequelize');
const sequelize = require('../config/database.js');

const PermissionManager = sequelize.define('PermissionManager', {
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true
  },
  grantedBy: {
    type: DataTypes.STRING,
    allowNull: false
  },
  grantedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = {
  PermissionManager
}; 