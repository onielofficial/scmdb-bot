const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchQuest, getData } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('ค้นหา Quest/Mission จาก SCMDB')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ mission หรือ faction เช่น Foxwell')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption(opt =>
      opt.setName('system')
        .setDescription('ระบบดาว: Stanton, Pyro, Nyx')
        .setRequired(false)
        .addChoices(
          { name: 'Stanton', value: 'stanton' },
          { name: 'Pyro',    value: 'pyro'    },
          { name: 'Nyx',     value: 'nyx'     },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name   = interaction.options.getString('name');
    const system = interaction.options.getString('system');
    let results;
    try {
      results = searchQuest(name, system);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }

    if (!results.length) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0xED4245)
            .setDescription('🎯  ไม่พบ Quest สำหรับ `' + name + '`'),
        ],
      });
    }

    const shown = results.slice(0, 5);
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle('🎯  Quest — ' + name)
      .setDescription(
        'พบ **' + results.length + '** mission' + (results.length !== 1 ? 's' : '') +
        (system ? '  ·  🌌 ' + system.charAt(0).toUpperCase() + system.slice(1) : '') +
        (results.length > 5 ? '  ·  *แสดง 5 รายการ*' : '')
      )
      .setFooter({ text: `SCMDB · scmdb.net • ${new Date().toLocaleString('th-TH', { timeZone: 'Asia/Bangkok' })}` });

    for (const q of shown) {
      const legalIcon = q.illegal ? '🔴' : '🟢';
      const legalStr  = q.illegal ? 'Illegal' : 'Legal';
      const rewardStr = q.rewardUec ? q.rewardUec.toLocaleString() + ' aUEC' : '—';

      // Row 1: mission type + system as tags
      const tagRow = '`⚔️ ' + q.missionType + '`  `🌌 ' + (q.system || '—') + '`';

      // Row 2: faction / reward / legality grid boxes
      const gridRow =
        '`🏴 ' + q.faction + '`  ' +
        '`💰 ' + rewardStr + '`  ' +
        '`' + legalIcon + ' ' + legalStr + '`';

      // Blueprint bullet list
      const bpBullets = q.blueprints.length
        ? '\n\n' + q.blueprints.slice(0, 4).map(b => '• ' + b).join('\n') +
          (q.blueprints.length > 4 ? '\n*+' + (q.blueprints.length - 4) + ' more*' : '')
        : '';

      embed.addFields({
        name: legalIcon + '  ' + q.title,
        value: tagRow + '\n\n' + gridRow + bpBullets,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const data = getData();
    const results = (data.contracts || [])
      .filter(c => c.title?.toLowerCase().startsWith(focused))
      .slice(0, 25)
      .map(c => ({ name: c.title, value: c.title }));
    await interaction.respond(results);
  },
};
