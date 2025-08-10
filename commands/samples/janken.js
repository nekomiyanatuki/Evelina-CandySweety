const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");

const data = new SlashCommandBuilder()
  .setName("janken")
  .setDescription("いっしょにじゃんけんで対決するぞ！❤");

async function execute(interaction) {
  const rock = new ButtonBuilder()
    .setCustomId("rock")
    .setEmoji("✊")
    .setLabel("グー")
    .setStyle(ButtonStyle.Primary);

  const scissors = new ButtonBuilder()
    .setCustomId("scissors")
    .setEmoji("✌")
    .setLabel("チョキ")
    .setStyle(ButtonStyle.Primary);

  const paper = new ButtonBuilder()
    .setCustomId("paper")
    .setEmoji("🖐️")
    .setLabel("パー")
    .setStyle(ButtonStyle.Primary);

  const row = new ActionRowBuilder().addComponents(rock, scissors, paper);

  const response = await interaction.reply({
    content: `じゃんけん...`,
    components: [row],
  });

  try {
    const result = ["(あいこだったぞ～❤)", "調査官の勝ちだぞ～❤", "ざっこ～///❤お姉ちゃんの勝ちぃ～///❤"];
    const collectorFilter = (i) => i.user.id === interaction.user.id;

    let confirmation = await response.awaitMessageComponent({
      filter: collectorFilter,
      time: 30000,
    });
    let solve = await janken(confirmation);

    while (solve == 0) {
      await confirmation.followUp({
        content: `あいこで...`,
        components: [row],
      });
      confirmation = await response.awaitMessageComponent({
        filter: collectorFilter,
        time: 30000,
      });
      solve = await janken(confirmation);
    }

    await confirmation.followUp(result[solve]);
    
  } catch (e) {
    await interaction.editReply({
      content: "ぶっぶー！時間切れだよ～❤",
      components: [],
    });
  }
}

async function janken(confirmation) {
  const hands = { rock: "0", scissors: "1", paper: "2" };
  const handEmojis = ["✊", "✌", "🖐️"];

  const botHand = Math.floor(Math.random() * 3);
  const playersHand = hands[confirmation.customId];

  const solve = (botHand - playersHand + 3) % 3;
  // 0 の場合：あいこ
  // 1 の場合：プレイヤーの勝ち
  // 2 の場合：Botの勝ち

  const playersHandButton = new ButtonBuilder()
    .setCustomId("playersHand")
    .setEmoji(confirmation.component.emoji)
    .setLabel(`${confirmation.component.label}を出したぞ❤`)
    .setStyle(ButtonStyle.Secondary)
    .setDisabled(true);

  const confirmedRow = new ActionRowBuilder().addComponents(playersHandButton);

  const text = (confirmation.message.content == "じゃんけん...") ? "じゃんけん...\nぽん！" : "あいこで...\nしょ！";

  await confirmation.update({
    content: `${text}\nあなた: ${handEmojis[playersHand]}\nBot: ${handEmojis[botHand]}`,
    components: [confirmedRow],
  });

  return solve;
}

module.exports = {
  data,
  execute
};