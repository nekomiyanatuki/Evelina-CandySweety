const { DataTypes, Model } = require('sequelize');

class TwitterConfig extends Model {
  static init(sequelize) {
    return super.init({
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true
      },
      // Discordサーバー情報
      guildId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'DiscordサーバーID'
      },
      guildName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Discordサーバー名'
      },
      // 監視対象のTwitterアカウント
      targetUsername: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '監視対象のTwitterユーザー名（@なし）'
      },
      targetDisplayName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '監視対象のTwitter表示名'
      },
      // 投稿先Discordチャンネル
      channelId: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '投稿先DiscordチャンネルID'
      },
      channelName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '投稿先Discordチャンネル名'
      },
      // Twitter API設定（サーバーごとに異なる場合）
      apiKey: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter API Key（空の場合はグローバル設定を使用）'
      },
      apiSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter API Secret（空の場合はグローバル設定を使用）'
      },
      accessToken: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter Access Token（空の場合はグローバル設定を使用）'
      },
      accessSecret: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter Access Secret（空の場合はグローバル設定を使用）'
      },
      bearerToken: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Twitter Bearer Token（空の場合はグローバル設定を使用）'
      },
      // 監視設定
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        comment: '監視を有効にするかどうか'
      },
      checkInterval: {
        type: DataTypes.INTEGER,
        defaultValue: 300000,
        comment: '監視間隔（ミリ秒）'
      },
      // 投稿フィルタリング設定
      excludeRetweets: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'リツイートを除外するかどうか'
      },
      excludeReplies: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: 'リプライを除外するかどうか'
      },
      excludeQuotes: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
        comment: '引用ツイートを除外するかどうか'
      },
      // 装飾設定
      embedColor: {
        type: DataTypes.STRING,
        defaultValue: '#1DA1F2',
        comment: 'Embedの色（16進数）'
      },
      embedFooter: {
        type: DataTypes.STRING,
        defaultValue: '🐦 X投稿監視Bot',
        comment: 'Embedのフッターテキスト'
      },
      // 最後に監視したツイートID
      lastTweetId: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: '最後に監視したツイートID'
      },
      // メタデータ
      createdBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '設定を作成したユーザーID'
      },
      updatedBy: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: '設定を最後に更新したユーザーID'
      }
    }, {
      sequelize,
      modelName: 'TwitterConfig',
      tableName: 'twitter_configs',
      timestamps: true,
      indexes: [
        {
          unique: true,
          fields: ['guildId', 'targetUsername']
        },
        {
          fields: ['guildId']
        },
        {
          fields: ['isActive']
        }
      ]
    });
  }

  // インスタンスメソッド
  toPublicConfig() {
    // 機密情報を除いた公開設定を返す
    const config = this.toJSON();
    delete config.apiKey;
    delete config.apiSecret;
    delete config.accessToken;
    delete config.accessSecret;
    delete config.bearerToken;
    return config;
  }

  // グローバル設定とマージした設定を返す
  getMergedConfig(globalConfig) {
    return {
      apiKey: this.apiKey || globalConfig.apiKey,
      apiSecret: this.apiSecret || globalConfig.apiSecret,
      accessToken: this.accessToken || globalConfig.accessToken,
      accessSecret: this.accessSecret || globalConfig.accessSecret,
      bearerToken: this.bearerToken || globalConfig.bearerToken,
      checkInterval: this.checkInterval || globalConfig.checkInterval,
      excludeRetweets: this.excludeRetweets,
      excludeReplies: this.excludeReplies,
      excludeQuotes: this.excludeQuotes,
      embedColor: this.embedColor || globalConfig.embedColor,
      embedFooter: this.embedFooter || globalConfig.embedFooter
    };
  }
}

module.exports = TwitterConfig;
