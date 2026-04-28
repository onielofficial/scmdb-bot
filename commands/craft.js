const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo, getCraftingItem, getCraftingBlueprint } = require('../services/scmdb');

function qtyBar(amount, max, len = 10) {
  const filled = Math.max(1, Math.round((amount / max) * len));
  return '■'.repeat(filled) + '□'.repeat(len - filled);
}

function pct(v) {
  return (v * 100).toFixed(1) + '%';
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('ดูข้อมูล Wikelo Crafting Recipe')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ item, วัตถุดิบ หรือชื่อ recipe เช่น Ana Helmet, Antium, Vanduul')
        .setRequired(true)
    )
    .addIntegerOption(opt =>
      opt.setName('quality')
        .setDescription('Craft quality (0-1000, default 500)')
        .setRequired(false)
        .setMinValue(0)
        .setMaxValue(1000)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name    = interaction.options.getString('name');
    const quality = interaction.options.getInteger('quality') ?? 500;
    const factor  = 0.9 + (quality / 1000 * 0.2);

    let craftResult, itemData, blueprintData;
    try {
      craftResult   = getCraftInfo(name);
      itemData      = getCraftingItem(name);
      blueprintData = getCraftingBlueprint(name);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }

    if (!craftResult && !itemData && !blueprintData) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setDescription('⚒  ไม่พบ Crafting Recipe สำหรับ `' + name + '`'),
        ],
      });
    }

    const itemName     = blueprintData?.productName || itemData?.name || craftResult?.itemName || name;
    const manufacturer = itemData?.manufacturer || '—';
    const classLabel   = itemData?.itemType || '—';
    const isArmor      = itemData?.itemType === 'armor';
    const craftTime    = blueprintData ? blueprintData.tiers[0].craftTimeSeconds + 's' : 'N/A';

    // Materials: prefer blueprint slots, fall back to merged.json
    let matLines = '—';
    const slots = blueprintData?.tiers[0].slots ?? [];
    if (slots.length) {
      const maxQty = Math.max(...slots.flatMap(s => s.options.map(o => o.quantity)), 1);
      matLines = slots.flatMap(s =>
        s.options.map(o =>
          '🔧 **' + o.resourceName + '** × ' + o.quantity + ' SCU' +
          (o.minQuality > 0 ? ' (min quality: ' + o.minQuality + ')' : '') + '\n' +
          qtyBar(o.quantity, maxQty)
        )
      ).join('\n');
    } else if (craftResult?.materials?.length) {
      const maxAmt = Math.max(...craftResult.materials.map(m => m.amount), 1);
      matLines = craftResult.materials.map(m =>
        '🔧 **' + m.name + '** × ' + m.amount + ' SCU\n' + qtyBar(m.amount, maxAmt)
      ).join('\n');
    }

    // Damage resistance stats with quality factor (armor only)
    let statsValue = '—';
    if (isArmor && itemData.damageResistance) {
      const dr = itemData.damageResistance;
      const stat = (base) => {
        const b = base ?? 1;
        return pct(b) + ' → ' + pct(b * factor);
      };
      statsValue =
        'Quality: **' + quality + '**/1000 · Factor: ×' + factor.toFixed(3) + '\n' +
        'Physical: '   + stat(dr.physical?.multiplier)   + '\n' +
        'Energy: '     + stat(dr.energy?.multiplier)     + '\n' +
        'Distortion: ' + stat(dr.distortion?.multiplier) + '\n' +
        'Thermal: '    + stat(dr.thermal?.multiplier)    + '\n' +
        'Stun: '       + stat(dr.stun?.multiplier);
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
        { name: 'CLASS',        value: classLabel,   inline: true },
        { name: 'MANUFACTURER', value: manufacturer, inline: true },
        { name: 'CRAFT TIME',   value: craftTime,    inline: true },
        { name: 'MATERIALS REQUIRED (QUALITY ' + quality + ')', value: matLines },
        { name: 'STATS ที่ได้รับ (Q' + quality + ')', value: statsValue },
        { name: 'TEMPERATURE RESISTANCE', value: tempValue },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
