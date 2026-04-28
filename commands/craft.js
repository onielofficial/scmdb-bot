const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo } = require('../services/scmdb');

const CLASS_LABEL = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };

function qtyBar(amount, max, len = 16) {
  const filled = Math.max(1, Math.round((amount / max) * len));
  return '█'.repeat(filled) + '░'.repeat(len - filled);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('craft')
    .setDescription('ดูข้อมูล Wikelo Crafting Recipe')
    .addStringOption(opt =>
      opt.setName('name')
        .setDescription('ชื่อ item, วัตถุดิบ หรือชื่อ recipe เช่น Ana Helmet, Antium, Vanduul')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();
    const name = interaction.options.getString('name');
    let result;
    try {
      result = getCraftInfo(name);
    } catch (e) {
      return interaction.editReply(`❌ ${e.message}`);
    }
    if (!result) {
      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x1ABC9C)
            .setDescription('⚒  ไม่พบ Crafting Recipe สำหรับ `' + name + '`'),
        ],
      });
    }

    const armorClass = result.outputs.find(o => o.armorClass && o.armorClass !== '?')?.armorClass;
    const classLabel = armorClass ? (CLASS_LABEL[armorClass] ?? armorClass) : '—';

    const maxAmt = Math.max(...result.materials.map(m => m.amount), 1);
    const matLines = result.materials
      .map(m =>
        '🔧 **' + m.name + '**    ' + m.amount + ' SCU    — · —\n' +
        qtyBar(m.amount, maxAmt, 16)
      )
      .join('\n') || '—';

    const statsValue =
      'Physical/Energy/Distortion/Thermal: — · —\n' +
      'Stun: — · Min Temp: — · Max Temp: —';

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('⚒ Craft — ' + result.itemName)
      .addFields(
        { name: 'CLASS',        value: classLabel, inline: true },
        { name: 'MANUFACTURER', value: '—',        inline: true },
        { name: 'CRAFT TIME',   value: '—',        inline: true },
        { name: 'MATERIALS REQUIRED (QUALITY —)', value: matLines },
        { name: 'STATS ที่ได้รับ (Q—)',            value: statsValue },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
