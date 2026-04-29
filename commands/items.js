const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const craftingData = require('../data/crafting_items.json');
const { items, damageResistancePools } = craftingData;

const CATEGORY_TAG = { armor: 'ARMOR', weapon: 'WEAPON', unknown: 'OTHER' };

function toTag(itemType) {
  return CATEGORY_TAG[itemType] ?? itemType.toUpperCase();
}

function formatResistance(pool) {
  const pct = v => `${Math.round((1 - v) * 100)}%`;
  return [
    `PHY: ${pct(pool.physical.multiplier)}  ENG: ${pct(pool.energy.multiplier)}  DIS: ${pct(pool.distortion.multiplier)}`,
    `THM: ${pct(pool.thermal.multiplier)}  BIO: ${pct(pool.biochemical.multiplier)}  STN: ${pct(pool.stun.multiplier)}`,
  ].join('\n');
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('items')
    .setDescription('Look up a craftable item by name')
    .addStringOption(opt =>
      opt.setName('search')
        .setDescription('Item name')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const results = items
      .filter(item => item.name.toLowerCase().startsWith(focused))
      .slice(0, 25)
      .map(item => ({
        name: `[${toTag(item.itemType)}] ${item.name}`,
        value: item.name,
      }));
    await interaction.respond(results);
  },

  async execute(interaction) {
    const search = interaction.options.getString('search');
    const item = items.find(i => i.name.toLowerCase() === search.toLowerCase());

    if (!item) {
      return interaction.reply({
        content: `❌ Item **${search}** not found.`,
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(item.name)
      .setColor(0x5865F2)
      .addFields(
        { name: 'TYPE',         value: toTag(item.itemType),          inline: true },
        { name: 'MANUFACTURER', value: item.manufacturer ?? 'Unknown', inline: true },
        { name: 'MASS',         value: `${item.mass} kg`,             inline: true }
      );

    if (item.itemType === 'armor') {
      if (item.attachSubType) {
        embed.addFields({ name: 'ARMOR CLASS', value: item.attachSubType, inline: true });
      }

      if (item.temperatureResistance) {
        const { min, max } = item.temperatureResistance;
        embed.addFields({ name: 'TEMPERATURE', value: `${min}°C — ${max}°C`, inline: true });
      }

      if (item.damageResistanceIndex != null && damageResistancePools[item.damageResistanceIndex]) {
        const pool = damageResistancePools[item.damageResistanceIndex];
        embed.addFields({ name: 'DAMAGE RESISTANCE', value: `\`\`\`${formatResistance(pool)}\`\`\`` });
      }
    }

    embed
      .setFooter({ text: 'SCMDB · scmdb.net' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
