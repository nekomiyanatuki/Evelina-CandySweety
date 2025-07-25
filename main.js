require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, Collection, GatewayIntentBits, ActivityType } = require('discord.js');
const bodyParser = require('body-parser');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { loadMarkdown, getTemplateList } = require('./utils/markdownCache.js');
const sequelize = require('./config/database.js');

// Discord Bot 初期化
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
});
client.commands = new Collection();

// DB同期
sequelize.sync({ alter: true }).then(() => {
  console.log('✅ データベースの同期が完了しました');
}).catch(error => {
  console.error('❌ データベースの同期に失敗しました:', error);
});

// main.js の一部（Express app 初期化済み想定）
const app = express();
const port = process.env.MCP_PORT;
let lastHeartbeat = new Date();

app.use(bodyParser.json());
app.use(cors());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    }
  }
}));
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'data')));
app.use(express.static(path.join(__dirname, 'templates')));

// Bot稼働監視ログ
setInterval(() => {
  const now = new Date();
  const timeDiff = now - lastHeartbeat;
  if (timeDiff > 1800000) {
    console.log(`⚠️ 警告: Bot信号の受信がない ${Math.floor(timeDiff / 60000)} 分`);
  }
  if (client.isReady()) {
    console.log(`💚 正常: Bot稼働中 - Guilds: ${client.guilds.cache.size}, Uptime: ${Math.floor(client.uptime / 60000)}分`);
  }
}, 60000);

// トップAPI
app.get('/', (req, res) => {
  res.json({
    message: 'EvelinaBotは稼働中',
    status: client.isReady() ? 'Online' : 'Offline',
    guilds: client.guilds.cache.size,
    uptime: client.uptime,
    last_heartbeat: lastHeartbeat,
    endpoints: {
      status: '/',
      markdown0: '/Info',
      markdown1: '/README',
      markdown2: '/Credit',
      markdown3: '/policy',
      markdown4: '/simple_policy',
      markdown5: '/LICENSE',
      templates: '/Info/templates'
    }
  });
});

// 共通Markdown表示関数
function renderMarkdownPage(templateName, res) {
  const filepath = path.join(__dirname, 'data/templates', templateName);
  if (!fs.existsSync(filepath)) {
    return res.status(404).send('指定されたテンプレートが見つかりません。');
  }

  try {
    const { html, lastUpdated } = loadMarkdown(templateName);
    const htmlTemplate = fs.readFileSync(path.join(__dirname, 'views/Info.html'), 'utf8');
    const rendered = htmlTemplate
      .replace('{{content}}', html)
      .replace('{{lastUpdated}}', lastUpdated.toLocaleString('ja-JP'));

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(rendered);
  } catch (err) {
    console.error('❌ テンプレート読み込み失敗:', err);
    res.status(500).send('テンプレートの読み込み中にエラーが発生しました');
  }
}

// /info 用 (query指定型)
app.get('/info', (req, res) => {
  const template = req.query.template || 'Info.md';
  renderMarkdownPage(template, res);
});
// /readme 用 (query指定型)
app.get('/readme', (req, res) => {
  const template = req.query.template || 'README.md';
  renderMarkdownPage(template, res);
});
// /credit 用 (query指定型)
app.get('/credit', (req, res) => {
  const template = req.query.template || 'Credit.md';
  renderMarkdownPage(template, res);
});
// /policy 用 (query指定型)
app.get('/policy', (req, res) => {
  const template = req.query.template || 'policy.md';
  renderMarkdownPage(template, res);
});
// /simple_policy 用 (query指定型)
app.get('/simple_policy', (req, res) => {
  const template = req.query.template || 'simple_policy.md';
  renderMarkdownPage(template, res);
});
// /license 用 (query指定型)
app.get('/license', (req, res) => {
  const template = req.query.template || 'LICENSE.md';
  renderMarkdownPage(template, res);
});

// /Info, /README, /Credit, /LICENSE, /policy, /simple_policy 用 (URLルート型)
const routeMap = {
  '/Info': 'Info.md',
  '/README': 'README.md',
  '/Credit': 'Credit.md',
  '/LICENSE': 'LICENSE.md',
  '/policy': 'policy.md',
  '/simple_policy': 'simple_policy.md'
};

for (const route in routeMap) {
  app.get(route, (req, res) => renderMarkdownPage(routeMap[route], res));
}

// 📑 テンプレート一覧API
app.get('/Info/templates', (req, res) => {
  res.json(getTemplateList());
});

// ...既存のBot設定・起動処理...
const { router: mcpRouter, setup: setupMCP } = require('./modules/mcp-server/discordmcp/router');
const { authMiddleware } = require('./modules/mcp-server/discordmcp/auth'); // 追加

// MCP UI 静的ページ公開
app.use('/mcp/ui', express.static(path.join(__dirname, 'modules/mcp-server/discordmcp/public')));

// DiscordクライアントをMCPルーターに渡す
setupMCP(client);

// 認証付きAPI
app.use('/mcp', authMiddleware, mcpRouter);

// Botコマンド読み込み
const commandBasePath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(commandBasePath);
for (const folder of commandFolders) {
  const commandsPath = path.join(commandBasePath, folder);
  const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    client.commands.set(command.data.name, command);
  }
}

// イベント登録
client.on("interactionCreate", async (interaction) => {
  try {
    const handler = require('./handlers/interactionCreate.js');
    await handler(interaction);
  } catch (err) {
    console.error("❌ interactionCreate ハンドラー失敗:", err);
  }
});
client.on("voiceStateUpdate", async (oldState, newState) => {
  try {
    const handler = require('./handlers/voiceStateUpdate.js');
    await handler(oldState, newState);
  } catch (err) {
    console.error("❌ voiceStateUpdate ハンドラー失敗:", err);
  }
});
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  try {
    const handler = require('./handlers/messageCreate.js');
    await handler(message);
  } catch (err) {
    console.error("❌ messageCreate ハンドラー失敗:", err);
  }
});
client.on("guildMemberAdd", async (member) => {
  try {
    const handleWelcome = require('./handlers/guildMemberAdd.js');
    await handleWelcome(member);
  } catch (error) {
    console.error(`❌ guildMemberAdd ハンドラー実行中にエラー:`, error);
  }
});

client.once('ready', () => {
  console.log(`💚 ${client.user.tag} としてログインしたよ❤`);
  try {
    client.user.setPresence({
      activities: [{ name: "CatFantasy", type: ActivityType.Playing }],
      status: "online",
      afk: false,
    });
    console.log("✅ Presence設定が完了しました");
  } catch (err) {
    console.error("❌ Presence設定に失敗しました:", err);
  }
});

// 起動
client.login(process.env.DISCORD_TOKEN);
app.listen(port, () => {
  console.log(`🌐 MCP + Webサーバー + Botサーバー がポート http://localhost:${port} で起動中`);
});
