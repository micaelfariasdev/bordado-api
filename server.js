import express from "express"
import { connectDB } from "./db/index.js"
import pedidoRoutes from "./routes/pedidoRoutes.js"
import clienteRoutes from "./routes/clienteRoutes.js"
import { WebSocketServer } from "ws"
import { startClient } from "./tools/whatsappClient.js"
import whatsappRoutes from "./routes/wwebjsRoutes.js"
import { whatsappController } from "./controllers/whatsappController.js"
import cors from "cors"

const app = express()
const port = 3000

let client

app.use(cors())
app.use(express.json())
app.use("/api/pedidos", pedidoRoutes)
app.use("/api/clientes", clienteRoutes)
app.use("/api/whatsapp", whatsappRoutes)
app.use(express.static("public"))



startClient()

const server = app.listen(port, () => console.log(`Servidor rodando em http://localhost:${port}`))

// WebSocket
const wss = new WebSocketServer({ server })
let clients = []

wss.on("connection", ws => {
    clients.push(ws)
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
        } catch {}
    })

    ws.on("close", () => clients = clients.filter(c => c !== ws))
})

// Receber mensagens do WhatsApp e enviar para todos WS conectados
whatsappController.onMensagem(msg => {
    clients.forEach(c => {
        if (c.readyState === c.OPEN) {
            c.send(JSON.stringify({ type: "new-message", message: msg }))
        }
    })
})

// conecta DB e sincroniza modelos
await connectDB()

import { sequelize } from "./db/index.js"
import { Pedido } from "./models/Pedido.js"
import { setupAssociations } from "./models/associations.js"

setupAssociations()

await sequelize.sync({ alter: false, force: false })
console.log("📦 Banco sincronizado com sucesso!")
