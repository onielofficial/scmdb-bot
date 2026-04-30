const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findResource } = require('../services/scmdb');

const LOC_EMOJI = {
  Star: '⭐', Planet: '🪐', Moon: '🌙',
  Outpost: '📡', Station: '🛸', Destination: '📍',
  Default: '📡', Belt: '☄️', Lagrange: '📡', Cluster: '💫',
};

function locEmoji(type) {
  return LOC_EMOJI[type] ?? '📍';
}

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
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xFAA61A)
            .setDescription('🪨  ไม่พบ Resource สำหรับ `' + material + '`'),
        ],
      });
    }

    const total = results.reduce((s, r) => s + r.contracts, 0);

    // Separate star-system-level entries from actual mining locations
    const locations = results.filter(r => r.type !== 'Star');
    const stars     = results.filter(r => r.type === 'Star');

    // Best source: top non-Star location by contract count
    const best = locations[0];
    const bestLabel = best
      ? '**' + best.name + '**' + (best.system !== '?' ? ' (' + best.system + ')' : '')
      : '—';

    // Top 4 location inline tags (skip star-level entries)
    const locTags = locations.slice(0, 4)
      .map(r => '`' + locEmoji(r.type) + ' ' + r.name + '`')
      .join('  ');

    // Systems: star entry names + non-star entries' system field (skip '?')
    const systems = [...new Set([
      ...stars.map(r => r.name),
      ...locations.map(r => r.system).filter(s => s && s !== '?'),
    ])];
    const types = [...new Set(locations.map(r => r.type).filter(Boolean))];

    // Ranked location list with contract counts and proportion %
    const MEDALS = ['🥇', '🥈', '🥉'];
    const ranked = locations.map((r, i) => {
      const pct = (r.contracts / total * 100).toFixed(1);
      return (MEDALS[i] ?? '▸') + '  **' + r.name + '**  ·  ' + r.contracts + ' contracts (' + pct + '%)';
    }).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFAA61A)
      .setTitle('🪨  Resource — ' + material)
      .setDescription(
        '**' + total + '** total contracts  ·  Best source: ' + bestLabel + '\n\n' +
        locTags
      )
      .addFields(
        {
          name: '🌌  Systems',
          value: systems.map(s => '`' + s + '`').join('  ') || '—',
          inline: true,
        },
        {
          name: '📍  Location Types',
          value: types.map(t => '`' + locEmoji(t) + ' ' + t + '`').join('\n') || '—',
          inline: true,
        },
        {
          name: '📊  Ranked Locations',
          value: ranked || '—',
        },
      )
      .setFooter({ text: `SCMDB · scmdb.net • ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
