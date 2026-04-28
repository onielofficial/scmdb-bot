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
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔍 Blueprint Results — "' + name + '"')
            .setDescription('ไม่พบ Blueprint สำหรับ **' + name + '**'),
        ],
      });
    }

    // Unique blueprint names across all results (deduplicated)
    const allBps = [...new Set(results.flatMap(r => r.blueprints))];

    // System string — unique systems across all results
    const allSystems = [...new Set(
      results.flatMap(r => r.system.split(', ')).filter(Boolean)
    )];
    const systemStr = allSystems.join(', ') || '—';

    // Top result drives the 2×2 grid
    const top = results[0];
    const shown = results.slice(0, 5);

    // Mission title tags — 🟠 illegal · 🟡 legal — all on one line
    const missionTags = shown
      .map(m => (m.illegal ? '🟠' : '🟡') + ' ' + m.title)
      .join('   ');

    // Blueprint display — "·" separator, max 2 lines
    const bpCap  = allBps.slice(0, 14);
    const half   = Math.ceil(bpCap.length / 2);
    const line1  = bpCap.slice(0, half).join(' · ');
    const line2  = bpCap.slice(half).join(' · ');
    const bpText = line2 ? line1 + '\n' + line2 : line1;
    const bpMore = allBps.length > 14 ? '\n*+' + (allBps.length - 14) + ' more*' : '';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔍 Blueprint Results — "' + name + '"')
      .setDescription(
        'พบ **' + allBps.length + '** blueprints จาก **' + results.length +
        '** missions ใน **' + systemStr + '** system'
      )
      .addFields(
        // ── Missions header + tags ──────────────────────────────────────
        {
          name: 'MISSIONS ที่ให้ BLUEPRINT ' + name.toUpperCase(),
          value: missionTags || '—',
        },
        // ── 2×2 grid row 1: FACTION | REWARD | spacer ──────────────────
        {
          name:   'FACTION',
          value:  top.faction || '—',
          inline: true,
        },
        {
          name:   'REWARD',
          value:  (top.rewardUec ?? 0).toLocaleString() + ' aUEC',
          inline: true,
        },
        { name: '​', value: '​', inline: true },
        // ── 2×2 grid row 2: REP/H | DROP RATE | spacer ─────────────────
        {
          name:   'REP/H',
          value:  '—',
          inline: true,
        },
        {
          name:   'DROP RATE',
          value:  top.dropRate + '%',
          inline: true,
        },
        { name: '​', value: '​', inline: true },
        // ── Blueprint list ──────────────────────────────────────────────
        {
          name:  'BLUEPRINTS ที่ได้รับ',
          value: bpText + bpMore || '—',
        },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
