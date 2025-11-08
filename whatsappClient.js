import pkg from "whatsapp-web.js"
import qrcode from "qrcode"
const { Client, LocalAuth } = pkg

let client
let qrDataURL = null

export async function startClient() {
    client = new Client({
        authStrategy: new LocalAuth({ clientId: "api-session" }),
        puppeteer: { headless: true }
    })

    client.on("qr", async qr => {
        qrDataURL = await qrcode.toDataURL(qr)
    })

    client.on("ready", () => {
        console.log("Cliente WhatsApp pronto")
        qrDataURL = null
    })

    client.on("auth_failure", msg => console.log("Falha de autenticação:", msg))
    client.on("disconnected", reason => {
        console.log("Desconectado:", reason)
        client.destroy()
        startClient()
    })

    await client.initialize()
}

export function getClient() {
    return client
}

export function getQr() {
    return qrDataURL
}
