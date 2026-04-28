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
            .setTitle('🔍 Blueprint Results — ' + name)
            .setDescription('ไม่พบ Blueprint สำหรับ **' + name + '**'),
        ],
      });
    }

    const allBps = [...new Set(results.flatMap(r => r.blueprints))];
    const allSystems = [...new Set(results.flatMap(r => r.system.split(', ')).filter(Boolean))];
    const systemStr = allSystems.join(', ') || '—';
    const top = results[0];
    const shown = results.slice(0, 5);

    // Field 1: backtick chips with level-contract prefixes stripped, all on one line
    const PREFIX_RE = /^[^:]+:\s*/;
    const missionChips = shown
      .map(m => '`' + m.title.replace(PREFIX_RE, '') + '`')
      .join(' ');

    // Field 2: 2-column code block — FACTION/REWARD row 1, REP/H/DROP RATE row 2
    const factionVal = top.faction || '—';
    const rewardVal  = (top.rewardUec ?? 0).toLocaleString() + ' aUEC';
    const repVal     = '—';
    const dropVal    = top.dropRate + '%';
    const COL        = Math.max('FACTION'.length, factionVal.length, 'REP/H'.length, repVal.length) + 2;
    const gridBlock  = '```\n'
      + 'FACTION'.padEnd(COL) + 'REWARD\n'
      + factionVal.padEnd(COL) + rewardVal + '\n'
      + 'REP/H'.padEnd(COL)   + 'DROP RATE\n'
      + repVal.padEnd(COL)    + dropVal + '\n'
      + '```';

    // Field 3: all blueprint names joined by · separator
    const bpText = allBps.join(' · ') || '—';

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle('🔍 Blueprint Results — ' + name)
      .setDescription(
        'พบ **' + allBps.length + '** blueprints จาก **' + results.length +
        '** missions ใน **' + systemStr + '** system'
      )
      .addFields(
        {
          name:  'MISSIONS ที่ให้ BLUEPRINT ' + name.toUpperCase(),
          value: missionChips || '—',
        },
        {
          name:  '** **',
          value: gridBlock,
        },
        {
          name:  'BLUEPRINTS ที่ได้รับ',
          value: bpText,
        },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
