import { getClient } from "../tools/whatsappClient.js"
import { Conversation } from "../models/Conversation.js";

export async function getStage(userId) {
  const conv = await Conversation.findOne({ where: { userId } });
  if (!conv) return null;

  const oneHour = 60 * 60 * 1000;
  const expired = new Date().getTime() - new Date(conv.lastInteraction).getTime() > oneHour;

  if (expired) {
    await conv.destroy();
    return null;
  }

  return conv.stage;
}

export async function setStage(userId, stageData) {
  const [conv, created] = await Conversation.findOrCreate({
    where: { userId },
    defaults: { stage: stageData, lastInteraction: new Date() },
  });

  if (!created) {
    conv.stage = stageData;
    conv.lastInteraction = new Date();
    await conv.save();
  }
}


export class WhatsappController {
  constructor(userId, clients = []) {
    this.userId = userId
    this.clients = clients
    this.listeners = []
    this.setupMessageListener()
  }



  async enviarMensagem(to, message) {
    const client = getClient(this.userId)
    if (!client || !client.info || !client.info.wid)
      throw new Error("Cliente não conectado ao WhatsApp")

    const numberId = await client.getNumberId(to)
    if (!numberId) throw new Error("Número inválido ou não encontrado")

    const sent = await client.sendMessage(numberId._serialized, message)
    return !!sent
  }

  sendToAll(data) {
    const json = JSON.stringify(data)
    if (!global.clients || global.clients.length === 0) {
      return
    }

    for (const ws of global.clients) {
      if (ws.readyState === ws.OPEN) ws.send(json)
    }

  }

  onMensagem(fn) {
    this.listeners.push(fn)
  }

  setupMessageListener() {

    const client = getClient(this.userId)

    if (!client) {
      setTimeout(() => this.setupMessageListener(), 2000)
      return
    }

    client.on("ready", async () => {
    })

    client.on("message", async (msg) => {
      const userId = msg.from;
      let state = await getStage(userId) || { userId, currentStage: 1, data: {} };

      const userMessage = msg.body.toLowerCase().trim();

      switch (state.currentStage) {
        case 1:
          if (userMessage.includes("iniciar") || userMessage.includes("oi") || userMessage.includes("olá")) {
            await this.enviarMensagem(userId, "Olá! Qual produto você quer consultar?");
            state.currentStage = 2;
          } else {
            await this.enviarMensagem(userId, "Para começar, digite 'INICIAR'");
            return
          }
          break;
        case 2:
          state.data.nomeProduto = msg.body;
          await this.enviarMensagem(userId, `Qual o CPF/CNPJ para buscar ${state.data.nomeProduto}?`);
          state.currentStage = 3;
          break;
        // ... continue os stages
      }

      await setStage(userId, state);



      let data
      if (msg.hasMedia) {
        const media = await msg.downloadMedia()
        data = {
          type: "message",
          from: msg.from,
          body: msg.body || "",
          me: msg.fromMe,
          timestamp: msg.timestamp,
          mimetype: media.mimetype,
          data: media.data,
          hasMedia: true
        }
      } else {
        data = {
          type: "message",
          from: msg.from,
          body: msg.body,
          me: msg.fromMe,
          timestamp: msg.timestamp
        }
      }

      this.sendToAll(data)
    })
  }
}
