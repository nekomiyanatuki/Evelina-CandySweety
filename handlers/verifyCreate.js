const fs = require('fs');
const path = require('path');
const { MessageFlags } = require('discord.js');

const settingsPath = path.join(__dirname, '../data/welcomeSettings.json');

module.exports = async (interaction) => {
  try {
    // ✅ ボタン押下イベント以外は無視
    if (!interaction.isButton()) return;

    if (interaction.customId !== 'verify') return;

    const guildId = interaction.guild.id;
    const member = interaction.member;

    // 設定ファイルの存在確認
    if (!fs.existsSync(settingsPath)) {
      return interaction.reply({
        content: '❌ 設定ファイルが見つかりません。',
        flags: MessageFlags.Ephemeral
      });
    }

    let settings;
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    } catch (err) {
      console.error('❌ JSON読み込みエラー:', err);
      return interaction.reply({
        content: '❌ 設定ファイルの読み込みに失敗しました。',
        flags: MessageFlags.Ephemeral
      });
    }

    const guildSettings = settings[guildId];
    if (!guildSettings?.verifyRoleId) {
      return interaction.reply({
        content: '❌ 認証ロールがまだ設定されていません。',
        flags: MessageFlags.Ephemeral
      });
    }

    const roleId = guildSettings.verifyRoleId;
    const role = interaction.guild.roles.cache.get(roleId);
    if (!role) {
      return interaction.reply({
        content: '❌ 指定されたロールが存在しません。',
        flags: MessageFlags.Ephemeral
      });
    }

    // 既にロールがあるかチェック
    if (member.roles.cache.has(roleId)) {
      return interaction.reply({
        content: `✅ すでに <@&${roleId}> が付与されています。`,
        flags: MessageFlags.Ephemeral
      });
    }

    // Botがそのロールを付与できるか確認
    const botMember = await interaction.guild.members.fetchMe();
    if (role.position >= botMember.roles.highest.position) {
      return interaction.reply({
        content: '❌ このロールを付与する権限がBotにありません。',
        flags: MessageFlags.Ephemeral
      });
    }

    // ロール付与
    await member.roles.add(roleId);
    await interaction.reply({
      content: `✅ 認証完了！ロール <@&${roleId}> を付与しました。`,
      flags: MessageFlags.Ephemeral
    });

    console.log(`✅ ${member.user.tag} にロール ${role.name} を付与`);
  } catch (error) {
    console.error('❌ verifyボタン処理中にエラー:', error);
    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({
          content: 'エラーが発生しました。',
          flags: MessageFlags.Ephemeral
        });
      } else {
        await interaction.reply({
          content: 'エラーが発生しました。',
          flags: MessageFlags.Ephemeral
        });
      }
    } catch (err) {
      console.error('❌ フォローアップ失敗:', err);
    }
  }
};
