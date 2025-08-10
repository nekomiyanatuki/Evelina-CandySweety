const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('pingだぞ!'),

  async execute(interaction) {
    const sent = await interaction.reply({ content: 'Pinging...', fetchReply: true });
    const latency = sent.createdTimestamp - interaction.createdTimestamp;
    await interaction.editReply(`Pingだぞ! 🏓\nLatency: ${latency}ms\nAPI Latency: ${Math.round(interaction.client.ws.ping)}ms`);
  }
}; 