# Genova-Bot
Bot Discord con sistema ticket e lookup Roblox

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the project root:

```env
DISCORD_TOKEN=your_bot_token_here
TICKET_CATEGORY_ID=category_id_here
SUPPORT_ROLE_ID=support_role_id_here
TICKET_LOG_CHANNEL_ID=log_channel_id_here
TICKET_BANNER_URL=https://example.com/banner.png
```

3. Run the bot:

```bash
npm start
```

## Ticket System

Usa questi comandi nel server Discord:

- `!ticket-panel` - invia un pannello con un embed e un pulsante per aprire ticket
- `!ticket` - crea un ticket direttamente
- `!close` - chiude il ticket corrente (usalo dal canale ticket)
- `!lookup <username o id>` - cerca informazioni su un utente Roblox

## Dashboard di personalizzazione

Apri il browser su:

```bash
http://localhost:3000/dashboard
```

Da lì puoi personalizzare:

- titolo del pannello ticket
- descrizione
- colore embed
- pulsante ticket
- pulsante chiusura
- footer
- banner

## Configurazione

- `TICKET_CATEGORY_ID` deve essere l'ID della categoria che conterrà i canali ticket
- `SUPPORT_ROLE_ID` è il ruolo che vede i ticket e può rispondere
- `TICKET_LOG_CHANNEL_ID` è facoltativo, usalo per ricevere notifiche di creazione ticket
- `TICKET_BANNER_URL` è l'immagine mostrata negli embed del ticket

## Note

- Assicurati che il bot abbia i permessi `Manage Channels` e `View Channels`.
- Abilita `Message Content Intent` nel Discord Developer Portal se necessario.

