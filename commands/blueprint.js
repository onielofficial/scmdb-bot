const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchBlueprint } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('blueprint')
    .setDescription('ค้นหา Blueprint จาก SCMDB')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ blueprint เช่น Parallax')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name = interaction.options.getString('name');
    let results;
    try {
      results = searchBlueprint(name);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }

    if (!results.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setDescription('🔍  ไม่พบ Blueprint สำหรับ `' + name + '`'),
        ],
      });
    }

    const shown = results.slice(0, 5);

    // Mission name tags — one tag per result, shown as inline code chips
    const missionTags = shown
      .map(m => '`' + m.title.slice(0, 28) + (m.title.length > 28 ? '…' : '') + '`')
      .join('  ');

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔍  Blueprint — ' + name)
      .setDescription(
        'พบ **' + results.length + '** mission' + (results.length !== 1 ? 's' : '') +
        (results.length > 5 ? '  ·  *แสดง 5 รายการ*' : '') +
        '\n\n' + missionTags
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    for (const m of shown) {
      const legalTag  = m.illegal ? '`🔴 Illegal`' : '`🟢 Legal`';
      const rewardStr = (m.rewardUec ?? 0).toLocaleString();

      // 2×2 grid: faction / system (row 1), reward / type (row 2)
      const grid =
        '`🏴 ' + m.faction + '`  `🌌 ' + (m.system || '—') + '`\n' +
        '`💰 ' + rewardStr + ' aUEC`  `⚔️ ' + m.missionType + '`  ' + legalTag;

      // Blueprint bullet list
      const bullets = m.blueprints.length
        ? m.blueprints.slice(0, 6).map(b => '• ' + b).join('\n') +
          (m.blueprints.length > 6 ? '\n*+' + (m.blueprints.length - 6) + ' more*' : '')
        : '—';

      embed.addFields({
        name: '📌  ' + m.title,
        value: grid + '\n\n' + bullets,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
