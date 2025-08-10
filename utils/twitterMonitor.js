const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const { EmbedBuilder } = require('discord.js');
const twitterConfig = require('../config/twitter.js');
const { TwitterConfig } = require('../models/index.js');

class TwitterMonitor {
  constructor(discordClient) {
    this.discordClient = discordClient;
    this.twitterClient = null;
    this.lastTweetIds = new Map();
    this.isRunning = false;
    this.cronJobs = new Map();
    
    // 設定されたアカウントの初期化
    this.initializeTwitterClient();
    this.initializeLastTweetIds();
  }

  // Twitter API クライアントの初期化
  initializeTwitterClient() {
    try {
      if (twitterConfig.bearerToken) {
        // Bearer Token認証（読み取り専用）
        this.twitterClient = new TwitterApi(twitterConfig.bearerToken);
      } else if (twitterConfig.apiKey && twitterConfig.apiSecret && 
                 twitterConfig.accessToken && twitterConfig.accessSecret) {
        // OAuth 1.0a認証（読み書き可能）
        this.twitterClient = new TwitterApi({
          appKey: twitterConfig.apiKey,
          appSecret: twitterConfig.apiSecret,
          accessToken: twitterConfig.accessToken,
          accessSecret: twitterConfig.accessSecret,
        });
      } else {
        console.error('❌ Twitter API認証情報が不足しています');
        return;
      }
      
      console.log('✅ Twitter API クライアントが初期化されました');
    } catch (error) {
      console.error('❌ Twitter API クライアントの初期化に失敗しました:', error);
    }
  }

  // 最後に投稿されたツイートIDの初期化
  async initializeLastTweetIds() {
    try {
      // データベースから有効な設定を取得
      const dbConfigs = await TwitterConfig.findAll({
        where: { isActive: true }
      });

      if (dbConfigs.length === 0) {
        console.log('⚠️ データベースに有効なTwitter監視設定がありません');
        // フォールバック: 従来の設定ファイルを使用
        for (const account of twitterConfig.targetAccounts) {
          await this.initializeAccountFromConfig(account);
        }
        return;
      }

      // データベースの設定を使用
      for (const config of dbConfigs) {
        await this.initializeAccountFromDatabase(config);
      }
    } catch (error) {
      console.error('❌ データベース設定の初期化に失敗しました:', error);
      // フォールバック: 従来の設定ファイルを使用
      for (const account of twitterConfig.targetAccounts) {
        await this.initializeAccountFromConfig(account);
      }
    }
  }

  // データベース設定からアカウントを初期化
  async initializeAccountFromDatabase(config) {
    try {
      const user = await this.twitterClient.v2.userByUsername(config.targetUsername);
      if (user.data) {
        const tweets = await this.twitterClient.v2.userTimeline(user.data.id, {
          max_results: 1,
          exclude: ['retweets', 'replies', 'quotes'].filter(type => 
            config[`exclude${type.charAt(0).toUpperCase() + type.slice(1)}`]
          )
        });
        
        if (tweets.data && tweets.data.length > 0) {
          this.lastTweetIds.set(config.targetUsername, tweets.data[0].id);
          console.log(`📝 ${config.targetUsername} の最後のツイートID: ${tweets.data[0].id}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${config.targetUsername} の初期化に失敗しました:`, error);
    }
  }

  // 従来の設定ファイルからアカウントを初期化
  async initializeAccountFromConfig(account) {
    try {
      const user = await this.twitterClient.v2.userByUsername(account.username);
      if (user.data) {
        const tweets = await this.twitterClient.v2.userTimeline(user.data.id, {
          max_results: 1,
          exclude: ['retweets', 'replies', 'quotes'].filter(type => 
            twitterConfig[`exclude${type.charAt(0).toUpperCase() + type.slice(1)}`]
          )
        });
        
        if (tweets.data && tweets.data.length > 0) {
          this.lastTweetIds.set(account.username, tweets.data[0].id);
          console.log(`📝 ${account.username} の最後のツイートID: ${tweets.data[0].id}`);
        }
      }
    } catch (error) {
      console.error(`❌ ${account.username} の初期化に失敗しました:`, error);
    }
  }

  // 監視の開始
  async start() {
    if (this.isRunning) {
      console.log('⚠️ Twitter監視は既に実行中です');
      return;
    }

    if (!this.twitterClient) {
      console.error('❌ Twitter API クライアントが初期化されていません');
      return;
    }

    try {
      // データベースから有効な設定を取得
      const dbConfigs = await TwitterConfig.findAll({
        where: { isActive: true }
      });

      if (dbConfigs.length === 0) {
        console.log('⚠️ データベースに有効なTwitter監視設定がありません');
        // フォールバック: 従来の設定ファイルを使用
        this.startWithConfigFile();
        return;
      }

      // データベースの設定を使用して監視を開始
      this.startWithDatabaseConfigs(dbConfigs);
    } catch (error) {
      console.error('❌ データベース設定の取得に失敗しました:', error);
      // フォールバック: 従来の設定ファイルを使用
      this.startWithConfigFile();
    }
  }

  // データベース設定で監視を開始
  startWithDatabaseConfigs(configs) {
    // 既存のcronジョブを停止
    this.stopCronJobs();

    for (const config of configs) {
      const intervalMinutes = Math.floor(config.checkInterval / 60000);
      const cronExpression = `*/${intervalMinutes} * * * *`;
      
      const job = cron.schedule(cronExpression, () => {
        this.checkNewTweetsForConfig(config);
      });

      this.cronJobs.set(config.id, job);
      console.log(`🔄 ${config.targetUsername} の監視を開始しました（${intervalMinutes}分間隔）`);
    }

    this.isRunning = true;
    console.log(`✅ ${configs.length}件のTwitter監視を開始しました`);
  }

  // 従来の設定ファイルで監視を開始
  startWithConfigFile() {
    const intervalMinutes = Math.floor(twitterConfig.checkInterval / 60000);
    const cronExpression = `*/${intervalMinutes} * * * *`;
    
    const job = cron.schedule(cronExpression, () => {
      this.checkNewTweets();
    });

    this.cronJobs.set('config_file', job);
    console.log(`🔄 Twitter投稿監視を開始しました（${intervalMinutes}分間隔）`);
    this.isRunning = true;
  }

  // 新規ツイートの確認（従来の設定ファイル用）
  async checkNewTweets() {
    if (!this.twitterClient) return;

    for (const account of twitterConfig.targetAccounts) {
      try {
        await this.checkAccountTweets(account);
      } catch (error) {
        console.error(`❌ ${account.username} の監視中にエラーが発生しました:`, error);
      }
    }
  }

  // データベース設定用の新規ツイート確認
  async checkNewTweetsForConfig(config) {
    if (!this.twitterClient) return;

    try {
      await this.checkAccountTweetsFromDatabase(config);
    } catch (error) {
      console.error(`❌ ${config.targetUsername} の監視中にエラーが発生しました:`, error);
    }
  }

  // 特定アカウントのツイート確認（従来の設定ファイル用）
  async checkAccountTweets(account) {
    try {
      const user = await this.twitterClient.v2.userByUsername(account.username);
      if (!user.data) {
        console.error(`❌ ユーザー ${account.username} が見つかりません`);
        return;
      }

      const lastTweetId = this.lastTweetIds.get(account.username);
      const tweets = await this.twitterClient.v2.userTimeline(user.data.id, {
        since_id: lastTweetId,
        max_results: 10,
        exclude: ['retweets', 'replies', 'quotes'].filter(type => 
          twitterConfig[`exclude${type.charAt(0).toUpperCase() + type.slice(1)}`]
        ),
        'tweet.fields': ['created_at', 'public_metrics', 'entities', 'attachments'],
        'media.fields': ['url', 'preview_image_url', 'type'],
        expansions: ['attachments.media_keys']
      });

      if (tweets.data && tweets.data.length > 0) {
        // 新しいツイートを逆順で処理（古い順）
        const newTweets = tweets.data.reverse();
        
        for (const tweet of newTweets) {
          if (!lastTweetId || tweet.id > lastTweetId) {
            await this.postTweetToDiscord(tweet, account);
            this.lastTweetIds.set(account.username, tweet.id);
          }
        }
      }
    } catch (error) {
      console.error(`❌ ${account.username} のツイート取得に失敗しました:`, error);
    }
  }

  // データベース設定用のツイート確認
  async checkAccountTweetsFromDatabase(config) {
    try {
      const user = await this.twitterClient.v2.userByUsername(config.targetUsername);
      if (!user.data) {
        console.error(`❌ ユーザー @${config.targetUsername} が見つかりません`);
        return;
      }

      const lastTweetId = this.lastTweetIds.get(config.targetUsername);
      const tweets = await this.twitterClient.v2.userTimeline(user.data.id, {
        since_id: lastTweetId,
        max_results: 10,
        exclude: ['retweets', 'replies', 'quotes'].filter(type => 
          config[`exclude${type.charAt(0).toUpperCase() + type.slice(1)}`]
        ),
        'tweet.fields': ['created_at', 'public_metrics', 'entities', 'attachments'],
        'media.fields': ['url', 'preview_image_url', 'type'],
        expansions: ['attachments.media_keys']
      });

      if (tweets.data && tweets.data.length > 0) {
        // 新しいツイートを逆順で処理（古い順）
        const newTweets = tweets.data.reverse();
        
        for (const tweet of newTweets) {
          if (!lastTweetId || tweet.id > lastTweetId) {
            await this.postTweetToDiscordFromDatabase(tweet, config);
            this.lastTweetIds.set(config.targetUsername, tweet.id);
            
            // データベースのlastTweetIdも更新
            await config.update({ lastTweetId: tweet.id });
          }
        }
      }
    } catch (error) {
      console.error(`❌ @${config.targetUsername} のツイート取得に失敗しました:`, error);
    }
  }

  // Discordへの投稿（従来の設定ファイル用）
  async postTweetToDiscord(tweet, account) {
    try {
      const channel = await this.discordClient.channels.fetch(account.channelId);
      if (!channel) {
        console.error(`❌ Discordチャンネル ${account.channelId} が見つかりません`);
        return;
      }

      const embed = this.createTweetEmbed(tweet, account);
      await channel.send({ embeds: [embed] });
      
      console.log(`✅ ツイートをDiscordに投稿しました: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Discordへの投稿に失敗しました:', error);
    }
  }

  // Discordへの投稿（データベース設定用）
  async postTweetToDiscordFromDatabase(tweet, config) {
    try {
      const channel = await this.discordClient.channels.fetch(config.channelId);
      if (!channel) {
        console.error(`❌ Discordチャンネル ${config.channelId} が見つかりません`);
        return;
      }

      const embed = this.createTweetEmbedFromDatabase(tweet, config);
      await channel.send({ embeds: [embed] });
      
      console.log(`✅ ツイートをDiscordに投稿しました: ${tweet.id}`);
    } catch (error) {
      console.error('❌ Discordへの投稿に失敗しました:', error);
    }
  }

  // ツイート用のEmbed作成（従来の設定ファイル用）
  createTweetEmbed(tweet, account) {
    const embed = new EmbedBuilder()
      .setColor(twitterConfig.embedColor)
      .setAuthor({
        name: `${account.displayName} (@${account.username})`,
        url: `https://twitter.com/${account.username}`,
        iconURL: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`
      })
      .setDescription(this.formatTweetText(tweet.text))
      .setTimestamp(new Date(tweet.created_at))
      .setFooter({
        text: twitterConfig.embedFooter,
        iconURL: 'https://abs.twimg.com/responsive-web/client-web/icon-192x192.png'
      });

    // メディアの添付
    if (tweet.attachments && tweet.attachments.media_keys) {
      // メディア情報の処理（実際の実装では、メディアの詳細情報も取得する必要があります）
      embed.setImage('https://via.placeholder.com/400x300/1DA1F2/FFFFFF?text=Media');
    }

    // 統計情報の追加
    if (tweet.public_metrics) {
      const metrics = tweet.public_metrics;
      embed.addFields(
        { name: '❤️ いいね', value: metrics.like_count?.toString() || '0', inline: true },
        { name: '🔄 リツイート', value: metrics.retweet_count?.toString() || '0', inline: true },
        { name: '💬 返信', value: metrics.reply_count?.toString() || '0', inline: true }
      );
    }

    // ツイートへのリンク
    embed.setURL(`https://twitter.com/${account.username}/status/${tweet.id}`);

    return embed;
  }

  // ツイート用のEmbed作成（データベース設定用）
  createTweetEmbedFromDatabase(tweet, config) {
    const embed = new EmbedBuilder()
      .setColor(config.embedColor || twitterConfig.embedColor)
      .setAuthor({
        name: `${config.targetDisplayName} (@${config.targetUsername})`,
        url: `https://twitter.com/${config.targetUsername}`,
        iconURL: `https://abs.twimg.com/sticky/default_profile_images/default_profile_normal.png`
      })
      .setDescription(this.formatTweetText(tweet.text))
      .setTimestamp(new Date(tweet.created_at))
      .setFooter({
        text: config.embedFooter || twitterConfig.embedFooter,
        iconURL: 'https://abs.twimg.com/responsive-web/client-web/icon-192x192.png'
      });

    // メディアの添付
    if (tweet.attachments && tweet.attachments.media_keys) {
      // メディア情報の処理（実際の実装では、メディアの詳細情報も取得する必要があります）
      embed.setImage('https://via.placeholder.com/400x300/1DA1F2/FFFFFF?text=Media');
    }

    // 統計情報の追加
    if (tweet.public_metrics) {
      const metrics = tweet.public_metrics;
      embed.addFields(
        { name: '❤️ いいね', value: metrics.like_count?.toString() || '0', inline: true },
        { name: '🔄 リツイート', value: metrics.retweet_count?.toString() || '0', inline: true },
        { name: '💬 返信', value: metrics.reply_count?.toString() || '0', inline: true }
      );
    }

    // ツイートへのリンク
    embed.setURL(`https://twitter.com/${config.targetUsername}/status/${tweet.id}`);

    return embed;
  }

  // ツイートテキストのフォーマット
  formatTweetText(text) {
    if (!text) return '';
    
    // URLの自動リンク化
    let formattedText = text.replace(
      /(https?:\/\/[^\s]+)/g,
      '[$1]($1)'
    );
    
    // ハッシュタグの装飾
    formattedText = formattedText.replace(
      /#(\w+)/g,
      '**#$1**'
    );
    
    // メンションの装飾
    formattedText = formattedText.replace(
      /@(\w+)/g,
      '**@$1**'
    );
    
    return formattedText;
  }

  // 監視の停止
  stop() {
    if (!this.isRunning) {
      console.log('⚠️ Twitter監視は実行されていません');
      return;
    }

    // すべてのcronジョブを停止
    this.cronJobs.forEach((job, configId) => {
      job.stop();
      console.log(`🛑 設定ID ${configId} の監視を停止しました`);
    });
    
    // cronジョブマップをクリア
    this.cronJobs.clear();
    
    this.isRunning = false;
    console.log('🛑 Twitter投稿監視を停止しました');
  }

  // 手動でツイート確認
  async manualCheck() {
    console.log('🔍 手動でツイート確認を実行します');
    
    try {
      // データベースからアクティブな設定を取得
      const { TwitterConfig } = require('../models/index.js');
      const activeConfigs = await TwitterConfig.findAll({ where: { isActive: true } });
      
      if (activeConfigs.length > 0) {
        // データベース設定がある場合は、それらを確認
        console.log(`📊 ${activeConfigs.length}件のアクティブな設定を確認します`);
        for (const config of activeConfigs) {
          try {
            await this.checkNewTweetsForConfig(config);
          } catch (error) {
            console.error(`❌ 設定ID ${config.id} の手動確認中にエラーが発生しました:`, error);
          }
        }
      } else {
        // 従来の設定ファイルを使用
        console.log('📁 設定ファイルを使用して手動確認を実行します');
        await this.checkNewTweets();
      }
    } catch (error) {
      console.error('❌ 手動確認の実行に失敗しました:', error);
      // エラーが発生した場合は、従来の設定ファイルを使用
      try {
        await this.checkNewTweets();
      } catch (fallbackError) {
        console.error('❌ フォールバック確認も失敗しました:', fallbackError);
      }
    }
  }

  // 設定の再読み込み
  async reloadConfigs() {
    console.log('🔄 Twitter監視設定を再読み込みします');
    
    try {
      // 現在の監視を停止
      this.stop();
      
      // 設定を再初期化
      await this.initializeLastTweetIds();
      
      // 監視を再開
      await this.start();
      
      console.log('✅ Twitter監視設定の再読み込みが完了しました');
    } catch (error) {
      console.error('❌ 設定の再読み込みに失敗しました:', error);
      throw error;
    }
  }
}

module.exports = TwitterMonitor;
