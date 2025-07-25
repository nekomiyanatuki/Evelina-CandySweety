const { SlashCommandBuilder } = require('discord.js');

const data = new SlashCommandBuilder()
  .setName('dice')
  .setDescription('調査官！さいころを振るよ～❤（結果が2000文字を超えるとエラーになるぞ❤）')
  .addStringOption(option =>
    option
      .setName('ndn')
      .setDescription('「3d6」形式でダイスロールを指定してね')
      .setRequired(true)
  );

async function execute(interaction) {
  const input = interaction.options.getString('ndn');
  if (!input.match(/^\d+d\d+$/)) {
    await interaction.reply('あれれ～？調査官、どこか間違ってるみたいだぞッ❤');
    return;  
  }

  await interaction.reply(ndnDice(input));
}

function ndnDice(ndn) {
  const ndnArr = ndn.split('d');
  const number = ndnArr[0];
  const sides = ndnArr[1];
  
  const result = [];
  let sum = 0;

  for (let i = 0; i < number; i++) {
    const dice = Math.floor(Math.random() * sides) + 1;
    sum += dice;
    result.push(dice);
  }

  return `${number}d${sides} >> ${result}\n合計:${sum}`;
}

module.exports = {
  data,
  execute
}; 