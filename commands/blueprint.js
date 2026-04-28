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
            .setColor(0x2B2D31)
            .setDescription(`> 🔍  ไม่พบ Blueprint สำหรับ \`${name}\``)
        ],
      });
    }

    const shown = results.slice(0, 5);
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🔍  Blueprint — \`${name}\``)
      .setDescription(
        `พบ **${results.length}** mission${results.length !== 1 ? 's' : ''} ที่ drop blueprint นี้` +
        (results.length > 5 ? '  ·  *แสดงแค่ 5 รายการ*' : '')
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    for (const m of shown) {
      const legal = m.illegal ? '🔴 Illegal' : '🟢 Legal';
      const bpNames = m.blueprints.slice(0, 4).map(b => `\`${b}\``).join('\n');
      const overflow = m.blueprints.length > 4 ? `\n*…+${m.blueprints.length - 4} more*` : '';

      embed.addFields({
        name: `📌  ${m.title}`,
        value: [
          `\`${m.missionType}\`  ·  ${legal}`,
          `🏴  **${m.faction}**   🌌  **${m.system || '—'}**`,
          `💰  **${(m.rewardUec ?? 0).toLocaleString()} aUEC**`,
          `\n📋\n${bpNames}${overflow}`,
        ].join('\n'),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
