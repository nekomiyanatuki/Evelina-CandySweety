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

const dataDir = path.join(__dirname, '../../data');
const settingsPath = path.join(dataDir, 'welcomeSettings.json');

// データディレクトリが存在しない場合は作成
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(
    dataDir, {
    recursive: true
  });
}

// JSONファイルが存在しない場合は空のオブジェクトで作成
if (!fs.existsSync(settingsPath)) {
  fs.writeFileSync(settingsPath, JSON.stringify({}, null, 2));
}

const data = new SlashCommandBuilder()
  .setName('admin-wl')
  .setDescription('管理者専用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)

  .addSubcommandGroup(group =>
    group
      .setName('setwelcome')
      .setDescription('新規参加者へのウェルカムチャンネルを設定するよ❤')
      .addSubcommand(sub =>
        sub
          .setName('channel')
          .setDescription('ウェルカムメッセージを送るチャンネル')
          .addChannelOption(option =>
            option.setName('channel').setDescription('対象のチャンネル').setRequired(true)
          )
      )
  )

  .addSubcommand(sub =>
    sub
      .setName('setchannel')
      .setDescription('案内ボタン用チャンネルを設定するよ❤')
      .addStringOption(option =>
        option.setName('type')
          .setDescription('対象チャンネルの種類')
          .setRequired(true)
          .addChoices(
            { name: '雑談', value: 'freetalkChannel' },
            { name: '自己紹介', value: 'introChannel' },
            { name: 'ガイドライン', value: 'guidelineChannel' },
            { name: '概要', value: 'overviewChannel' },
            { name: 'ロール案内', value: 'rolesChannel' }
          )
      )
      .addChannelOption(option =>
        option.setName('channel')
          .setDescription('設定するチャンネル')
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName('setverifyrole')
      .setDescription('認証に使うロールを設定するよ❤')
      .addRoleOption(option =>
        option.setName('role')
          .setDescription('付与する認証ロール')
          .setRequired(true)
      )
  )

  .addSubcommand(sub =>
    sub
      .setName('listsettings')
      .setDescription('現在のチャンネル・ロール設定を確認するよ❤')
  )

  .addSubcommand(sub =>
    sub
      .setName('resetsettings')
      .setDescription('設定をリセットするよ❤')
  );

async function checkAdminPermission(member) {
  return member.permissions.has(PermissionFlagsBits.Administrator);
}

async function execute(interaction) {
  try {
    if (!await checkAdminPermission(interaction.member)) {
      return interaction.reply({
        content: 'このコマンドは管理者だけ使えるよ❤',
        flags: MessageFlags.Ephemeral
      });
    }

    const guildId = interaction.guild.id;
    let settings = fs.existsSync(settingsPath)
      ? JSON.parse(fs.readFileSync(settingsPath, 'utf8'))
      : {};
    settings[guildId] = settings[guildId] || {};

    // setwelcome
    if (interaction.options.getSubcommandGroup?.() === 'setwelcome' &&
        interaction.options.getSubcommand() === 'channel') {
      const channel = interaction.options.getChannel('channel');
      settings[guildId].welcomeChannel = channel.id;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return interaction.reply(`✅ ウェルカムチャンネルを <#${channel.id}> に設定したよ❤`);
    }

    // setchannel
    if (interaction.options.getSubcommand() === 'setchannel') {
      const type = interaction.options.getString('type');
      const channel = interaction.options.getChannel('channel');
      settings[guildId][type] = channel.id;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return interaction.reply(`✅ ${type} を <#${channel.id}> に設定したよ❤`);
    }

    // setverifyrole
    if (interaction.options.getSubcommand() === 'setverifyrole') {
      const role = interaction.options.getRole('role');
      settings[guildId].verifyRoleId = role.id;
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return interaction.reply(`✅ 認証ロールを <@&${role.id}> に設定したよ❤`);
    }

    // listsettings
    if (interaction.options.getSubcommand() === 'listsettings') {
      const config = settings[guildId];
      if (!config) {
        return interaction.reply({
          content: 'まだ何も設定されていないみたい…',
          flags: MessageFlags.Ephemeral
        });
      }

      let output = `📋 **現在の設定一覧**\n`;
      if (config.freetalkChannel) output += `• 雑談チャンネル: <#${config.freetalkChannel}>\n`;
      if (config.welcomeChannel) output += `• Welcomeチャンネル: <#${config.welcomeChannel}>\n`;
      if (config.introChannel) output += `• 自己紹介チャンネル: <#${config.introChannel}>\n`;
      if (config.guidelineChannel) output += `• ガイドラインチャンネル: <#${config.guidelineChannel}>\n`;
      if (config.overviewChannel) output += `• 概要チャンネル: <#${config.overviewChannel}>\n`;
      if (config.rolesChannel) output += `• ロール案内チャンネル: <#${config.rolesChannel}>\n`;
      if (config.verifyRoleId) output += `• 認証ロール: <@&${config.verifyRoleId}>\n`;

      return interaction.reply({
        content: output,
        flags: MessageFlags.Ephemeral
      });
    }

    // resetsettings
    if (interaction.options.getSubcommand() === 'resetsettings') {
      delete settings[guildId];
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      return interaction.reply('✅ 設定をリセットしたよ❤');
    }

    return interaction.reply({
      content: '不明なサブコマンドだよ💢',
      flags: MessageFlags.Ephemeral
    });

  } catch (error) {
    console.error('❌ admin-wlコマンドでエラー:', error);
    return interaction.reply({
      content: error.message || 'エラーが発生したよ❤',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute
};
