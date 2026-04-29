const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { items } = require('../data/crafting_items.json');

const ITEMS_PER_PAGE = 10;
const CATEGORY_TAG = { armor: 'ARMOR', weapon: 'WEAPON', unknown: 'OTHER' };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('items')
    .setDescription('Browse all craftable items with search and category filter')
    .addStringOption(opt =>
      opt.setName('search')
        .setDescription('Filter items by name (partial match)')
        .setRequired(false)
    )
    .addStringOption(opt =>
      opt.setName('category')
        .setDescription('Filter by item type')
        .setRequired(false)
        .addChoices(
          { name: 'Armor',  value: 'armor'   },
          { name: 'Weapon', value: 'weapon'  },
          { name: 'Other',  value: 'unknown' }
        )
    )
    .addIntegerOption(opt =>
      opt.setName('page')
        .setDescription('Page number (default: 1)')
        .setRequired(false)
        .setMinValue(1)
    ),

  async execute(interaction) {
    const search   = interaction.options.getString('search');
    const category = interaction.options.getString('category');
    const page     = interaction.options.getInteger('page') ?? 1;

    let filtered = items;

    if (search) {
      const q = search.toLowerCase();
      filtered = filtered.filter(item => item.name.toLowerCase().includes(q));
    }

    if (category) {
      filtered = filtered.filter(item => item.itemType === category);
    }

    const total      = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / ITEMS_PER_PAGE));
    const safePage   = Math.min(page, totalPages);
    const start      = (safePage - 1) * ITEMS_PER_PAGE;
    const pageItems  = filtered.slice(start, start + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
      .setTitle('📦 Item List')
      .setColor(0x5865F2);

    if (total === 0) {
      embed.setDescription('❌ No items found matching your search');
    } else {
      const lines = pageItems.map(item => {
        const tag = CATEGORY_TAG[item.itemType] ?? item.itemType.toUpperCase();
        return `[${tag}] ${item.name} — ${item.manufacturer}`;
      });
      embed.setDescription(lines.join('\n'));
    }

    embed
      .setFooter({ text: `Page ${safePage} / ${totalPages}  ·  Total: ${total} items  ·  SCMDB · scmdb.net` })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  }
};
