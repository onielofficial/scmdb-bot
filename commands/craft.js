const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo, getCraftingItem } = require('../services/scmdb');

function qtyBar(amount, max, len = 10) {
  const filled = Math.max(1, Math.round((amount / max) * len));
  return '■'.repeat(filled) + '□'.repeat(len - filled);
}

function pct(multiplier) {
  return Math.round(multiplier * 100) + '%';
}

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

    let craftResult, itemData;
    try {
      craftResult = getCraftInfo(name);
      itemData    = getCraftingItem(name);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }

    if (!craftResult && !itemData) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setDescription('⚒  ไม่พบ Crafting Recipe สำหรับ `' + name + '`'),
        ],
      });
    }

    const itemName     = itemData?.name || craftResult?.itemName || name;
    const manufacturer = itemData?.manufacturer || '—';
    const classLabel   = itemData?.itemType || '—';
    const isArmor      = itemData?.itemType === 'armor';

    // Materials from merged.json
    let matLines = '—';
    if (craftResult?.materials?.length) {
      const maxAmt = Math.max(...craftResult.materials.map(m => m.amount), 1);
      matLines = craftResult.materials
        .map(m =>
          '🔧 **' + m.name + '**    ' + m.amount + ' SCU    — · —\n' +
          qtyBar(m.amount, maxAmt)
        )
        .join('\n');
    }

    // Damage resistance stats (armor only)
    let statsValue = '—';
    if (isArmor && itemData.damageResistance) {
      const dr = itemData.damageResistance;
      statsValue =
        'Physical: ' + pct(dr.physical?.multiplier ?? 1) + '\n' +
        'Energy: '   + pct(dr.energy?.multiplier    ?? 1) + '\n' +
        'Distortion: '+ pct(dr.distortion?.multiplier?? 1) + '\n' +
        'Thermal: '  + pct(dr.thermal?.multiplier   ?? 1) + '\n' +
        'Stun: '     + pct(dr.stun?.multiplier      ?? 1);
    }

    // Temperature range (armor only)
    let tempValue = '—';
    if (isArmor && itemData.temperatureResistance) {
      const tr = itemData.temperatureResistance;
      tempValue = 'Min ' + tr.min + '°C / Max ' + tr.max + '°C';
    }

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('⚒ Craft — ' + itemName)
      .addFields(
        { name: 'CLASS',        value: classLabel,  inline: true },
        { name: 'MANUFACTURER', value: manufacturer, inline: true },
        { name: 'CRAFT TIME',   value: 'N/A',        inline: true },
        { name: 'MATERIALS REQUIRED (QUALITY —)', value: matLines },
        { name: 'STATS ที่ได้รับ', value: statsValue },
        { name: 'TEMPERATURE RESISTANCE', value: tempValue },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
