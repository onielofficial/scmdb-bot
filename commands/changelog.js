const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('changelog')
    .setDescription('ดูการอัปเดตล่าสุดของ SCMDB Bot'),

  async execute(interaction) {
    await interaction.deferReply();

    const filePath = path.join(__dirname, '../CHANGELOG.md');
    let content = '—';
    try {
      content = fs.readFileSync(filePath, 'utf8').trim();
      if (content.length > 4000) content = content.slice(0, 4000) + '\n…';
    } catch {
      content = '❌ ไม่พบไฟล์ CHANGELOG.md';
    }

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('📋 SCMDB Bot — Changelog')
      .setDescription(content)
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
