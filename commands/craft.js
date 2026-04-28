const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getCraftInfo } = require('../services/scmdb');

const SLOT_EMOJI = {
  helmet: '🪖', arms: '🦾', chest: '🥋', legs: '🦵', backpack: '🎒',
};
const CLASS_BADGE = {
  light: '🔵 Light', medium: '🟡 Medium', heavy: '🔴 Heavy',
};

function materialBar(amount, max, len = 10) {
  const filled = Math.max(1, Math.round((amount / max) * len));
  return `\`${'█'.repeat(filled)}${'░'.repeat(len - filled)}\``;
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
            .setColor(0x2B2D31)
            .setDescription(`> ⚒  ไม่พบ Crafting Recipe สำหรับ \`${name}\``)
        ],
      });
    }

    const maxAmt = Math.max(...result.materials.map(m => m.amount), 1);
    const materialsText = result.materials
      .map(m => `${materialBar(m.amount, maxAmt)}  **${m.name}**  ×${m.amount}`)
      .join('\n') || '—';

    const outputsText = result.outputs
      .map(o => {
        const slotEmoji = SLOT_EMOJI[o.slot] ?? '⚔️';
        const classBadge = CLASS_BADGE[o.armorClass] ?? '';
        return `${slotEmoji}  **${o.name}**${classBadge ? `  —  ${classBadge}` : ''}`;
      })
      .join('\n') || '—';

    const locText = result.destinations
      .map(d => `📍  ${d}`)
      .join('\n') || '—';

    const desc = result.description
      ? `*${result.description.replace(/\\n/g, ' ').slice(0, 160)}${result.description.length > 160 ? '…' : ''}*`
      : '';

    const recipeEmbed = new EmbedBuilder()
      .setColor(0x1ABC9C)
      .setTitle(`⚒  Recipe — ${result.title}`)
      .setDescription(desc)
      .addFields(
        { name: '📦  Materials Required', value: materialsText },
        { name: '🎁  Output Items', value: outputsText },
      )
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    const locationEmbed = new EmbedBuilder()
      .setColor(0x57F287)
      .addFields(
        { name: '📍  Craft At (Wikelo)', value: locText, inline: true },
        { name: '🌌  System', value: result.system || '—', inline: true },
      );

    await interaction.editReply({ embeds: [recipeEmbed, locationEmbed] });
  },
};
