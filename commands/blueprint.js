const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchBlueprint } = require('../services/scmdb');

const TECH_PREFIX_RE  = /^(?:MissionGiver|Contract|PU|SCM|GV|TDD|CRU|HUR|MIC|ARC|NB|STT)_/i;
const COLON_PREFIX_RE = /^[^:]+:\s*/;

function cleanTitle(title) {
  let t = title.replace(TECH_PREFIX_RE, '').replace(COLON_PREFIX_RE, '');
  return t.replace(/_/g, ' ').trim();
}

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

    const allBps     = [...new Set(results.flatMap(r => r.blueprints))];
    const allSystems = [...new Set(results.flatMap(r => r.system.split(', ')).filter(Boolean))];
    const systemStr  = allSystems.join(', ') || '—';
    const top        = results[0];
    const shown      = results.slice(0, 5);

    // Field 1: bullet list of mission names, prefixes stripped
    const missionList = shown
      .map(m => '• ' + cleanTitle(m.title))
      .join('\n') || '—';

    // Field 2: 3-column code block — FACTION | REWARD | DROP RATE
    const factionVal = top.faction || '—';
    const rewardVal  = (top.rewardUec ?? 0).toLocaleString() + ' aUEC';
    const dropVal    = top.dropRate + '%';
    const C1 = Math.max('FACTION'.length, factionVal.length) + 2;
    const C2 = Math.max('REWARD'.length,  rewardVal.length)  + 2;
    const gridBlock = '```\n'
      + 'FACTION'.padEnd(C1) + 'REWARD'.padEnd(C2) + 'DROP RATE\n'
      + factionVal.padEnd(C1) + rewardVal.padEnd(C2) + dropVal + '\n'
      + '```';

    // Field 3: bullet list of blueprints
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
          value: missionList,
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
      .setFooter({ text: `SCMDB · scmdb.net • ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
