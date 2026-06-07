# Genova-Bot

Bot Discord con sistema ticket, dashboard e lookup Roblox.

## Installazione

1. Installa le dipendenze:

```bash
npm install
```

2. Crea un file `.env` nella root:

```env
DISCORD_TOKEN=tuo_token_discord
TICKET_CATEGORY_ID=id_categoria_ticket
SUPPORT_ROLE_ID=id_ruolo_supporto
TICKET_LOG_CHANNEL_ID=id_canale_log
TICKET_BANNER_URL=https://example.com/banner.png
```

3. Avvia il bot:

```bash
npm start
```

## Comandi Discord

- `!ticket-panel` - invia un pannello ticket
- `!ticket` - crea direttamente un ticket
- `!close` - chiude il ticket corrente
- `!lookup <username o id>` - cerca un utente Roblox

## Dashboard

Visita `http://localhost:3000/dashboard` per modificare il pannello ticket.

## Note

- Assicurati che il bot abbia i permessi `Manage Channels` e `View Channels`.
- Imposta `DISCORD_TOKEN` su Railway come variabile d'ambiente.
