import express from "express"
import { PedidoController } from "../controllers/PedidoController.js"
import { verificarToken } from '../tools/auth.js'


const router = express.Router()

router.get("/", verificarToken, async (req, res) => {
    try {
        const pedidos = await PedidoController.listar()
        res.json({ success: true, data: pedidos })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post("/", verificarToken, async (req, res) => {
    try {
        const novo = await PedidoController.criar(req.body)
        res.status(201).json({ success: true, message: "Pedido criado com sucesso", data: novo })
    } catch (err) {
        res.status(400).json({ success: false, error: err.message })
    }
})

router.get("/:id", verificarToken, async (req, res) => {
    try {
        const pedido = await PedidoController.buscarPorId(req.params.id)
        if (!pedido) return res.status(404).json({ success: false, error: "Pedido não encontrado" })
        res.json({ success: true, data: pedido })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.patch("/:id", verificarToken, async (req, res) => {
    try {
        const pedido = await PedidoController.atualizar(req.params.id, req.body)
        if (!pedido) return res.status(404).json({ success: false, error: "Pedido não encontrado" })
        res.json({ success: true, message: "Pedido atualizado", data: pedido })
    } catch (err) {
        res.status(400).json({ success: false, error: err.message })
    }
})

router.delete("/:id", verificarToken, async (req, res) => {
    try {
        const deletado = await PedidoController.deletar(req.params.id)
        if (!deletado) return res.status(404).json({ success: false, error: "Pedido não encontrado" })
        res.json({ success: true, message: "Pedido removido" })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
