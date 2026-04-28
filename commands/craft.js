const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('ดูข้อมูล Wikelo Crafting Recipe')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ item, วัตถุดิบ หรือชื่อ recipe เช่น Ana Helmet, Antium, Vanduul')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name = interaction.options.getString('name');
    let result;
    try {
      result = getCraftInfo(name);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }
    if (!result) {
      return interaction.editReply(`ไม่พบ Crafting Recipe สำหรับ **${name}**`);
    }

    const materialsText = result.materials
      .map(m => `• **${m.name}** ×${m.amount}`)
      .join('\n') || '?';

    const outputsText = result.outputs
      .map(o => `• **${o.name}** (${o.slot}${o.armorClass !== '?' ? ', ' + o.armorClass : ''})`)
      .join('\n') || '?';

    const locationsText = result.destinations.join('\n') || '?';

    const desc = result.description
      ? result.description.slice(0, 200) + (result.description.length > 200 ? '…' : '')
      : '';

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle(`⚒ Recipe — ${result.title}`)
      .setDescription(desc)
      .addFields(
        { name: '📦 Materials Required', value: materialsText },
        { name: '🎁 Output Items', value: outputsText },
        { name: '📍 Craft At (Wikelo)', value: locationsText },
        { name: '🌌 System', value: result.system || '?', inline: true },
      )
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
