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
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2B2D31)
            .setDescription(`> 🎯  ไม่พบ Quest สำหรับ \`${name}\``)
        ],
      });
    }

    const shown = results.slice(0, 5);
    const embed = new EmbedBuilder()
      .setColor(0xED4245)
      .setTitle(`🎯  Quest — \`${name}\``)
      .setDescription(
        `พบ **${results.length}** mission${results.length !== 1 ? 's' : ''}` +
        (system ? `  ·  🌌 ${system.charAt(0).toUpperCase() + system.slice(1)}` : '') +
        (results.length > 5 ? '  ·  *แสดงแค่ 5 รายการ*' : '')
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    for (const q of shown) {
      const legalIcon = q.illegal ? '🔴' : '🟢';
      const reward = q.rewardUec ? `**${q.rewardUec.toLocaleString()} aUEC**` : '**—**';
      const bpLine = q.blueprints.length
        ? `\n📋  ${q.blueprints.slice(0, 2).map(b => `\`${b}\``).join('  ·  ')}` +
          (q.blueprints.length > 2 ? `  *+${q.blueprints.length - 2}*` : '')
        : '';

      embed.addFields({
        name: `${legalIcon}  ${q.title}`,
        value: [
          `\`${q.missionType}\`  ·  🏴  **${q.faction}**`,
          `🌌  **${q.system || '—'}**   💰  ${reward}`,
          bpLine,
        ].filter(Boolean).join('\n'),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
