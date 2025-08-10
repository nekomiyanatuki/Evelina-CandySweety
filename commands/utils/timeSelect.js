const { SlashCommandBuilder } = require('discord.js');
const { handleTimeSelection } = require('../../handlers/timeSelector.js');

const data = new SlashCommandBuilder()
  .setName('timeselect')
  .setDescription('招待リンクの有効期限を設定するぞ❤')
  .addStringOption(option =>
    option.setName('mode')
      .setDescription('時間選択モードを選ぶぞ❤')
      .setRequired(true)
      .addChoices(
        { name: 'プリセット時間', value: 'preset' },
        { name: '時間単位', value: 'unit' }
      )
  );

async function execute(interaction) {
  const mode = interaction.options.getString('mode');
  await handleTimeSelection(interaction, mode);
}

module.exports = {
  data,
  execute
}; 