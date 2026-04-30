const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo, getCraftingItem, getCraftingBlueprint } = require('../services/scmdb');
const { items } = require('../data/crafting_items.json');

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
        .setAutocomplete(true)
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
        s.options.map(o => {
          const rName = o.resourceName ?? o.name ?? o.itemName ?? 'Unknown';
          return '🔩 **' + rName + '** × `' + o.quantity + ' SCU`' +
            (o.minQuality > 0 ? '  _(min Q: ' + o.minQuality + ')_' : '');
        })
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

    // Weapon stats (weapon only)
    let weaponValue = null;
    if (itemData?.itemType === 'weapon') {
      const pad = (label) => label.padEnd(12);
      const lines = [];

      const hasMod = (key) => slots.some(s => s.modifiers?.some(m => m.propertyKey === key));
      const pctDiff = (base, crafted) => {
        const d = (crafted - base) / base * 100;
        return (d >= 0 ? '+' : '') + d.toFixed(2) + '%';
      };

      const damageFactor   = getPropertyFactor(slots, 'weapon_damage',            quality);
      const firerateFactor = getPropertyFactor(slots, 'weapon_firerate',          quality);
      const smoothFactor   = getPropertyFactor(slots, 'weapon_recoil_smoothness', quality);

      const fm0 = itemData.fireModes?.[0];

      // Damage
      if (itemData.ammo?.damage) {
        const dmg    = itemData.ammo.damage;
        const active = ['physical','energy','distortion','thermal','biochemical','stun'].filter(t => dmg[t] > 0);
        if (active.length > 0) {
          const baseDmg    = active.reduce((s, t) => s + dmg[t], 0);
          const craftedDmg = baseDmg * damageFactor;
          const typeLabel  = active.length === 1 ? ' (' + active[0].slice(0,3).toUpperCase() + ')' : '';
          if (hasMod('weapon_damage')) {
            lines.push(pad('Damage') + baseDmg.toFixed(2).padEnd(14) + '→  ' + craftedDmg.toFixed(2) + typeLabel + '  (' + pctDiff(baseDmg, craftedDmg) + ')');
          } else {
            lines.push(pad('Damage') + baseDmg.toFixed(2) + typeLabel);
          }

          // DPS = damage * fireRate / 60
          if (fm0) {
            const baseDPS    = baseDmg            * fm0.fireRate                     / 60;
            const craftedDPS = (baseDmg * damageFactor) * (fm0.fireRate * firerateFactor) / 60;
            if (hasMod('weapon_damage') || hasMod('weapon_firerate')) {
              lines.push(pad('DPS') + baseDPS.toFixed(2).padEnd(14) + '→  ' + craftedDPS.toFixed(2) + '  (' + pctDiff(baseDPS, craftedDPS) + ')');
            } else {
              lines.push(pad('DPS') + baseDPS.toFixed(2));
            }
          }
        }
      }

      // Fire Rate
      if (itemData.fireModes?.length) {
        for (const mode of itemData.fireModes) {
          if (hasMod('weapon_firerate')) {
            const crafted = Math.round(mode.fireRate * firerateFactor);
            lines.push(pad('Fire Rate') + (mode.fireRate + ' rpm').padEnd(14) + '→  ' + crafted + ' rpm (' + mode.name + ')');
          } else {
            lines.push(pad('Fire Rate') + mode.fireRate + ' rpm (' + mode.name + ')');
          }
        }
      }

      // Magazine
      if (itemData.magazine) {
        const mag     = itemData.magazine;
        const restock = mag.maxRestockCount > 0 ? ' (+' + mag.maxRestockCount + ' reloads)' : '';
        lines.push(pad('Magazine') + mag.ammoCount + ' rnd' + restock);
      }

      // Spread — no modifier exists, always show base
      if (fm0?.spread) {
        lines.push(pad('Spread') + fm0.spread.min.toFixed(2) + '–' + fm0.spread.max.toFixed(2) + '°');
      }

      // Recoil pitch / yaw — no scaling, show base
      if (fm0?.recoil) {
        lines.push(pad('Recoil P/Y') + fm0.recoil.pitchMaxDeg.toFixed(3) + '° / ' + fm0.recoil.yawMaxDeg.toFixed(3) + '°');
      }

      // Smooth time (scaled by weapon_recoil_smoothness if modifier exists)
      if (fm0?.recoil?.smoothTime != null) {
        const base    = fm0.recoil.smoothTime;
        const crafted = base * smoothFactor;
        if (hasMod('weapon_recoil_smoothness')) {
          lines.push(pad('Smooth') + (base.toFixed(3) + 's').padEnd(14) + '→  ' + crafted.toFixed(3) + 's  (' + pctDiff(base, crafted) + ')');
        } else {
          lines.push(pad('Smooth') + base.toFixed(3) + 's');
        }
      }

      // Range
      if (itemData.combatRange) {
        const r = itemData.combatRange;
        lines.push(pad('Range') + r.ideal + '–' + r.max + ' m (' + r.category + ')');
      }

      // Velocity
      if (itemData.ammo?.speed) {
        lines.push(pad('Velocity') + itemData.ammo.speed + ' m/s');
      }

      if (lines.length) weaponValue = '```\n' + lines.join('\n') + '\n```';
    }

    // Generic fallback for non-armor, non-weapon items
    let otherValue = null;
    if (itemData && !isArmor && itemData.itemType !== 'weapon') {
      const lines = [];
      if (itemData.size  != null) lines.push('Size'.padEnd(14)  + itemData.size);
      if (itemData.grade != null) lines.push('Grade'.padEnd(14) + itemData.grade);
      if (lines.length) otherValue = '```\n' + lines.join('\n') + '\n```';
    }

    const fields = [
      { name: '🏷️ Class',       value: classLabel,   inline: true },
      { name: '🏭 Manufacturer', value: manufacturer, inline: true },
      { name: '⚖️ Mass',         value: massLabel,    inline: true },
      { name: '⏱️ Craft Time',   value: craftTime,    inline: true },
      { name: '📦 Materials (Q' + quality + ')', value: matLines },
    ];

    if (drValue)      fields.push({ name: '🛡️ Damage Resistance',     value: drValue });
    if (tempValue)    fields.push({ name: '🌡️ Temperature Resistance', value: tempValue });
    if (weaponValue)  fields.push({ name: '🔫 Weapon Stats',           value: weaponValue });
    if (otherValue)   fields.push({ name: '📊 Stats',                  value: otherValue });

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('⚒ Craft — ' + itemName)
      .addFields(fields)
      .setFooter({ text: `SCMDB · scmdb.net • ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` });

    await interaction.editReply({ embeds: [embed] });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const results = items
      .filter(item => item.name.toLowerCase().startsWith(focused))
      .slice(0, 25)
      .map(item => ({ name: item.name, value: item.name }));
    await interaction.respond(results);
  },
};
