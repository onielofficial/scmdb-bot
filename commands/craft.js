const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo } = require('../services/scmdb');

const SLOT_EMOJI  = { helmet: '🪖', arms: '🦾', chest: '🥋', legs: '🦵', backpack: '🎒' };
const CLASS_LABEL = { light: '🔵 Light', medium: '🟡 Medium', heavy: '🔴 Heavy' };

// Relative quantity bar (shows each material's share vs the highest-qty ingredient)
function qtyBar(amount, max, len = 8) {
  const filled = Math.max(1, Math.round((amount / max) * len));
  return '`' + '█'.repeat(filled) + '░'.repeat(len - filled) + '`';
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

    // Top-grid values
    const armorClass  = result.outputs.find(o => o.armorClass && o.armorClass !== '?')?.armorClass;
    const classLabel  = armorClass ? (CLASS_LABEL[armorClass] ?? armorClass) : '—';
    const description = result.description
      ? '*' + result.description.replace(/\\n/g, ' ').slice(0, 150) +
        (result.description.length > 150 ? '…' : '') + '*'
      : '';

    // Materials section — name row with qty bar
    const maxAmt = Math.max(...result.materials.map(m => m.amount), 1);
    const matLines = result.materials
      .map(m => qtyBar(m.amount, maxAmt) + '  **' + m.name + '**  ×' + m.amount)
      .join('\n') || '—';

    // Stats section — outputs with slot emoji + class badge
    const statLines = result.outputs
      .map(o => (SLOT_EMOJI[o.slot] ?? '⚔️') + '  **' + o.name + '**  ·  ' + (CLASS_LABEL[o.armorClass] ?? '—'))
      .join('\n') || '—';

    // Destination tags
    const locTags = result.destinations
      .map(d => '`📍 ' + d + '`')
      .join('\n') || '—';

    const embed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle('⚒  ' + result.title)
      .setDescription(description)
      // Top grid: manufacturer (—) / class / craft time (—)
      .addFields(
        { name: '🏭  Manufacturer', value: '—',                                       inline: true },
        { name: '⚔️  Armor Class',  value: classLabel,                                 inline: true },
        { name: '⏱  Craft Time',   value: '—',                                       inline: true },
        // Materials with qty bars (quantity substitutes SCU; quality bonus data n/a)
        { name: '📦  Materials  *(qty · quality bonus n/a)*', value: matLines },
        // Stats / outputs
        { name: '📊  Output Stats', value: statLines },
        // Location tags
        { name: '📍  Wikelo Station', value: locTags, inline: true },
        { name: '🌌  System',         value: result.system || '—', inline: true },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
