import { AutoBot } from '../tools/TrilhaBot.js';
import { getClient } from '../tools/whatsappClient.js';

export class WhatsappController {
  constructor(userId, clients = []) {
    this.userId = userId;
    this.clients = clients;
    this.listeners = [];
    this.setupMessageListener();
  }

  sendToAll(data) {
    const json = JSON.stringify(data);
    if (!global.clients || global.clients.length === 0) {
      return;
    }

    for (const ws of global.clients) {
      if (ws.readyState === ws.OPEN) ws.send(json);
    }
  }

  async enviarMensagem(to, message) {
    const client = getClient(this.userId);
    if (!client || !client.info || !client.info.wid)
      throw new Error('Cliente não conectado ao WhatsApp');

    const numberId = await client.getNumberId(to);
    if (!numberId) throw new Error('Número inválido ou não encontrado');
    const chat = await client.getChatById(numberId._serialized);

    // simula "digitando..."
    await chat.sendStateTyping();
    await chat.clearState();

    const sent = await client.sendMessage(numberId._serialized, message);
    return !!sent;
  }



  onMensagem(fn) {
    this.listeners.push(fn);
  }

  setupMessageListener() {
    const client = getClient(this.userId);
    if (!client) {
      setTimeout(() => this.setupMessageListener(), 2000);
      return;
    }

    client.once('ready', () => {
      const startTime = Math.floor(Date.now() / 1000);
      client.on('message', async (msg) => {
        if (msg.timestamp < startTime) return;
        AutoBot(msg);

        let data = {
          type: 'message',
          from: msg.from,
          body: msg.body || '',
          me: msg.fromMe,
          timestamp: msg.timestamp,
        };

        if (msg.hasMedia) {
          const media = await msg.downloadMedia();
          data = { ...data, mimetype: media.mimetype, data: media.data, hasMedia: true };
        }

        this.sendToAll(data);
      });
    });
  }

}
