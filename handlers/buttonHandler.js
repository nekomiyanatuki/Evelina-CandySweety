const { MessageFlags } = require('discord.js');
const { timeTable, createTimeSelectorEmbed } = require('./timeSelector.js');

async function handleButtonInteraction(interaction) {
  if (!interaction.isButton()) return;

  // プリセット時間選択の処理
  if (interaction.customId.startsWith('time_')) {
    const seconds = parseInt(interaction.customId.split('_')[1]);
    await interaction.update({
      content: `選択された時間: ${seconds}秒`,
      components: [],
      flags: MessageFlags.Ephemeral
    });
    return;
  }

  // 時間単位選択の処理
  if (interaction.customId.startsWith('unit_')) {
    const action = interaction.customId.split('_')[1];
    const currentEmbed = interaction.message.embeds[0];
    const currentField = currentEmbed.fields.find(f => f.name === '現在の設定');
    const [currentValue, currentUnit] = currentField.value.split(' ');
    
    let newUnit = currentUnit;
    let newValue = parseInt(currentValue);

    if (action === 'prev') {
      const units = Object.keys(timeTable.units);
      const currentIndex = units.indexOf(currentUnit);
      if (currentIndex > 0) {
        newUnit = units[currentIndex - 1];
      }
    } else if (action === 'next') {
      const units = Object.keys(timeTable.units);
      const currentIndex = units.indexOf(currentUnit);
      if (currentIndex < units.length - 1) {
        newUnit = units[currentIndex + 1];
      }
    } else if (action === 'confirm') {
      const seconds = newValue * timeTable.units[currentUnit];
      await interaction.update({
        content: `選択された時間: ${seconds}秒`,
        components: [],
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    const newEmbed = createTimeSelectorEmbed('unit', newUnit, newValue);
    await interaction.update({
      embeds: [newEmbed],
      flags: MessageFlags.Ephemeral
    });
  }
}

module.exports = {
  handleButtonInteraction
}; 