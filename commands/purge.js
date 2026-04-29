const { SlashCommandBuilder, MessageFlags, PermissionFlagsBits } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('ลบข้อความในห้องแชท')
    .addIntegerOption(option =>
      option
        .setName('amount')
        .setDescription('จำนวนข้อความที่ต้องการลบ (1-100)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)
    ),

  async execute(interaction) {
    if (!interaction.member.permissions.has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ คุณไม่มีสิทธิ์ใช้คำสั่งนี้', flags: MessageFlags.Ephemeral });
    }

    const botMember = interaction.guild.members.me;
    if (!interaction.channel.permissionsFor(botMember).has(PermissionFlagsBits.ManageMessages)) {
      return interaction.reply({ content: '❌ บอทไม่มีสิทธิ์ลบข้อความในห้องนี้', flags: MessageFlags.Ephemeral });
    }

    const amount = interaction.options.getInteger('amount');
    const deleted = await interaction.channel.bulkDelete(amount, true);

    await interaction.reply({
      content: `🗑️ ลบ ${deleted.size} ข้อความแล้ว`,
      flags: MessageFlags.Ephemeral,
    });
  },
};
