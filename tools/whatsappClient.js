import pkg from 'whatsapp-web.js';
import qrcode from 'qrcode';
import path from 'path';
import { getStage, setStage } from './TrilhaBot.js';
const { Client, LocalAuth } = pkg;

let activeClients = {};
let qrDataURL = {};

export async function startClient(userId) {
  if (activeClients[userId]) return activeClients[userId];

  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `session-${userId}`,
      dataPath: path.resolve('./sessions'),
    }),
    puppeteer: {
      executablePath: '/usr/bin/chromium-browser',
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
      ],
    },
  });

  client.on('qr', async (qr) => {
    qrDataURL[userId] = await qrcode.toDataURL(qr);
  });

  client.on('message_create', async (msg) => {
    if (!msg.fromMe) return;

    const isBotMessage = msg.id.id.startsWith("false_");

    if (!isBotMessage) {
      const userId = msg.to;
      let state = (await getStage(userId)) || {
          userId,
          currentStage: 1,
          data: {},
        };

       state.currentStage ='exit' 
      await setStage(userId, state);
    }
    console.log(state, msg)
  });


  client.on('ready', () => {
    qrDataURL[userId] = null;


    setInterval(async () => {
      try {
        await client.sendPresenceAvailable();
      } catch { }
    }, 1000 * 60 * 5);

  });

  client.on('auth_failure', (msg) => console.log('Auth Failure:', msg));
  client.on('disconnected', () => delete activeClients[userId]);

  try {
    await client.initialize();
    activeClients[userId] = client;
    console.log('Cliente iniciado');
    return client;
  } catch (err) {
    console.error('Erro ao iniciar:', err.message);
    client.destroy().catch(() => { });
    throw err;
  }
}

export function getClient(userId) {
  return activeClients[userId] || null;
}

export function getQr(userId) {
  return qrDataURL[userId] || null;
}
