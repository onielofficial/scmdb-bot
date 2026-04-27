const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { searchQuest } = require('../services/scmdb');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quest')
    .setDescription('ค้นหา Quest/Mission จาก SCMDB')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ mission หรือ faction เช่น Foxwell')
        .setRequired(true)
    )
    .addStringOption(opt =>
      opt.setName('system')
        .setDescription('ระบบดาว: Stanton, Pyro, Nyx')
        .setRequired(false)
        .addChoices(
          { name: 'Stanton', value: 'stanton' },
          { name: 'Pyro', value: 'pyro' },
          { name: 'Nyx', value: 'nyx' },
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name = interaction.options.getString('name');
    const system = interaction.options.getString('system');
    let results;
    try {
      results = searchQuest(name, system);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }
    if (!results.length) {
      return interaction.editReply(`ไม่พบ Quest สำหรับ **${name}**`);
    }
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`🎯 Quest — "${name}"`)
      .setDescription(`พบ **${results.length} missions**`)
      .setFooter({ text: 'ข้อมูลจาก scmdb.net' })
      .setTimestamp();
    for (const q of results.slice(0, 5)) {
      embed.addFields({
        name: q.title,
        value: [
          `Faction: **${q.faction || '?'}**`,
          `System: **${q.system || '?'}**`,
          `Reward: **${q.rewardUec?.toLocaleString() || '?'} aUEC**`,
          `Rep/h: **${q.repPerHour?.toLocaleString() || '?'}**`,
          `Legality: **${q.legality || '?'}**`,
          q.blueprints?.length ? `Blueprints: ${q.blueprints.join(', ')}` : '',
        ].filter(Boolean).join('\n'),
      });
    }
    await interaction.editReply({ embeds: [embed] });
  },
};