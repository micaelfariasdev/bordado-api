import { getClient } from "../tools/whatsappClient.js"

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
      console.log("⚠️ Nenhum cliente WS conectado")
      return
    }

    for (const ws of global.clients) {
      if (ws.readyState === ws.OPEN) ws.send(json)
    }

    console.log(`📤 Enviado via WS: ${data.type}`)
  }

  onMensagem(fn) {
    this.listeners.push(fn)
  }

  setupMessageListener() {
    const client = getClient(this.userId)

    if (!client) {
      console.log("⚠️ WhatsApp client ainda não está pronto. Tentando novamente em 2s...")
      setTimeout(() => this.setupMessageListener(), 2000)
      return
    }

    client.on("ready", async () => {
      console.log(`✅ WhatsApp (${this.userId}) conectado`)
    })

    client.on("message", async (msg) => {
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

      console.log(`📩 Nova mensagem recebida de ${this.userId}:`, msg.body)
      this.sendToAll(data)
    })
  }
}
