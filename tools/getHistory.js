import { whatsapp } from "../routes/wwebjsRoutes";
import { getClient } from "./whatsappClient";

export async function getHistory(id, numerosArray) {
    const userId = id
    const client = getClient(userId)
    if (!client || !client.info || !client.info.wid)
        return res.status(500).json({ success: false, error: "Cliente não conectado ao WhatsApp" })
    const MAX_RETRIES = 3;
    let attempts = 0;

    while (attempts < MAX_RETRIES) {
        try {
            const numeros = numerosArray || []
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

            whatsapp.sendToAll({ type: "history", data: history })
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
}