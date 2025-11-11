import pkg from "whatsapp-web.js"
import qrcode from "qrcode"
import path from "path"
const { Client, LocalAuth } = pkg

let activeClients = {}
let qrDataURL = {}

export async function startClient(userId) {
    if (activeClients[userId]) {
        console.log(`⚠️ Cliente ${userId} já ativo`)
        return activeClients[userId]
    }

    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: `session-${userId}`,
            dataPath: path.resolve("./sessions")
        }),
        puppeteer: {
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-gpu",
                "--disable-dev-shm-usage",
                "--disable-extensions",
                "--no-zygote",
                "--single-process"
            ]
        }
    })

    client.on("qr", async qr => {
        qrDataURL[userId] = await qrcode.toDataURL(qr)
        console.log(`📲 QR gerado para ${userId}`)
    })

    client.on("ready", () => {
        console.log(`✅ WhatsApp conectado (${userId})`)
        qrDataURL[userId] = null
    })

    client.on("auth_failure", msg => console.log("❌ Falha de auth:", msg))

    client.on("disconnected", reason => {
        console.log(`⚠️ ${userId} desconectado:`, reason)
        delete activeClients[userId]
    })

    try {
        await client.initialize()
        activeClients[userId] = client
        return client
    } catch (err) {
        console.error("Erro ao iniciar:", err.message)
        client.destroy().catch(() => { })
        throw err
    }
}

export function getClient(userId) {
    return activeClients[userId] || null
}

export function getQr(userId) {
    return qrDataURL[userId] || null
}
