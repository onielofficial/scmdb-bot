const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo, getCraftingItem, getCraftingBlueprint } = require('../services/scmdb');

function qualityTier(q) {
  if (q >= 900) return '🟡 Max (900–1000)';
  if (q >= 700) return '🟢 High (700–899)';
  if (q >= 400) return '🔵 Mid (400–699)';
  return '🔴 Low (0–399)';
}

// Multiply together all slot modifiers that match propertyKey, interpolated at quality.
function getPropertyFactor(slots, propertyKey, quality) {
  let factor = 1.0;
  for (const slot of slots) {
    for (const mod of (slot.modifiers ?? [])) {
      if (mod.propertyKey === propertyKey) {
        const t = (quality - mod.startQuality) / (mod.endQuality - mod.startQuality);
        factor *= mod.modifierAtStart + t * (mod.modifierAtEnd - mod.modifierAtStart);
      }
    }
  }
  return factor;
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
    const massLabel    = itemData?.mass != null ? itemData.mass + ' kg' : '—';
    const isArmor      = itemData?.itemType === 'armor';
    const craftTime    = blueprintData ? blueprintData.tiers[0].craftTimeSeconds + 's' : 'N/A';

    const slots = blueprintData?.tiers[0].slots ?? [];

    // Materials: prefer blueprint slots, fall back to merged.json
    let matLines = '—';
    if (slots.length) {
      matLines = slots.flatMap(s =>
        s.options.map(o =>
          '🔩 **' + o.resourceName + '** × `' + o.quantity + ' SCU`' +
          (o.minQuality > 0 ? '  _(min Q: ' + o.minQuality + ')_' : '')
        )
      ).join('\n');
    } else if (craftResult?.materials?.length) {
      matLines = craftResult.materials.map(m =>
        '🔩 **' + m.name + '** × `' + m.amount + ' SCU`'
      ).join('\n');
    }

    // Damage resistance as monospace table (armor only)
    let drValue = null;
    if (isArmor && itemData.damageResistance) {
      const dr = itemData.damageResistance;
      // Factor applies to resistance (1 - multiplier), not to the multiplier directly
      const dmgFactor = getPropertyFactor(slots, 'armor_damagemitigation', quality);
      const drRow = (label, base) => {
        const b = base ?? 1;
        const crafted = 1 - (1 - b) * dmgFactor;
        const bRes = ((1 - b) * 100).toFixed(0);
        const cRes = ((1 - crafted) * 100).toFixed(0);
        return label.padEnd(5) +
          '×' + b.toFixed(2) + ' (-' + bRes + '%)' +
          '  →  ' +
          '×' + crafted.toFixed(2) + ' (-' + cRes + '%)';
      };
      drValue =
        qualityTier(quality) + '\n' +
        '```\n' +
        drRow('PHY', dr.physical?.multiplier)   + '\n' +
        drRow('ENG', dr.energy?.multiplier)     + '\n' +
        drRow('DIS', dr.distortion?.multiplier) + '\n' +
        drRow('THM', dr.thermal?.multiplier)    + '\n' +
        drRow('STN', dr.stun?.multiplier)       + '\n' +
        '```';
    }

    // Temperature resistance (armor only)
    let tempValue = null;
    if (isArmor && itemData.temperatureResistance) {
      const tr = itemData.temperatureResistance;
      const minFactor = getPropertyFactor(slots, 'armor_temperaturemin', quality);
      const maxFactor = getPropertyFactor(slots, 'armor_temperaturemax', quality);
      const minCrafted = tr.min * minFactor;
      const maxCrafted = tr.max * maxFactor;
      const minDiff = minCrafted - tr.min;
      const maxDiff = maxCrafted - tr.max;
      const fmt  = (v) => v.toFixed(1) + '°C';
      const sign = (v) => v >= 0 ? '+' : '';
      tempValue =
        '```\n' +
        'Min  ' + fmt(tr.min).padStart(8)      + ' → ' + fmt(minCrafted).padStart(9) + '  (' + sign(minDiff) + fmt(minDiff) + ')\n' +
        'Max  ' + fmt(tr.max).padStart(8)      + ' → ' + fmt(maxCrafted).padStart(9) + '  (' + sign(maxDiff) + fmt(maxDiff) + ')\n' +
        '```';
    }

    const fields = [
      { name: '🏷️ Class',       value: classLabel,   inline: true },
      { name: '🏭 Manufacturer', value: manufacturer, inline: true },
      { name: '⚖️ Mass',         value: massLabel,    inline: true },
      { name: '⏱️ Craft Time',   value: craftTime,    inline: true },
      { name: '📦 Materials (Q' + quality + ')', value: matLines },
    ];

    if (drValue)   fields.push({ name: '🛡️ Damage Resistance',     value: drValue });
    if (tempValue) fields.push({ name: '🌡️ Temperature Resistance', value: tempValue });

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('⚒ Craft — ' + itemName)
      .addFields(fields)
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
