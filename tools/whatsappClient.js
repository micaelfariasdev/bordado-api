import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
const { Client, LocalAuth } = pkg;
import puppeteer from 'puppeteer';
const navigate = puppeteer.executablePath();

let activeClients = {};
let qrDataURL = {};

export async function startClient(userId) {
  if (activeClients[userId]) {
    return activeClients[userId];
  }

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `session-${userId}`,
      dataPath: path.resolve('./sessions'),
    }),
    puppeteer: {
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding',
        '--disable-backgrounding-occluded-windows',
      ],
    },
  });

  client.on('qr', async (qr) => {
    qrDataURL[userId] = await qrcode.toDataURL(qr);
  });

  client.on('ready', () => {
    qrDataURL[userId] = null;
    setInterval(async () => {
      const page = client.pupPage;
      if (!page) return;

      try {
        await page.evaluate(() => {
          const event = new MouseEvent('mousemove', { bubbles: true });
          document.dispatchEvent(event);
        });
      } catch (e) {}
    }, 20000);
  });

  client.on('auth_failure', (msg) => console.log('❌ Falha de auth:', msg));

  client.on('disconnected', (reason) => {
    delete activeClients[userId];
  });

  try {
    await client.initialize();
    activeClients[userId] = client;
    return client;
  } catch (err) {
    console.error('Erro ao iniciar:', err.message);
    client.destroy().catch(() => {});
    throw err;
  }
}

export function getClient(userId) {
  return activeClients[userId] || null;
}

export function getQr(userId) {
  return qrDataURL[userId] || null;
}
