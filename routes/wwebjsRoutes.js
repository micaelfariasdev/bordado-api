import express from "express"
import { getClient, getQr } from "../whatsappClient.js"

const router = express.Router()

router.get("/login", async (req, res) => {
    const client = getClient()
    if (!client) return res.status(500).json({ success: false, error: "Cliente não iniciado" })

    const info = client.info
    if (info?.wid) {
        res.json({ success: true, logged: true, user: info.pushname || info.me.user })
    } else if (getQr()) {
        res.json({ success: true, logged: false, qrCode: getQr() })
    } else {
        res.json({ success: true, logged: false, message: "Aguardando QR code" })
    }
})

router.post("/logout", async (req, res) => {
    const client = getClient()
    if (!client) return res.status(500).json({ success: false, error: "Cliente não iniciado" })
    try {
        await client.logout()
        res.json({ success: true, message: "Logout realizado" })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
