async function loadConfig() {
  const response = await fetch('/api/ticket-config');
  return response.json();
}

function serializeForm(form) {
  const data = new FormData(form);
  const payload = {
    ticketTitle: data.get('ticketTitle'),
    ticketDescription: data.get('ticketDescription'),
    ticketColor: data.get('ticketColor'),
    ticketButtonLabel: data.get('ticketButtonLabel'),
    ticketCloseButtonLabel: data.get('ticketCloseButtonLabel'),
    ticketFooter: data.get('ticketFooter'),
    ticketBannerUrl: data.get('ticketBannerUrl'),
    ticketFields: []
  };

  try {
    const fields = JSON.parse(data.get('ticketFields') || '[]');
    if (Array.isArray(fields)) {
      payload.ticketFields = fields;
    }
  } catch (error) {
    console.warn('Invalid fields JSON', error);
  }

  return payload;
}

function showStatus(message, isError = false) {
  const status = document.getElementById('status');
  status.textContent = message;
  status.style.color = isError ? 'red' : 'green';
}

window.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('ticket-form');
  const config = await loadConfig();

  form.ticketTitle.value = config.ticketTitle || '';
  form.ticketDescription.value = config.ticketDescription || '';
  form.ticketColor.value = config.ticketColor || '';
  form.ticketButtonLabel.value = config.ticketButtonLabel || '';
  form.ticketCloseButtonLabel.value = config.ticketCloseButtonLabel || '';
  form.ticketFooter.value = config.ticketFooter || '';
  form.ticketBannerUrl.value = config.ticketBannerUrl || '';
  form.ticketFields.value = JSON.stringify(config.ticketFields || [], null, 2);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const payload = serializeForm(form);
    const response = await fetch('/api/ticket-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (data.success) {
      showStatus('Configurazione salvata.');
    } else {
      showStatus('Errore durante il salvataggio.', true);
    }
  });

  document.getElementById('reset-button').addEventListener('click', () => {
    form.reset();
    showStatus('Moduli resettati.');
  });
});
