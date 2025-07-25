// models/index.js

const sequelize = require('../config/database.js'); // データベース接続設定を読み込む
const NotificationModel = require('../models/notification.js'); // モデルクラスを読み込む
const MessageTemplate = require('../models/messageTemplate.js');

// モデルの初期化
NotificationModel.init(sequelize);
MessageTemplate.init(sequelize);

sequelize.sync(); // データベースの同期

// 必要なら関連付けなどここに記述可能

module.exports = {
  sequelize,
  Notification: NotificationModel,
  MessageTemplate
};
