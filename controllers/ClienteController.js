import { Pedido } from "../models/Pedido.js"
import { Cliente } from "../models/Cliente.js"


export class ClienteController {
    static async criar(data) {
        return await Cliente.create(data)
    }

    static async listar() {
        return await Cliente.findAll()
    }

    static async buscarPorId(id) {
        return await Cliente.findByPk(id, {
            include: [
                {
                    model: Pedido,
                    as: "pedidos",
                    attributes: [  "nomeProduto", "precoUnt", "quantidade"]
                }
            ]
        })
    }


    static async atualizar(id, data) {
        const cliente = await Cliente.findByPk(id)
        if (!cliente) return null
        return await cliente.update(data)
    }

    static async deletar(id) {
        const cliente = await Cliente.findByPk(id)
        if (!cliente) return null
        await cliente.destroy()
        return true
    }
}