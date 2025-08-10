// modules/mcp-server/discordmcp/router.js
const express = require('express');
const router = express.Router();
const { MessageTemplate } = require('../../../models');
const { ChannelType } = require('discord.js');

let client = null;

function setup(botClient) {
  client = botClient;
}

router.get('/', (req, res) => {
  res.send('MCP Server Root is alive.');
});

router.get('/status', (req, res) => {
  res.json({ status: 'running', timestamp: new Date() });
});

router.get('/botinfo', (req, res) => {
  if (!client || !client.user) {
    return res.status(500).json({ error: 'Discord bot not ready' });
  }

  const uptime = process.uptime();
  const guildCount = client.guilds.cache.size;
  const userCount = client.users.cache.size;
  const memoryUsage = process.memoryUsage();

  res.json({
    bot: {
      username: client.user.tag,
      id: client.user.id,
    },
    stats: {
      uptime: `${Math.floor(uptime)} seconds`,
      guilds: guildCount,
      users: userCount,
      memory: {
        rss: `${(memoryUsage.rss / 1024 / 1024).toFixed(2)} MB`,
        heapUsed: `${(memoryUsage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
      },
    },
    timestamp: new Date(),
  });
});

// Bot設定取得
router.get('/botconfig', (req, res) => {
  // TODO: 設定ファイルやDBから取得
  res.json({ prefix: '!', notifyChannel: '1234567890' });
});

// Bot設定更新
router.post('/botconfig', (req, res) => {
  // TODO: 設定ファイルやDBに保存
  const { prefix, notifyChannel } = req.body;
  res.json({ success: true, prefix, notifyChannel });
});

// Botリスタート
router.post('/restart', (req, res) => {
  // TODO: Bot再起動処理（必要に応じて実装）
  res.json({ success: true, message: 'Botを再起動しました' });
});

// メッセージ送信API（例）
router.post('/sendMessage', async (req, res) => {
  const { channelId, msg } = req.body;
  if (!client) return res.status(500).json({ success: false, error: 'Bot未初期化' });
  try {
    console.log('送信リクエスト:', channelId, msg);
    const channel = await client.channels.fetch(channelId);
    console.log('取得チャンネル:', channel && channel.id, channel && channel.name, channel && channel.type);
    if (!channel || channel.type !== ChannelType.GuildText) {
      console.log('チャンネルが見つからないかギルドのテキストチャンネルではありません');
      return res.status(400).json({ success: false, error: 'チャンネルが見つからないかギルドのテキストチャンネルではありません' });
    }
    console.log('送信直前');
    const sentMsg = await channel.send(msg);
    console.log('送信直後', sentMsg && sentMsg.id);
    res.json({ success: true, message: 'メッセージを送信しました' });
  } catch (e) {
    console.error('送信失敗:', e);
    res.status(500).json({ success: false, error: '送信失敗', detail: e.message });
  }
});

// テンプレート保存用（メモリ）
const templates = [];

// テンプレート一覧取得
router.get('/templates', async (req, res) => {
  try {
    const templates = await MessageTemplate.findAll({ order: [['updatedAt', 'DESC']] });
    res.json({ templates });
  } catch (e) {
    res.status(500).json({ error: 'DBエラー' });
  }
});

// テンプレート保存
router.post('/templates', async (req, res) => {
  console.log('POST /templates body:', req.body);
  const { name, content } = req.body;
  if (!name || !content) {
    return res.status(400).json({ success: false, error: 'nameとcontentは必須です' });
  }
  try {
    let template = await MessageTemplate.findOne({ where: { name } });
    if (template) {
      template.content = content;
      await template.save();
    } else {
      await MessageTemplate.create({ name, content });
    }
    res.json({ success: true, name });
  } catch (e) {
    res.status(500).json({ success: false, error: 'DB保存エラー', detail: e.message });
  }
});

// テンプレート送信
router.post('/sendTemplate', async (req, res) => {
  const { channelId, templateName } = req.body;
  if (!client) return res.status(500).json({ success: false, error: 'Bot未初期化' });
  try {
    // テンプレート取得
    const template = await MessageTemplate.findOne({ where: { name: templateName } });
    if (!template) return res.status(404).json({ success: false, error: 'テンプレートが見つかりません' });
    // チャンネル取得
    const channel = await client.channels.fetch(channelId);
    if (!channel || !channel.isTextBased()) return res.status(400).json({ success: false, error: 'チャンネルが見つからないかテキストチャンネルではありません' });
    // メッセージ送信
    await channel.send(template.content);
    res.json({ success: true, channelId, templateName });
  } catch (e) {
    res.status(500).json({ success: false, error: '送信失敗', detail: e.message });
  }
});

// コマンド履歴・エラー取得
router.get('/commandlog', (req, res) => {
  // TODO: command_log.csv を読み取って返す
  res.json({ logs: [] });
});

// Webhook風Bot操作
router.post('/webhook', async (req, res) => {
  // TODO: 外部サービスからの指示をBotで実行
  const { action, data } = req.body;
  res.json({ success: true, action, data });
});

// チャンネル一覧取得
router.get('/channels', async (req, res) => {
  if (!client) return res.status(500).json({ error: 'Bot未初期化' });
  try {
    const channels = [];
    for (const guild of client.guilds.cache.values()) {
      for (const channel of guild.channels.cache.values()) {
        if (channel.isTextBased && channel.isTextBased()) {
          channels.push({
            id: channel.id,
            name: `#${channel.name}`,
            guild: guild.name
          });
        }
      }
    }
    res.json({ channels });
  } catch (e) {
    res.status(500).json({ error: 'チャンネル一覧取得失敗', detail: e.message });
  }
});

module.exports = { router, setup };
