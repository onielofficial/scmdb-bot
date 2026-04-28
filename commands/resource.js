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
            .setColor(0x2B2D31)
            .setDescription(`> 🪨  ไม่พบ Resource สำหรับ \`${material}\``)
        ],
      });
    }

    const maxContracts = Math.max(...results.map(r => r.contracts));

    const embed = new EmbedBuilder()
      .setColor(0xFAA61A)
      .setTitle(`🪨  Resource — \`${material}\``)
      .setDescription(
        `พบ **${results.length}** location${results.length !== 1 ? 's' : ''} ` +
        `ที่มี hauling contract สำหรับ resource นี้`
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    for (const loc of results) {
      const barLen = 8;
      const filled = Math.max(1, Math.round((loc.contracts / maxContracts) * barLen));
      const bar = `\`${'█'.repeat(filled)}${'░'.repeat(barLen - filled)}\``;

      embed.addFields({
        name: `${locEmoji(loc.type)}  ${loc.name}`,
        value: `🌌 **${loc.system}**  ·  ${loc.type}\n${bar}  **${loc.contracts}** contracts`,
        inline: true,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
