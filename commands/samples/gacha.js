const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('gacha')
    .setDescription('ガチャを引くぞ～'),

  async execute(interaction) {
    const rarity = Math.random();
    let result;
    
    if (rarity < 0.04) {
      result = 'UR';
    } else if (rarity < 1.10) {
      result = 'SSR';
    } else if (rarity < 2.20) {
      result = 'SR';
    } else if (rarity < 6.80) {
      result = 'R';
    } else if (rarity < 23.00) {
      result = 'N';
    } else { // 74.80%
      result = 'NC';
    }
    
    const emojis = {
      UR: '⭐6',
      SSR: '⭐5',
      SR: '⭐4',
      R: '⭐3',
      N: '⭐2',
      NC: '⭐1'
    };
    
    await interaction.reply(`${emojis[result]} 結果: ${result} ${emojis[result]}が出たぞ！❤`);
  }
}; 