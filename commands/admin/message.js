const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const { PermissionManager } = require('../../models/permissionManager.js');
const { google } = require('googleapis');
const credentials = require('../../config/catfantasynekomiyacity-57e83fdb90d3.json');

const data = new SlashCommandBuilder()
  .setName('admin-ms')
  .setDescription('管理者専用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
      .setName('message')
      .setDescription('メッセージ管理')
      .addSubcommand(subcommand =>
        subcommand
          .setName('announce')
          .setDescription('アナウンスメッセージを送信するぞ～❤')
          .addStringOption(option =>
            option
              .setName('message')
              .setDescription('アナウンス内容([file:ファイル名]または[template:ファイル名]でもOK)')
              .setRequired(true)
          )
          .addStringOption(option =>
            option
              .setName('image')
              .setDescription('添付する画像ファイル名(例:event2025.png)')
              .setRequired(false)
          )
          .addChannelOption(option =>
            option
              .setName('channel')
              .setDescription('送信先チャンネル（未指定の場合は現在のチャンネル）')
              .setRequired(false)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('manage')
          .setDescription('メッセージ管理を行うぞ❤')
          .addStringOption(option =>
            option
              .setName('action')
              .setDescription('実行するアクション')
              .setRequired(true)
              .addChoices(
                { name: 'メッセージ固定', value: 'pin' },
                { name: 'メッセージ固定解除', value: 'unpin' },
                { name: 'ユーザーメッセージ削除', value: 'delete_user' }
              )
          )
          .addStringOption(option =>
            option
              .setName('message_id')
              .setDescription('メッセージID（固定・固定解除時）')
              .setRequired(false)
          )
          .addUserOption(option =>
            option
              .setName('user')
              .setDescription('対象ユーザー（メッセージ削除時）')
              .setRequired(false)
          )
          .addIntegerOption(option =>
            option
              .setName('count')
              .setDescription('削除する件数（ユーザーメッセージ削除時）')
              .setRequired(false)
              .setMinValue(1)
              .setMaxValue(100)
          )
      )
      .addSubcommand(subcommand =>
        subcommand
          .setName('list_templates')
          .setDescription('利用可能なテンプレート一覧を表示するよ❤')
      )
  )
  .addSubcommandGroup(group =>
    group
      .setName('log')
      .setDescription('コマンド使用ログ')
      .addSubcommand(subcommand =>
        subcommand
          .setName('fetch')
          .setDescription('スプレッドシートからログを取得するよ❤')
          .addStringOption(option =>
            option.setName('start').setDescription('開始日時（例：6月19日12時）').setRequired(true))
          .addStringOption(option =>
            option.setName('end').setDescription('終了日時（例：6月19日13時）').setRequired(true))
          .addIntegerOption(option =>
            option.setName('count').setDescription('取得件数（1～100）').setRequired(false))
          .addStringOption(option =>
            option.setName('command').setDescription('コマンド名で絞り込み').setRequired(false))
      )
  );

async function checkAdminPermission(member) {
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }
  const permission = await PermissionManager.findByPk(member.id);
  return !!permission;
}

const PAGE_SIZE = 5;

async function sendTemplateList(interaction, page = 0) {
  const templatesPath = path.join(__dirname, `../../data/post/`);
  if (!fs.existsSync(templatesPath)) {
    await interaction.reply({
      content: 'テンプレートフォルダが見つからないよ❤',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const files = fs.readdirSync(templatesPath)
    .filter(file => file.endsWith('.txt'))
    .map(file => path.basename(file, '.txt'))
    .sort();

  if (files.length === 0) {
    await interaction.reply({
      content: 'テンプレートが1つもないよ❤',
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  const totalPages = Math.ceil(files.length / PAGE_SIZE);
  const currentPageFiles = files.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  let list = '';
  for (const filename of currentPageFiles) {
    const fullPath = path.join(templatesPath, `${filename}.txt`);
    const content = fs.readFileSync(fullPath, 'utf-8').trim().split('\n')[0];
    const preview = content.length > 30 ? content.slice(0, 30) + '…' : content;
    list += `• \`${filename}\` → 「${preview}」\n`;
  }

  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`template_prev_${page}`).setLabel('⬅ 戻る').setStyle(ButtonStyle.Secondary).setDisabled(page === 0),
    new ButtonBuilder().setCustomId(`template_next_${page}`).setLabel('➡ 次へ').setStyle(ButtonStyle.Secondary).setDisabled(page >= totalPages - 1)
  );

  const messageContent = `📂 利用可能なテンプレート（${page + 1}/${totalPages}ページ）だよ❤\n\n${list}`;

  if (interaction.deferred || interaction.replied) {
    await interaction.editReply({
      content: messageContent,
      components: [buttons]
    });
  } else {
    await interaction.reply({
      content: messageContent,
      components: [buttons],
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute: async function (interaction) {
    try {
      if (!await checkAdminPermission(interaction.member)) {
        await interaction.reply({
          content: 'このコマンドは管理者または権限が付与されたユーザーのみ使用できるよ❤',
          flags: MessageFlags.Ephemeral
        });
        return;
      }

      const group = interaction.options.getSubcommandGroup();
      const subcommand = interaction.options.getSubcommand();

      if (group === 'message') {
        if (subcommand === 'announce') {
          await interaction.deferReply({ ephemeral: true });

          const messageContent = interaction.options.getString('message');
          const imageName = interaction.options.getString('image');
          const targetChannel = interaction.options.getChannel('channel') || interaction.channel;

          let contentToSend = messageContent;

          const match = messageContent.match(/\[(file|template):(.*?)\]/);
          if (match) {
            const filename = match[2];
            const filePath = path.join(__dirname, `../../data/post/${filename}.txt`);
            if (!fs.existsSync(filePath)) {
              return await interaction.editReply({ content: `指定されたファイルが見つからなかったよ❤ (${filename})` });
            }
            contentToSend = fs.readFileSync(filePath, 'utf-8');
          }

          const MAX_EMBED_LENGTH = 4096;
          const MAX_EMBED_COUNT = 10;
          const embedTexts = [];

          for (let i = 0; i < contentToSend.length && embedTexts.length < MAX_EMBED_COUNT; i += MAX_EMBED_LENGTH) {
            embedTexts.push(contentToSend.slice(i, i + MAX_EMBED_LENGTH));
          }

          const embeds = embedTexts.map(text =>
            new EmbedBuilder().setDescription(text).setColor(0xff69b4)
          );

          const options = { embeds };

          if (imageName) {
            const imagePath = path.join(__dirname, `../../assets/announce-img/${imageName}`);
            if (!fs.existsSync(imagePath)) {
              return await interaction.editReply({ content: `画像ファイルが見つからなかったよ❤ (${imageName})` });
            }

            embeds[0].setImage(`attachment://${imageName}`);
            options.files = [{ attachment: imagePath, name: imageName }];
          }

          const sent = await targetChannel.send(options);
          await interaction.editReply({ content: `✅ メッセージを送信したよ❤ → [メッセージリンク](${sent.url})` });
        }

        if (subcommand === 'manage') {
          // 省略: manage処理
        }

        if (subcommand === 'list_templates') {
          await sendTemplateList(interaction, 0);
        }
      } else if (group === 'log' && subcommand === 'fetch') {
        const auth = new google.auth.GoogleAuth({
          credentials,
          scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
        });
        const client = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: client });

        const spreadsheetId = '1Ezv_Kp22BVSNoH-8tjQw-sHvSi4i4LxBLs4PKLcv2N8';
        const range = 'Bot Logs!A2:G';

        const res = await sheets.spreadsheets.values.get({
          spreadsheetId,
          range
        });
        const rows = res.data.values || [];

        const start = interaction.options.getString('start');
        const end = interaction.options.getString('end');
        const count = interaction.options.getInteger('count') || 10;
        const commandFilter = interaction.options.getString('command');

        const filtered = rows.filter(row => {
          const [datetime, username, userId, channel, command, detail] = row;
          return (!commandFilter || command === commandFilter) && datetime.includes(start) && datetime.includes(end);
        }).slice(0, count);

        if (filtered.length === 0) {
          await interaction.reply({
            content: '条件に一致するログが見つからなかったよ❤',
            flags: MessageFlags.Ephemeral
          });
          return;
        }

        let logMessage = '📝 ログ結果だよ❤\n```\n';
        for (const row of filtered) {
          logMessage += row.join(' | ') + '\n';
        }
        logMessage += '```';

        await interaction.reply({
          content: logMessage,
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (error) {
      console.error('admin-ms コマンドエラー:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content: error.message || 'エラーが発生したよ❤',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: error.message || 'エラーが発生したよ❤',
          flags: MessageFlags.Ephemeral
        });
      }
    }
  },
  sendTemplateList
};
