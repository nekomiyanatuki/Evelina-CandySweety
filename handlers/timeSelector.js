const { MessageFlags, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

// 時間表の定義
const timeTable = {
  // 30分毎の時間表
  preset: {
    "30分": 1800,
    "1時間": 3600,
    "1時間30分": 5400,
    "2時間": 7200,
    "2時間30分": 9000,
    "3時間": 10800,
    "3時間30分": 12600,
    "4時間": 14400,
    "4時間30分": 16200,
    "5時間": 18000,
    "5時間30分": 19800,
    "6時間": 21600,
    "6時間30分": 23400,
    "7時間": 25200,
    "7時間30分": 27000,
    "8時間": 28800,
    "8時間30分": 30600,
    "9時間": 32400,
    "9時間30分": 34200,
    "10時間": 36000,
    "10時間30分": 37800,
    "11時間": 39600,
    "11時間30分": 41400,
    "12時間": 43200,
  },
  // 時間単位換算表
  units: {
    "Second(秒)": 1,
    "Minute(分)": 60,
    "Hour(時間)": 3600,
    "Day(日)": 86400,
    "Week(週)": 604800,
    "Month(月)": 2592000,
    "Year(年)": 31536000
  }
};

// プリセットモード用のボタン生成
function createPresetButtons() {
  const rows = [];
  const timeEntries = Object.entries(timeTable.preset);
  
  for (let i = 0; i < timeEntries.length; i += 4) {
    const row = new ActionRowBuilder();
    for (let j = 0; j < 4 && i + j < timeEntries.length; j++) {
      const [label, value] = timeEntries[i + j];
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`time_${value}`)
          .setLabel(label)
          .setStyle(ButtonStyle.Primary)
      );
    }
    rows.push(row);
  }
  return rows;
}

// 時間単位モード用のボタン生成
function createUnitButtons() {
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('unit_prev')
        .setLabel('-')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('unit_next')
        .setLabel('+')
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId('unit_confirm')
        .setLabel('決定')
        .setStyle(ButtonStyle.Success)
    );
  return [row];
}

// 時間選択用のEmbed生成
function createTimeSelectorEmbed(mode = 'preset', currentUnit = 'Hour(時間)', currentValue = 1) {
  const embed = new EmbedBuilder()
    .setColor(0x0099FF)
    .setTitle('時間設定')
    .setDescription('希望の時間を選択してください');

  if (mode === 'preset') {
    embed.addFields(
      { name: 'モード', value: 'プリセット時間選択' },
      { name: '説明', value: 'ボタンから希望の時間を選択してください' }
    );
  } else {
    embed.addFields(
      { name: 'モード', value: '時間単位選択' },
      { name: '現在の設定', value: `${currentValue} ${currentUnit}` },
      { name: '説明', value: '←→ボタンで時間単位を変更、決定ボタンで確定' }
    );
  }

  return embed;
}

// 時間選択のハンドラー
async function handleTimeSelection(interaction, mode = 'preset') {
  const embed = createTimeSelectorEmbed(mode);
  const components = mode === 'preset' ? createPresetButtons() : createUnitButtons();

  const message = await interaction.reply({
    embeds: [embed],
    components: components,
    flags: MessageFlags.Ephemeral
  });

  return message;
}

module.exports = {
  timeTable,
  createTimeSelectorEmbed,
  handleTimeSelection,
  createPresetButtons,
  createUnitButtons
}; 