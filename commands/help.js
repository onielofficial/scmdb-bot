const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Show all available SCMDB commands'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('📖 SCMDB Bot — Command List')
      .setColor(0x5865F2)
      .addFields(
        {
          name: '🔍 /blueprint <name>',
          value: 'Search for a blueprint by name\nShows missions, faction, reward, drop rate',
        },
        {
          name: '⚒ /craft <name> [quality]',
          value: 'Search for a craftable item\nShows materials, stats, damage resistance, temperature\n`quality` = 0-1000 (default 500)',
        },
        {
          name: '🪨 /resource <name>',
          value: 'Search for a resource/material\nShows locations and systems',
        },
        {
          name: '📋 /quest <name>',
          value: 'Search for a mission/contract\nShows faction, reward, type',
        },
        {
          name: '❓ /help',
          value: 'Show this command list',
        }
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
