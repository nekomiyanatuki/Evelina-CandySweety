const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('uranai')
    .setDescription('調査官のラッキーカラーを占うぞッ❤'),

  async execute(interaction) {
    const arr = ["赤色", "青色", "緑色", "白色", "黒色"];
    const random = Math.floor( Math.random() * arr.length);
    const color = arr[random];

	await interaction.reply(`キミのラッキーカラーは${color}だったぞ～❤`);
  }
}; 