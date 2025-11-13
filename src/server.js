import express from "express"
import { connectDB } from "../db/index.js"
import pedidoRoutes from "../routes/pedidoRoutes.js"
import clienteRoutes from "../routes/clienteRoutes.js"
import { WebSocketServer } from "ws"
import whatsappRoutes, { whatsapp } from "../routes/wwebjsRoutes.js"
import cors from "cors"
import { sequelize } from "../db/index.js"
import { setupAssociations } from "../models/associations.js"
import authRoutes from '../routes/authRoutes.js'
import { verificarToken } from '../tools/auth.js'
import jwt from "jsonwebtoken"
import dotenv from 'dotenv'
import { getHistory } from "../tools/getHistory.js"

dotenv.config()

const SECRET = process.env.JWT_SECRET
const app = express()
const port = 3000

console.log(process.env.CORS_ORIGIN)
app.use(cors())

app.use(express.json())
app.use("/api/pedidos", pedidoRoutes)
app.use('/auth', authRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/whatsapp", whatsappRoutes)
app.use(express.static("public"))

app.get('/me', verificarToken, (req, res) => {
    res.json({ user: req.user })
})
let server = app.listen(port, () =>{})
let wsStarted = false

export function startWS() {
    if (wsStarted) {
        return
    }
    wsStarted = true
    const wss = new WebSocketServer({ server })

    if (!global.clients) global.clients = []

    wss.on("connection", (ws, req) => {
        const url = new URL(req.url, `http://${req.headers.host}`)
        const token = url.searchParams.get('token')
        try {
            const decoded = jwt.verify(token, SECRET)
            ws.userId = decoded.id
            global.clients.push(ws)


            ws.send(JSON.stringify({ type: "info", message: "Conectado com sucesso" }))
        } catch (err) {
            ws.close()
            return
        }

        ws.on("message", async msg => {
            try {
                const data = JSON.parse(msg)

                // login inicial
                if (data.type === "login") {
                    whatsapp.onMensagem(m => {
                        ws.send(JSON.stringify({ type: "message", data: m }))
                    })
                    ws.send(JSON.stringify({ type: "status", message: "Cliente iniciado" }))
                }
                
                if (data.type === "get-history") {
                    const { numeros } = data
                    getHistory(ws.userId, numeros)
                    console.log(ws.userId, numeros)
                }

                // enviar mensagem pelo WhatsApp
                if (data.type === "send-message") {
                    const { to, message } = data
                    whatsapp.enviarMensagem(to, message)
                    ws.send(JSON.stringify({ type: "sent", to, message }))
                }
            } catch (err) {
                console.error("Erro WS:", err)
                ws.send(JSON.stringify({ error: err.message }))
            }
        })

        ws.on("close", () => {
            global.clients = global.clients.filter(c => c !== ws)
        })
    })

    // Vincula eventos de mensagens do WhatsApp
    whatsapp.onMensagem(msg => {
        if (!global.clients.length) return
        const payload = JSON.stringify({ type: "new-message", message: msg })
        for (const c of global.clients) {
            if (c.readyState === c.OPEN) c.send(payload)
        }
    })
}

// conecta DB e sincroniza modelos
await connectDB()
setupAssociations()
await sequelize.sync({ alter: false, force: false })
