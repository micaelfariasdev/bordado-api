import express from "express"
import { ClienteController } from "../controllers/ClienteController.js"
import { verificarToken } from '../tools/auth.js'

const router = express.Router()

router.get("/", verificarToken,async (req, res) => {
    try {
        const clientes = await ClienteController.listar()
        res.json({ success: true, data: clientes })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.post("/", verificarToken,async (req, res) => {
    try {
        const novo = await ClienteController.criar(req.body)
        res.status(201).json({ success: true, message: "Cliente criado com sucesso", data: novo })
    } catch (err) {
        res.status(400).json({ success: false, error: err.message })
    }
})

router.get("/:id", verificarToken, async (req, res) => {
    try {
        const cliente = await ClienteController.buscarPorId(req.params.id)
        if (!cliente) return res.status(404).json({ success: false, error: "Cliente não encontrado" })
        res.json({ success: true, data: cliente })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

router.patch("/:id", verificarToken, async (req, res) => {
    try {
        const cliente = await ClienteController.atualizar(req.params.id, req.body)
        if (!cliente) return res.status(404).json({ success: false, error: "Cliente não encontrado" })
        res.json({ success: true, message: "Cliente atualizado", data: cliente })
    } catch (err) {
        res.status(400).json({ success: false, error: err.message })
    }
})

router.delete("/:id", verificarToken, async (req, res) => {
    try {
        const deletado = await ClienteController.deletar(req.params.id)
        if (!deletado) return res.status(404).json({ success: false, error: "Cliente não encontrado" })
        res.json({ success: true, message: "Cliente removido" })
    } catch (err) {
        res.status(500).json({ success: false, error: err.message })
    }
})

export default router
