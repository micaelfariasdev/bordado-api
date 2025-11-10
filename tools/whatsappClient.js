import pkg from "whatsapp-web.js"
import qrcode from "qrcode"
const { Client, LocalAuth } = pkg

let client
let qrDataURL = null

export async function startClient(userId) {
    if (client) {
        try { await client.destroy(); } catch { }
    }

    client = new Client({
        authStrategy: new LocalAuth({
      clientId: userId,
      dataPath: './sessions' // cada user terá ./sessions/<userId>/
    }),
        puppeteer: {
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process'
    ],
    timeout: 0
}

    });

    client.on("qr", async qr => qrDataURL = await qrcode.toDataURL(qr));
    client.on("ready", () => { console.log("✅ Cliente pronto"); qrDataURL = null; });
    client.on("auth_failure", msg => console.log("Falha de auth:", msg));
    client.on("disconnected", async reason => {
        console.log("Desconectado:", reason);
        try { await client.destroy(); } catch { }
        setTimeout(startClient, 5000);
    });

    try {
        await client.initialize();
    } catch (err) {
        console.error("Erro ao iniciar:", err.message);
        setTimeout(startClient, 5000);
    }
}


export function getClient() {
    return client;
}

export function getQr() {
    return qrDataURL
}
