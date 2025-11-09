import express from "express"
import { connectDB } from "./db/index.js"
import pedidoRoutes from "./routes/pedidoRoutes.js"
import clienteRoutes from "./routes/clienteRoutes.js"
import { WebSocketServer } from "ws"
import { startClient } from "./tools/whatsappClient.js"
import whatsappRoutes from "./routes/wwebjsRoutes.js"
import { whatsappController } from "./controllers/whatsappController.js"
import cors from "cors"
import { sequelize } from "./db/index.js"
import { setupAssociations } from "./models/associations.js"

const app = express()
const port = 3000

app.use(cors())
app.use(express.json())
app.use("/api/pedidos", pedidoRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/whatsapp", whatsappRoutes)
app.use(express.static("public"))

startClient()

const server = app.listen(port, () =>
    console.log(`🚀 Servidor rodando em http://localhost:${port}`)
)

// WebSocket
const wss = new WebSocketServer({ server })
global.clients = []

wss.on("connection", ws => {
    global.clients.push(ws)
    console.log("🔌 Novo cliente conectado. Total:", global.clients.length)

    ws.send(JSON.stringify({ type: "info", message: "Conectado ao WS" }))

    ws.on("message", async msg => {
        try {
            const data = JSON.parse(msg)
            if (data.type === "send-message") {
                try {
                    const sent = await whatsappController.enviarMensagem(data.to, data.message)
                    ws.send(JSON.stringify({ type: "sent", status: sent }))
                } catch (err) {
                    ws.send(JSON.stringify({ type: "error", error: err.message }))
                }
            }
        } catch (err) {
            console.error("Erro ao processar mensagem WS:", err)
        }
    })

    ws.on("close", () => {
        global.clients = global.clients.filter(c => c !== ws)
        console.log("❌ Cliente desconectado. Restantes:", global.clients.length)
    })
})

// Vincula eventos de mensagens do WhatsApp
whatsappController.onMensagem(msg => {
    if (!global.clients.length) return
    const payload = JSON.stringify({ type: "new-message", message: msg })
    for (const c of global.clients) {
        if (c.readyState === c.OPEN) c.send(payload)
    }
})

// conecta DB e sincroniza modelos
await connectDB()
setupAssociations()
await sequelize.sync({ alter: false, force: false })
console.log("📦 Banco sincronizado com sucesso!")
