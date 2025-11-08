import { getClient } from "../tools/whatsappClient.js"

class WhatsappController {
    constructor() {
        this.listeners = []
    }

    async enviarMensagem(to, message) {
        const client = getClient()
        if (!client || !client.info || !client.info.wid) {
            throw new Error("Cliente não conectado ao WhatsApp")
        }
        const chatId = to.includes("@c.us") ? to : `${to}@c.us`
        const sent = await client.sendMessage(chatId, message)
        return !!sent
    }

    onMensagem(fn) {
        this.listeners.push(fn)
    }
}

export const whatsappController = new WhatsappController()

// envia mensagens recebidas do cliente para todos listeners
getClient()?.on("message", msg => {
    const data = { from: msg.from, body: msg.body, timestamp: msg.timestamp }
    whatsappController.listeners.forEach(fn => fn(data))
})
