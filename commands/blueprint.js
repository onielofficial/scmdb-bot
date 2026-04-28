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

    // Field 1: one backtick chip per line
    const PREFIX_RE = /^[^:]+:\s*/;
    const missionChips = shown
      .map(m => '`' + m.title.replace(PREFIX_RE, '') + '`')
      .join('\n');

    // Field 2: 2-column code block with separator between rows
    const factionVal = top.faction || '—';
    const rewardVal  = (top.rewardUec ?? 0).toLocaleString() + ' aUEC';
    const repVal     = '—';
    const dropVal    = top.dropRate + '%';
    const COL        = Math.max('FACTION'.length, factionVal.length, 'REP/H'.length, repVal.length) + 2;
    const SEP        = '─'.repeat(COL + Math.max('REWARD'.length, rewardVal.length));
    const gridBlock  = '```\n'
      + 'FACTION'.padEnd(COL) + 'REWARD\n'
      + factionVal.padEnd(COL) + rewardVal + '\n'
      + SEP + '\n'
      + 'REP/H'.padEnd(COL)   + 'DROP RATE\n'
      + repVal.padEnd(COL)    + dropVal + '\n'
      + '```';

    // Field 3: one bullet per blueprint
    const bpText = allBps.map(bp => '• ' + bp).join('\n') || '—';

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
