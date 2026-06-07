const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ButtonBuilder,
  ActionRowBuilder,
  ButtonStyle,
  PermissionsBitField,
  ChannelType
} = require('discord.js');
const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const ticketCategoryId = process.env.TICKET_CATEGORY_ID;
const ticketLogChannelId = process.env.TICKET_LOG_CHANNEL_ID;
const supportRoleId = process.env.SUPPORT_ROLE_ID;
const dashboardPort = process.env.DASHBOARD_PORT || 3000;
const ticketConfigPath = path.join(__dirname, 'ticket-config.json');

if (!token) {
  console.error('Missing DISCORD_TOKEN in environment. Create a .env file with DISCORD_TOKEN=your_token');
  process.exit(1);
}

const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/api/ticket-config', async (req, res) => {
  const config = await loadTicketConfig();
  res.json(config);
});

app.post('/api/ticket-config', async (req, res) => {
  try {
    const config = await saveTicketConfig(req.body);
    res.json(config);
  } catch (error) {
    res.status(500).json({ error: 'Impossibile salvare la configurazione.' });
  }
});

app.listen(dashboardPort, () => {
  console.log(`Dashboard disponibile su http://localhost:${dashboardPort}/dashboard`);
});

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
});

const defaultTicketConfig = {
  ticketTitle: '🎫 Sistema Ticket',
  ticketDescription: 'Clicca il pulsante qui sotto per aprire un ticket. Il nostro staff ti risponderà il prima possibile.',
  ticketColor: '#0099ff',
  ticketFields: [
    {
      name: 'Come funziona',
      value: 'Premi **Apri Ticket** per creare un canale privato per assisterti.',
      inline: false
    },
    {
      name: 'Supporto',
      value: 'Il team di supporto risponderà qui.',
      inline: false
    }
  ],
  ticketButtonLabel: 'Apri Ticket',
  ticketCloseButtonLabel: 'Chiudi Ticket',
  ticketFooter: 'Ticket system personalizzato',
  ticketBannerUrl: ''
};

async function loadTicketConfig() {
  try {
    const data = await fs.readFile(ticketConfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return defaultTicketConfig;
  }
}

async function saveTicketConfig(config) {
  const merged = { ...defaultTicketConfig, ...config };
  await fs.writeFile(ticketConfigPath, JSON.stringify(merged, null, 2), 'utf8');
  return merged;
}

function buildTicketEmbed(config) {
  const embed = new EmbedBuilder()
    .setTitle(config.ticketTitle)
    .setDescription(config.ticketDescription)
    .setColor(config.ticketColor)
    .addFields(config.ticketFields);

  if (config.ticketBannerUrl) {
    embed.setImage(config.ticketBannerUrl);
  }

  if (config.ticketFooter) {
    embed.setFooter({ text: config.ticketFooter });
  }

  return embed;
}

function buildCreatedEmbed(config, user) {
  const embed = new EmbedBuilder()
    .setTitle('Ticket aperto ✅')
    .setDescription(`Ciao ${user.username}, il tuo ticket è stato creato. Qui puoi scrivere la tua richiesta.`)
    .setColor('#00ff00')
    .addFields(
      { name: 'Chiusura', value: `Usa il pulsante **${config.ticketCloseButtonLabel}** per chiudere il ticket.`, inline: false },
      { name: 'Staff', value: supportRoleId ? `<@&${supportRoleId}>` : 'Staff disponibile', inline: false }
    );

  if (config.ticketBannerUrl) {
    embed.setImage(config.ticketBannerUrl);
  }

  if (config.ticketFooter) {
    embed.setFooter({ text: config.ticketFooter });
  }

  return embed;
}

const closeEmbed = new EmbedBuilder()
  .setTitle('🛑 Chiusura Ticket')
  .setDescription('Premi il pulsante qui sotto per chiudere questo ticket. Il canale sarà eliminato automaticamente.')
  .setColor('#ff0000');

async function lookupRobloxUser(query) {
  const isId = /^\d+$/.test(query);
  let url;

  if (isId) {
    url = `https://users.roblox.com/v1/users/${query}`;
  } else {
    url = `https://users.roblox.com/v1/users/by-username?username=${encodeURIComponent(query)}`;
  }

  const response = await fetch(url);
  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  if (!data || data.errors) {
    return null;
  }

  return data;
}

async function createTicketChannel(interactionOrMessage) {
  const guild = interactionOrMessage.guild;
  const user = interactionOrMessage.user || interactionOrMessage.author;

  if (!guild) return null;
  if (!ticketCategoryId) {
    return null;
  }

  const config = await loadTicketConfig();

  const channelName = `ticket-${user.username.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const existingChannel = guild.channels.cache.find(
    (channel) => channel.name === channelName && channel.parentId === ticketCategoryId
  );

  if (existingChannel) return existingChannel;

  const permissionOverwrites = [
    {
      id: guild.roles.everyone,
      deny: [PermissionsBitField.Flags.ViewChannel]
    },
    {
      id: user.id,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    }
  ];

  if (supportRoleId) {
    permissionOverwrites.push({
      id: supportRoleId,
      allow: [
        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages,
        PermissionsBitField.Flags.ReadMessageHistory
      ]
    });
  }

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: ticketCategoryId,
    permissionOverwrites,
    reason: `Ticket aperto da ${user.tag || user.username}`
  });

  const createdEmbed = buildCreatedEmbed(config, user);

  const closeButton = new ButtonBuilder()
    .setCustomId('close_ticket')
    .setLabel(config.ticketCloseButtonLabel)
    .setStyle(ButtonStyle.Danger);

  await channel.send({
    content: `${user} benvenuto nel tuo ticket!`,
    embeds: [createdEmbed],
    components: [new ActionRowBuilder().addComponents(closeButton)]
  });

  if (ticketLogChannelId) {
    const logChannel = guild.channels.cache.get(ticketLogChannelId);
    if (logChannel && logChannel.isTextBased()) {
      logChannel.send({
        content: `🎫 Ticket creato: ${channel} da ${user.tag || user.username}`
      });
    }
  }

  return channel;
}

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.guild) return;

  const content = message.content.trim().toLowerCase();

  if (content === '!ping') {
    return message.reply('Pong!');
  }

  if (content === '!hello') {
    return message.reply(`Ciao, ${message.author.username}!`);
  }

  if (content.startsWith('!lookup')) {
    const args = message.content.trim().split(/\s+/).slice(1);
    if (!args.length) {
      return message.reply('Uso: `!lookup <username o id Roblox>`');
    }

    const query = args.join(' ');
    const userData = await lookupRobloxUser(query);
    if (!userData) {
      return message.reply('Utente Roblox non trovato. Controlla l\'ID o il nome utente e riprova.');
    }

    const lookupEmbed = new EmbedBuilder()
      .setTitle('Roblox Lookup')
      .setColor('#ff4500')
      .addFields(
        { name: 'ID', value: String(userData.id), inline: true },
        { name: 'Nome utente', value: userData.name || 'N/A', inline: true },
        { name: 'DisplayName', value: userData.displayName || 'N/A', inline: true },
        { name: 'Creato il', value: userData.created ? new Date(userData.created).toLocaleString('it-IT') : 'N/A', inline: true },
        { name: 'Descrizione', value: userData.description || 'Nessuna descrizione', inline: false }
      );

    return message.channel.send({ embeds: [lookupEmbed] });
  }

  if (content === '!ticket-panel') {
    const config = await loadTicketConfig();
    const button = new ButtonBuilder()
      .setCustomId('create_ticket')
      .setLabel(config.ticketButtonLabel)
      .setStyle(ButtonStyle.Primary);

    return message.channel.send({
      embeds: [buildTicketEmbed(config)],
      components: [new ActionRowBuilder().addComponents(button)]
    });
  }

  if (content === '!ticket') {
    const ticketChannel = await createTicketChannel(message);
    if (!ticketChannel) {
      return message.reply('Impossibile creare il ticket. Controlla la configurazione del canale ticket nel file .env.');
    }

    return message.reply(`Ticket creato: ${ticketChannel}`);
  }

  if (content === '!close') {
    if (!message.channel.name.startsWith('ticket-')) {
      return message.reply("Questo comando può essere usato solo all'interno di un canale ticket.");
    }

    await message.reply('Il ticket verrà chiuso in 5 secondi.');
    setTimeout(async () => {
      try {
        await message.channel.delete('Ticket chiuso');
      } catch (error) {
        console.error('Impossibile eliminare il canale ticket:', error);
      }
    }, 5000);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isButton()) return;

  if (interaction.customId === 'create_ticket') {
    await interaction.deferReply({ ephemeral: true });
    const ticketChannel = await createTicketChannel(interaction);

    if (!ticketChannel) {
      return interaction.editReply('Errore: non posso creare il ticket. Controlla il file .env.');
    }

    return interaction.editReply(`Ho creato il tuo ticket: ${ticketChannel}`);
  }

  if (interaction.customId === 'close_ticket') {
    if (!interaction.channel || !interaction.channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: 'Questo pulsante può essere usato solo nel canale ticket.', ephemeral: true });
    }

    await interaction.reply({ content: 'Questo ticket verrà chiuso in 5 secondi.', ephemeral: true });

    setTimeout(async () => {
      try {
        await interaction.channel.delete('Ticket chiuso');
      } catch (error) {
        console.error('Impossibile eliminare il canale ticket:', error);
      }
    }, 5000);
  }
});

client.login(token).catch((error) => {
  console.error('Failed to login:', error);
});
