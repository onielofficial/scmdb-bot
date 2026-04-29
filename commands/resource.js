const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { findResource } = require('../services/scmdb');

const LOC_EMOJI = {
  Star: '⭐', Planet: '🪐', Moon: '🌙',
  Outpost: '📡', Station: '🛸', Destination: '📍',
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

    const total   = results.reduce((s, r) => s + r.contracts, 0);
    const topPct  = Math.round((results[0].contracts / total) * 100);

    // Top 4 location inline tags shown in description
    const locTags = results.slice(0, 4)
      .map(r => '`' + locEmoji(r.type) + ' ' + r.name + '`')
      .join('  ');

    // Unique systems and types for grid boxes
    const systems = [...new Set(results.map(r => r.system).filter(s => s && s !== '?'))];
    const types   = [...new Set(results.map(r => r.type).filter(Boolean))];

    // Ranked location list with medal indicators
    const MEDALS  = ['🥇', '🥈', '🥉'];
    const ranked  = results.map((r, i) =>
      (MEDALS[i] ?? '▸') + '  **' + r.name + '**  ·  ' + r.contracts + ' contracts'
    ).join('\n');

    const embed = new EmbedBuilder()
      .setColor(0xFAA61A)
      .setTitle('🪨  Resource — ' + material)
      .setDescription(
        '**' + total + '** total contracts  ·  Best match: **' + topPct + '%** at *' + results[0].name + '*\n\n' +
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
          value: ranked,
        },
      )
      .setFooter({ text: `SCMDB · scmdb.net • ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
