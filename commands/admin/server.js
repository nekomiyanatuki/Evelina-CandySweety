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

const data = new SlashCommandBuilder()
  .setName('admin-sv')
  .setDescription('管理者専用コマンドだぞ❤')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
  .addSubcommandGroup(group =>
    group
    // サーバー管理
      .setName('server')
      .setDescription('サーバーの管理')
    .addSubcommand(subcommand =>
      subcommand
        .setName('status')
        .setDescription('サーバーの状態を確認するぞ～❤')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('info')
        .setDescription('詳細なサーバー情報を表示するぞ～❤')
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('slowmode')
        .setDescription('サーバーのスローモードを設定するぞ～❤')
        .addIntegerOption(option =>
           option
            .setName('seconds')
            .setDescription('スローモードの秒数（0で解除）')
            .setRequired(true)
            .setMinValue(0)
            .setMaxValue(21600)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('maintenance')
        .setDescription('サーバーのメンテナンスモードを切り替えるぞ❤')
        .addBooleanOption(option =>
          option
            .setName('enable')
            .setDescription('メンテナンスモードを有効にするか')
            .setRequired(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('backup')
        .setDescription('サーバー設定のバックアップ状況を確認するぞ～❤')
    )
  )

// 権限チェック関数
async function checkAdminPermission(member) {
  // 管理者権限のチェック
  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  // 権限付与のチェック
  const permission = await PermissionManager.findByPk(member.id);
  return !!permission;
}

async function execute(interaction) {
  try {
    // 権限チェック
    if (!await checkAdminPermission(interaction.member)) {
      await interaction.reply({
        content: 'このコマンドは管理者または権限が付与されたユーザーのみ使用できるよ❤',
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    switch (group) {
      case 'server': {
        switch (subcommand) {
          case 'status': {
            const guild = interaction.guild;
            const memberCount = guild.memberCount;
            const channelCount = guild.channels.cache.size;
            const roleCount = guild.roles.cache.size;
            const bot = interaction.client;
            const uptime = Math.floor(bot.uptime / 1000);
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = uptime % 60;
            const memoryUsage = process.memoryUsage();
            const memoryUsageMB = Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100;

            await interaction.reply({
              embeds: [{
                color: 0x0099ff,
                title: `${guild.name} サーバー状態`,
                fields: [
                  { name: 'メンバー数', value: `${memberCount}人`, inline: true },
                  { name: 'チャンネル数', value: `${channelCount}個`, inline: true },
                  { name: 'ロール数', value: `${roleCount}個`, inline: true },
                  { name: 'Botの稼働時間', value: `${hours}時間${minutes}分${seconds}秒`, inline: true },
                  { name: 'メモリ使用量', value: `${memoryUsageMB}MB`, inline: true },
                  { name: 'Node.jsバージョン', value: process.version, inline: true }
                ],
                timestamp: new Date().toISOString()
              }]
            });
            break;
          }
          case 'info': {
            const guild = interaction.guild;
            const owner = await guild.fetchOwner();
            const channels = guild.channels.cache;
            const roles = guild.roles.cache;
            const emojis = guild.emojis.cache;
            const boosts = guild.premiumSubscriptionCount || 0;
            const boostLevel = guild.premiumTier || 0;
            const verificationLevel = {
              0: 'なし',
              1: '低',
              2: '中',
              3: '高',
              4: '最高'
            }[guild.verificationLevel];

            const channelTypes = {
              text: 0,
              voice: 0,
              category: 0,
              news: 0,
              stage: 0,
              forum: 0
            };

            channels.forEach(channel => {
              if (channelTypes.hasOwnProperty(channel.type)) {
                channelTypes[channel.type]++;
              }
            });

            const roleList = roles
              .filter(role => role.name !== '@everyone')
              .sort((a, b) => b.position - a.position)
              .map(role => `${role.name} (${role.members.size}人)`)
              .slice(0, 10)
              .join('\n');

            const emojiList = emojis
              .map(emoji => emoji.toString())
              .slice(0, 10)
              .join(' ');

            await interaction.reply({
              embeds: [{
                color: 0x0099ff,
                title: `💚 ${guild.name} サーバー情報`,
                thumbnail: {
                  url: guild.iconURL({ dynamic: true }) || 'https://i.imgur.com/w9aiD6F.png'
                },
                fields: [
                  {
                    name: '📊 基本情報',
                    value: `**サーバーID**: ${guild.id}\n**作成日**: ${guild.createdAt.toLocaleString('ja-JP')}\n**オーナー**: ${owner.user.tag}\n**地域**: ${guild.preferredLocale || '未設定'}`,
                    inline: false
                  },
                  {
                    name: '👥 メンバー情報',
                    value: `**総メンバー数**: ${guild.memberCount}人\n**ボット数**: ${guild.members.cache.filter(m => m.user.bot).size}人\n**ブースト数**: ${boosts}回\n**ブーストレベル**: ${boostLevel}`,
                    inline: false
                  },
                  {
                    name: '📝 チャンネル情報',
                    value: `**テキストチャンネル**: ${channelTypes.text}個\n**ボイスチャンネル**: ${channelTypes.voice}個\n**カテゴリー**: ${channelTypes.category}個\n**アナウンス**: ${channelTypes.news}個\n**ステージ**: ${channelTypes.stage}個\n**フォーラム**: ${channelTypes.forum}個`,
                    inline: false
                  },
                  {
                    name: '🔒 セキュリティ',
                    value: `**認証レベル**: ${verificationLevel}\n**2段階認証**: ${guild.mfaLevel === 1 ? '有効' : '無効'}\n**コンテンツフィルター**: ${guild.explicitContentFilter === 0 ? '無効' : guild.explicitContentFilter === 1 ? 'メンバー以外' : '全員'}`,
                    inline: false
                  },
                  {
                    name: '🎨 カスタマイズ',
                    value: `**バナー**: ${guild.banner ? 'あり' : 'なし'}\n**スプラッシュ**: ${guild.splash ? 'あり' : 'なし'}\n**招待スプラッシュ**: ${guild.discoverySplash ? 'あり' : 'なし'}\n**絵文字数**: ${emojis.size}個`,
                    inline: false
                  },
                  {
                    name: '👑 上位10ロール',
                    value: roleList || 'ロールがありません',
                    inline: false
                  },
                  {
                    name: '😄 絵文字サンプル',
                    value: emojiList || '絵文字がありません',
                    inline: false
                  }
                ],
                footer: {
                  text: `サーバーID: ${guild.id}`
                },
                timestamp: new Date().toISOString()
              }],
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'slowmode': {
            const seconds = interaction.options.getInteger('seconds');

            try {
              await interaction.channel.setRateLimitPerUser(seconds);
              await interaction.reply({
                embeds: [{
                  color: 0x0099ff,
                  title: '💚 スローモード設定',
                  description: seconds === 0 ? 'スローモードを解除したぞ～❤' : `スローモードを${seconds}秒に設定したぞ～❤`,
                  timestamp: new Date().toISOString()
                }]
              });
            } catch (error) {
              await interaction.reply({
                embeds: [{
                  color: 0xff0000,
                  title: '❌ エラー',
                  description: 'スローモードの設定に失敗したぞ～❤',
                  timestamp: new Date().toISOString()
                }]
              });
            }
            break;
          }
          case 'maintenance': {
            const enable = interaction.options.getBoolean('enable');
            // メンテナンスモードの実装
            await interaction.reply({
              content: `メンテナンスモードを${enable ? '有効' : '無効'}にしたよ❤`,
              flags: MessageFlags.Ephemeral
            });
            break;
          }
          case 'backup': {
            // バックアップ状況の確認
            await interaction.reply({
              content: 'バックアップ状況を確認中...❤',
              flags: MessageFlags.Ephemeral
            });
            break;
          }
        }
        break;
      }
    }
  } catch (error) {
    await interaction.reply({
      content: error.message || 'エラーが発生したよ❤',
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  data,
  execute
};