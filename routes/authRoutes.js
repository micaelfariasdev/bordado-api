import express from 'express'
import bcrypt from 'bcryptjs'
import { gerarToken } from '../tools/auth.js'
import { User } from '../models/User.js'

const router = express.Router()

router.post('/register', async (req, res) => {
    const { username, senha } = req.body
    const existente = await User.findOne({ where: { username } })
    if (existente) return res.status(400).json({ error: 'Usuário já existe' })

    const hash = await bcrypt.hash(senha, 10)
    const user = await User.create({ username, senha: hash })
    res.json({ token: gerarToken(user) })
})

router.post('/login', async (req, res) => {
    const { username, senha } = req.body
    const user = await User.findOne({ where: { username } })
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado' })

    const valido = await bcrypt.compare(senha, user.senha)
    if (!valido) return res.status(400).json({ error: 'Senha incorreta' })


    res.json({ token: gerarToken(user) })
})

export default router
