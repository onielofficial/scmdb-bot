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
      return interaction.editReply(`ไม่พบ Blueprint สำหรับ **${name}**`);
    }
    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`🔍 Blueprint — "${name}"`)
      .setDescription(`พบ **${results.length} missions** ที่ให้ Blueprint นี้`)
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' })
      .setTimestamp();
    for (const m of results.slice(0, 5)) {
      embed.addFields({
        name: m.title,
        value: [
          `Faction: **${m.faction || '?'}**`,
          `System: **${m.system || '?'}**`,
          `Reward: **${m.rewardUec?.toLocaleString() || '?'} aUEC**`,
          `Blueprints: ${m.blueprints.join(', ')}`,
        ].join('\n'),
      });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};