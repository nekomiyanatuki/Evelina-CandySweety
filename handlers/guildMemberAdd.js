const fs = require('fs');
const path = require('path');
const {
  AttachmentBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const { generateWelcomeImage } = require('../utils/imageBuilder');

const settingsPath = path.join(__dirname, '../data/welcomeSettings.json');

module.exports = async (member) => {
  try {
    if (!fs.existsSync(settingsPath)) return;

    const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    const guildSettings = settings[member.guild.id];
    if (!guildSettings || !guildSettings.welcomeChannel) return;

    const channel = member.guild.channels.cache.get(guildSettings.welcomeChannel);
    if (!channel || !channel.isTextBased()) return;

    const imageBuffer = await generateWelcomeImage(
      member.displayName,
      member.user.displayAvatarURL({
        format: 'png'
      })
    );
    const attachment = new AttachmentBuilder(imageBuffer, {
      name: 'welcome.png'
    });

    // ボタン生成（各種チャンネルが設定されているかを確認）
    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('verify')
        .setLabel('✅ 認証する')
        .setStyle(ButtonStyle.Success),
      ...(guildSettings.introChannel
        ? [new ButtonBuilder()
            .setLabel('📝 自己紹介')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${member.guild.id}/${guildSettings.introChannel}`)]
        : []),
      ...(guildSettings.guidelineChannel
        ? [new ButtonBuilder()
            .setLabel('📖 ガイドライン')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${member.guild.id}/${guildSettings.guidelineChannel}`)]
        : []),
      ...(guildSettings.overviewChannel
        ? [new ButtonBuilder()
            .setLabel('📋 概要')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${member.guild.id}/${guildSettings.overviewChannel}`)]
        : []),
      ...(guildSettings.rolesChannel
        ? [new ButtonBuilder()
            .setLabel('🧩 ロール概要')
            .setStyle(ButtonStyle.Link)
            .setURL(`https://discord.com/channels/${member.guild.id}/${guildSettings.rolesChannel}`)]
        : [])
    );

    await channel.send({
      content: `
███████████████████████████████████████
o ⋏ o ┋ <@!${member.id}> :
🎉 **${member.guild.name} へようこそ！** 🎉

➔ このサーバーへ来たらまずは<#${guildSettings.introChannel || '未設定'}>でピン二つに沿って自己紹介を書いてね！
➔ この町は自由な街だよ！<#${guildSettings.guidelineChannel || '未設定'}>にだけ従ってね！
(他者を不快にする等の迷惑を掛ける行為をしなければ大抵は寛容です。)
➔ 不明な点などの相談は <#1290422447853666394> や <#1290427190327902331> で聞いてね！
███████████████████████████████████████
`.trim(),
      files: [attachment],
      components: [buttons]
    });

    console.log(`✅ Welcomeメッセージを ${member.user.tag} に送信しました`);
  } catch (error) {
    console.error(`❌ Welcomeメッセージ送信に失敗 for ${member.user?.tag || member.id}:`, error);
  }
};
