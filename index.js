require('dotenv').config();
const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
client.commands = new Collection();

const files = fs.readdirSync('./commands').filter(f => f.endsWith('.js'));
for (const file of files) {
  const cmd = require(`./commands/${file}`);
  client.commands.set(cmd.data.name, cmd);
}

client.once('ready', () => {
  console.log(`✅ Bot พร้อมใช้งาน: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  const cmd = client.commands.get(interaction.commandName);
  if (!cmd) return;

  if (interaction.isAutocomplete()) {
    if (cmd.autocomplete) await cmd.autocomplete(interaction);
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  try {
    await cmd.execute(interaction);
  } catch (err) {
    console.error(err);
    await interaction.reply({ content: 'เกิด error ครับ', ephemeral: true });
  }
});

client.login(process.env.DISCORD_TOKEN);