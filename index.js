const fs = require('fs');
const path = require('path');
const express = require('express');
const { Client, GatewayIntentBits, Partials, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');
require('dotenv').config();

const CONFIG_PATH = path.join(__dirname, 'ticket-config.json');
const TICKET_CONFIG = loadTicketConfig();
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;
const TICKET_CATEGORY_ID = process.env.TICKET_CATEGORY_ID;
const SUPPORT_ROLE_ID = process.env.SUPPORT_ROLE_ID;
const TICKET_LOG_CHANNEL_ID = process.env.TICKET_LOG_CHANNEL_ID;
const PORT = process.env.PORT || 3000;

if (!DISCORD_TOKEN) {
  console.error('Missing DISCORD_TOKEN in environment variables.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!message.guild) return;

  const args = message.content.trim().split(/\s+/);
  const command = args.shift().toLowerCase();

  if (command === '!ticket-panel') {
    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageGuild)) {
      return message.reply('Devi avere il permesso di gestione del server per usare questo comando.');
    }
    const embed = buildTicketEmbed();
    const button = new ButtonBuilder()
      .setCustomId('open_ticket')
      .setLabel(TICKET_CONFIG.ticketButtonLabel || 'Apri ticket')
      .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents(button);
    await message.channel.send({ embeds: [embed], components: [row] });
    return message.reply('Pannello ticket inviato.');
  }

  if (command === '!ticket') {
    return createTicketChannel(message.member, message.channel, message.guild);
  }

  if (command === '!close') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply('Questo comando può essere usato solo all'interno di un canale ticket.');
    }
    await message.reply('Ticket chiuso, il canale verrà eliminato tra 10 secondi.');
    setTimeout(() => {
      message.channel.delete().catch(() => null);
    }, 10000);
  }

  if (command === '!lookup') {
    const query = args.join(' ');
    if (!query) return message.reply('Usa `!lookup <username o id>`');
    return lookupRobloxUser(message, query);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;
  if (interaction.customId !== 'open_ticket') return;

  await createTicketChannel(interaction.member, interaction.channel, interaction.guild, interaction);
});

async function createTicketChannel(member, channel, guild, interaction) {
  const categoryId = TICKET_CATEGORY_ID;
  if (!categoryId) {
    return channel.send('La variabile TICKET_CATEGORY_ID non è configurata.');
  }

  const category = guild.channels.cache.get(categoryId);
  if (!category) {
    return channel.send('Categoria ticket non trovata. Controlla TICKET_CATEGORY_ID.');
  }

  const ticketName = `ticket-${member.user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const ticketChannel = await guild.channels.create({
    name: ticketName,
    type: 0,
    parent: category,
    permissionOverwrites: [
      {
        id: guild.roles.everyone,
        deny: [PermissionsBitField.Flags.ViewChannel]
      },
      {
        id: member.id,
        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory]
      }
    ]
  });

  if (SUPPORT_ROLE_ID) {
    ticketChannel.permissionOverwrites.create(SUPPORT_ROLE_ID, {
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true
    });
  }

  const embed = buildTicketEmbed();
  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel(TICKET_CONFIG.ticketCloseButtonLabel || 'Chiudi ticket')
    .setStyle(ButtonStyle.Danger);

  const row = new ActionRowBuilder().addComponents(closeButton);
  await ticketChannel.send({ content: `${member}`, embeds: [embed], components: [row] });

  if (interaction && interaction.isButton()) {
    await interaction.reply({ content: `Canale creato: ${ticketChannel}`, ephemeral: true });
  }

  if (TICKET_LOG_CHANNEL_ID) {
    const logChannel = guild.channels.cache.get(TICKET_LOG_CHANNEL_ID);
    if (logChannel) {
      logChannel.send(`Nuovo ticket creato: ${ticketChannel} da ${member.user.tag}`);
    }
  }
}

function buildTicketEmbed() {
  const embed = new EmbedBuilder()
    .setTitle(TICKET_CONFIG.ticketTitle || 'Apri un ticket')
    .setDescription(TICKET_CONFIG.ticketDescription || 'Premi il bottone per aprire un ticket.')
    .setColor(TICKET_CONFIG.ticketColor || '#0099ff')
    .setFooter({ text: TICKET_CONFIG.ticketFooter || 'Genova-Bot' });

  if (TICKET_CONFIG.ticketBannerUrl) {
    embed.setImage(TICKET_CONFIG.ticketBannerUrl);
  }

  if (Array.isArray(TICKET_CONFIG.ticketFields)) {
    embed.addFields(TICKET_CONFIG.ticketFields.map((field) => ({
      name: field.name || 'Field',
      value: field.value || 'N/A',
      inline: field.inline || false
    })));
  }

  return embed;
}

async function lookupRobloxUser(message, query) {
  try {
    const id = Number(query);
    const endpoint = id ? `https://users.roblox.com/v1/users/${id}` : `https://api.roblox.com/users/get-by-username?username=${encodeURIComponent(query)}`;
    const response = await fetch(endpoint);
    const data = await response.json();

    if (data.errors || data.errorMessage || !data.Id && !data.id) {
      return message.reply('Utente Roblox non trovato.');
    }

    const userId = data.Id || data.id;
    await message.reply(`Roblox user found: ${data.Username || data.username} (ID: ${userId})`);
  } catch (error) {
    console.error(error);
    message.reply('Errore durante la ricerca di Roblox.');
  }
}

function loadTicketConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    console.warn('Impossibile leggere ticket-config.json, uso valori di default.');
    return {};
  }
}

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/ticket-config', (req, res) => {
  res.json(TICKET_CONFIG);
});

app.post('/api/ticket-config', (req, res) => {
  const incoming = req.body;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(incoming, null, 2));
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`Dashboard listening on port ${PORT}`);
});

client.login(DISCORD_TOKEN).catch((error) => {
  console.error('Errore login Discord:', error);
  process.exit(1);
});
