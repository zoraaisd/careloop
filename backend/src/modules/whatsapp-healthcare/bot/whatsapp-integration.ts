/**
 * Supports: Twilio WhatsApp Sandbox + Meta Cloud API (Production)
 */

function normalizePhoneNumber(value: string) {
  const trimmed = String(value || '').trim();
  const withoutPrefix = trimmed.replace(/^whatsapp:/i, '');
  if (!withoutPrefix) {
    return '';
  }

  const digitsOnly = withoutPrefix.replace(/\D/g, '');
  if (!digitsOnly) {
    return '';
  }

  return `+${digitsOnly}`;
}

function formatTwilioWhatsAppAddress(value: string) {
  const normalized = normalizePhoneNumber(value);
  return normalized ? `whatsapp:${normalized}` : '';
}

async function sendTwilioWhatsApp(to: string, message: string, mediaUrl?: string) {
  const twilio = require('twilio');
  const client = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN,
  );
  const toFormatted = formatTwilioWhatsAppAddress(to);
  const fromFormatted = formatTwilioWhatsAppAddress(
    process.env.TWILIO_WHATSAPP_NUMBER || '',
  );

  if (!toFormatted) {
    throw new Error('Recipient WhatsApp number is missing or invalid.');
  }

  if (!fromFormatted) {
    throw new Error('TWILIO_WHATSAPP_NUMBER is missing or invalid.');
  }

  const result = await client.messages.create({
    from: fromFormatted,
    to: toFormatted,
    body: message,
    mediaUrl: mediaUrl ? [mediaUrl] : undefined,
  });
  console.log(`[Twilio WhatsApp Sent] SID: ${result.sid} -> ${to}${mediaUrl ? ' with media' : ''}`);
  return result;
}

async function sendMetaWhatsApp(to: string, message: string) {
  const cleanPhone = normalizePhoneNumber(to).replace(/\D/g, '');
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'text',
        text: { body: message },
      }),
    },
  );
  const data: any = await response.json();
  if (data.error) throw new Error(data.error.message);
  console.log(`[Meta WhatsApp Sent] -> ${to}`);
  return data;
}

export async function sendMetaTemplate(
  to: string,
  templateName: string,
  params: string[] = [],
) {
  const cleanPhone = normalizePhoneNumber(to).replace(/\D/g, '');
  const components =
    params.length > 0
      ? [
          {
            type: 'body',
            parameters: params.map((p) => ({ type: 'text', text: String(p) })),
          },
        ]
      : [];

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components,
        },
      }),
    },
  );
  const data: any = await response.json();
  if (data.error) throw new Error(data.error.message);
  console.log(`[Meta Template "${templateName}" Sent] -> ${to}`);
  return data;
}

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: { id?: string; title: string }[],
) {
  const cleanPhone = normalizePhoneNumber(to).replace(/\D/g, '');
  const response = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'interactive',
        interactive: {
          type: 'button',
          body: { text: bodyText },
          action: {
            buttons: buttons.map((b, i) => ({
              type: 'reply',
              reply: { id: b.id || `btn_${i}`, title: b.title },
            })),
          },
        },
      }),
    },
  );
  const data: any = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function sendSlotList(
  to: string,
  patientName: string,
  slots: { label: string; desc?: string }[],
) {
  const cleanPhone = normalizePhoneNumber(to).replace(/\D/g, '');
  const rows = slots.map((s, i) => ({
    id: `slot_${i}`,
    title: s.label,
    description: s.desc || '',
  }));

  const response = await fetch(
    `https://graph.facebook.com/v21.0/${process.env.META_PHONE_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.META_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: cleanPhone,
        type: 'interactive',
        interactive: {
          type: 'list',
          header: { type: 'text', text: 'Available Slots' },
          body: { text: `Hi ${patientName}, choose your appointment slot:` },
          footer: { text: 'Reply or tap to select' },
          action: {
            button: 'View Slots',
            sections: [
              {
                title: 'Available Times',
                rows,
              },
            ],
          },
        },
      }),
    },
  );
  const data: any = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data;
}

export async function sendWhatsApp(to: string, message: string, mediaUrl?: string) {
  const provider = process.env.WHATSAPP_PROVIDER || 'twilio';
  const normalizedTo = normalizePhoneNumber(to);

  if (!normalizedTo) {
    console.warn('[WhatsApp] No phone number provided');
    return;
  }

  if (provider === 'twilio') {
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !process.env.TWILIO_WHATSAPP_NUMBER
    ) {
      console.warn('[WhatsApp] Twilio env vars missing - message logged only');
      console.log(`[SIMULATED WhatsApp -> ${normalizedTo}]:\n${message}\n${mediaUrl ? `Media: ${mediaUrl}\n` : ''}`);
      return { simulated: true };
    }
    return sendTwilioWhatsApp(normalizedTo, message, mediaUrl);
  }

  if (provider === 'meta') {
    if (!process.env.META_PHONE_ID || !process.env.META_ACCESS_TOKEN) {
      console.warn('[WhatsApp] Meta env vars missing - message logged only');
      console.log(`[SIMULATED WhatsApp -> ${normalizedTo}]:\n${message}\n${mediaUrl ? `Media: ${mediaUrl}\n` : ''}`);
      return { simulated: true };
    }
    return sendMetaWhatsApp(normalizedTo, message); // Meta implementation needs update for media if needed
  }

  console.log(`[SIMULATED WhatsApp -> ${normalizedTo}]:\n${message}\n${mediaUrl ? `Media: ${mediaUrl}\n` : ''}`);
  return { simulated: true };
}
