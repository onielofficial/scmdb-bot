const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findResource } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resource')
    .setDescription('ค้นหาแหล่งแร่จาก SCMDB')
    .addStringOption(opt =>
      opt.setName('material')
        .setDescription('ชื่อแร่ เช่น Tungsten')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const material = interaction.options.getString('material');
    let results;
    try {
      results = findResource(material);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }
    if (!results.length) {
      return interaction.editReply(`ไม่พบแหล่งแร่สำหรับ **${material}**`);
    }
    const embed = new EmbedBuilder()
      .setColor(0xFAA61A)
      .setTitle(`📡 Resource — "${material}"`)
      .setDescription(`พบ **${results.length} locations**`)
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' })
      .setTimestamp();
    for (const loc of results) {
      embed.addFields({
        name: `${loc.name} (${loc.system || '?'})`,
        value: `Type: **${loc.type || '?'}** · Probability: **${loc.probability}%**`,
        inline: true,
      });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};