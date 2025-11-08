import { Pedido } from "../models/Pedido.js"
import { Cliente } from "../models/Cliente.js"

export class PedidoController {
    static async criar(data) {
        return await Pedido.create(data)
    }

    static async listar() {
        return await Pedido.findAll(
            {
                include: [
                    { model: Cliente, as: "cliente" }
                ]
            }
        )
    }

    static async buscarPorId(id) {
        return await Pedido.findByPk(id,
            {
                include: [
                    { model: Cliente, as: "cliente" }
                ]
            }
        )
    }

    static async atualizar(id, data) {
        const pedido = await Pedido.findByPk(id)
        if (!pedido) return null
        return await pedido.update(data)
    }

    static async deletar(id) {
        const pedido = await Pedido.findByPk(id)
        if (!pedido) return null
        await pedido.destroy()
        return true
    }
}
