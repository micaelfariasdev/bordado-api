import { Pedido } from '../models/Pedido.js';
import { Cliente } from '../models/Cliente.js';

export class ClienteController {
  static async criar(data) {
    return await Cliente.create(data);
  }

  static async listar() {
    return await Cliente.findAll({
      include: [
        {
          model: Pedido,
          as: 'pedidos',
          attributes: ['id', 'nomeProduto', 'status'],
        },
      ],
    });
  }

  static async buscarPorNumeroCliente(numeroCliente) {
    return await Cliente.findOne({
      where: {
        numeroCliente: numeroCliente, // Condição de busca
      },
      include: [
        {
          model: Pedido,
          as: 'pedidos',
          attributes: ['nomeProduto', 'precoUnt', 'quantidade'],
        },
      ],
    });
  }

  static async buscarPorId(id) {
    return await Cliente.findByPk(id, {
      include: [
        {
          model: Pedido,
          as: 'pedidos',
          attributes: ['nomeProduto', 'precoUnt', 'quantidade'],
        },
      ],
    });
  }

  static async atualizar(id, data) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    return await cliente.update(data);
  }

  static async deletar(id) {
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return null;
    await cliente.destroy();
    return true;
  }
}
