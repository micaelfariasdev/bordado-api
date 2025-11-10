import express from "express"
import { getClient, getQr, startClient } from "../tools/whatsappClient.js"
import { verificarToken } from '../tools/auth.js'
import { startWS } from "../src/server.js"
import { WhatsappController } from "../controllers/whatsappController.js"

let controller = null

export function getWhatsappController() {
  if (!controller) controller = new WhatsappController()
  return controller
}

export function destroyWhatsappController() {
  controller = null
}


const router = express.Router()

router.get("/login", verificarToken, async (req, res) => {
    try {
        await startClient(req.user.id);
        startWS()
        getWhatsappController() // inicia o WhatsApp APÓS o login
        const client = getClient()
        if (!client) return res.status(500).json({ success: false, error: "Cliente não iniciado" })



        const info = client.info
        if (info?.wid) {
            const ppUrl = await client.getProfilePicUrl(client.info.wid._serialized)

            res.json({ success: true, logged: true, user: info.pushname || info.me.user, profilePic: ppUrl })
        } else if (getQr()) {
            res.json({ success: true, logged: false, qrCode: getQr() })
        } else {
            res.json({ success: true, logged: false, message: "Aguardando QR code" })
        }
    } catch (err) {
        const client = getClient()
        client.destroy()
        await startClient(req.user.id);

        res.status(500).json({ success: false, error: err.message })
    }
})

router.get("/me", verificarToken, async (req, res) => {
    try {
        const client = getClient()
        if (!client) return res.status(500).json({ success: false, error: "Cliente não iniciado" })



        const info = client.info
        if (info?.wid) {
            const ppUrl = await client.getProfilePicUrl(client.info.wid._serialized)

            res.json({ success: true, logged: true, user: info.pushname || info.me.user, Número: info.wid.user, profilePic: ppUrl })
        } else {
            res.json({ success: true, logged: false, message: "Você não está logado, faça o login" })
        }
    } catch (err) {
        await startClient(req.user.id);


        res.status(500).json({ success: false, error: err.message })
    }
})

router.get('/reload', verificarToken, async (req, res) => {
    const client = getClient()
    client.destroy().then(() => client.initialize());
    res.json({ success: true, message: "Reiniciando cliente WhatsApp" })
})

router.post("/logout", verificarToken, async (req, res) => {
    const client = getClient()
    if (!client) return res.status(500).json({ success: false, error: "Cliente não iniciado" })

    try {
        await client.logout()
        res.json({ success: true, message: "Logout realizado" })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})


router.post("/historico", verificarToken, async (req, res) => {
    const client = getClient()
    if (!client || !client.info || !client.info.wid)
        return res.status(500).json({ success: false, error: "Cliente não conectado ao WhatsApp" })
    const MAX_RETRIES = 3;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            const numeros = req.body.numeros || []
            attempts++;
            const ultimos8 = numeros
                .filter(Boolean)
                .map(n => String(n).replace(/\D/g, ""))
                .map(n => n.slice(-8))

            const chats = await client.getChats()
            const history = []

            for (const chat of chats) {
                const chatNum = chat.id.user
                const chatUltimos8 = chatNum.slice(-8)

                if (!ultimos8.includes(chatUltimos8)) continue

                const messages = await chat.fetchMessages({ limit: 50 })
                const contact = await chat.getContact()
                const recentes = await Promise.all(messages.slice(-30).map(async (m) => {
                    if (m.hasMedia) {
                        try {
                            const media = await m.downloadMedia()
                            return {
                                type: "message",
                                from: m.from,
                                body: m.body || "",
                                me: m.fromMe,
                                timestamp: m.timestamp,
                                mimetype: media?.mimetype,
                                data: media?.data,
                                hasMedia: true
                            }
                        } catch {
                            return {
                                type: "message",
                                from: m.from,
                                body: m.body || "",
                                me: m.fromMe,
                                timestamp: m.timestamp,
                                hasMedia: false
                            }
                        }
                    } else {
                        return {
                            type: "message",
                            from: m.from,
                            body: m.body,
                            me: m.fromMe,
                            timestamp: m.timestamp,
                            hasMedia: false
                        }
                    }
                }))

                if (recentes.length > 0 && chat.name) {

                    const contactPincture = await contact.getProfilePicUrl()
                    history.push({
                        chat: chat.name,
                        chatId: chat.id._serialized,
                        pictureContact: contactPincture,
                        mensagens: recentes
                    })
                }
            }

            whatsappController.sendToAll({ type: "history", data: history })
            res.json({ success: true, sent: true, count: history.length, chats: chats })
            break;

        } catch (err) {
            console.warn(`Erro na tentativa ${attempts}:`, err.message);

            try {
                await client.destroy();
                await client.initialize();
            } catch (reconnectErr) {
                console.error("Erro ao reconectar o cliente:", reconnectErr.message);
            }

            if (attempts >= MAX_RETRIES) {
                console.error("Erro ao enviar histórico:", err);
                return res.status(500).json({ success: false, error: err.message });
            }

            await new Promise(r => setTimeout(r, 5000));
        }
    }
})





export default router
