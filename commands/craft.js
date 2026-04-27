const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('ดูข้อมูล Craft พร้อม materials และ stats')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ item เช่น Antium Helmet')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quality')
        .setDescription('Quality 0-1000 (default: 750)')
        .setMinValue(0)
        .setMaxValue(1000)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name = interaction.options.getString('name');
    const quality = interaction.options.getInteger('quality') ?? 750;
    let result;
    try {
      result = getCraftInfo(name, quality);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }
    if (!result) {
      return interaction.editReply(`ไม่พบ item สำหรับ **${name}**`);
    }
    const craftEmbed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle(`⚒ Craft — ${result.name}`)
      .addFields(
        { name: 'Manufacturer', value: result.manufacturer || '?', inline: true },
        { name: 'Class', value: result.armorClass || '?', inline: true },
        { name: 'Craft Time', value: `${result.craftTime || '?'}s`, inline: true },
        { name: 'Weight', value: `${result.weight || '?'} kg`, inline: true },
        { name: 'Quality', value: `${quality}`, inline: true },
      )
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' })
      .setTimestamp();
    for (const mat of (result.materials || [])) {
      craftEmbed.addFields({
        name: `🔧 ${mat.section} — ${mat.resource}`,
        value: [
          `SCU: **${mat.scu || '?'}**`,
          `Quality ${quality} → **${mat.qualityBonus}** (${mat.stat || '?'})`,
        ].join('\n'),
      });
    }
    const statsEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .setTitle(`📊 Stats — ${result.name} (Q${quality})`)
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' });
    if (result.stats) {
      const s = result.stats;
      statsEmbed.addFields(
        { name: 'Physical', value: String(s.physical || '?'), inline: true },
        { name: 'Energy', value: String(s.energy || '?'), inline: true },
        { name: 'Distortion', value: String(s.distortion || '?'), inline: true },
        { name: 'Thermal', value: String(s.thermal || '?'), inline: true },
        { name: 'Biochemical', value: String(s.biochemical || '?'), inline: true },
        { name: 'Stun', value: String(s.stun || '?'), inline: true },
        { name: 'Min Temp', value: String(s.minTemp || '?'), inline: true },
        { name: 'Max Temp', value: String(s.maxTemp || '?'), inline: true },
      );
    }
    await interaction.editReply({ embeds: [craftEmbed, statsEmbed] });
  },
};