import { Cliente } from "./Cliente.js"
import { Pedido } from "./Pedido.js"

export function setupAssociations() {
  Cliente.hasMany(Pedido, {
    foreignKey: {
      name: "clienteId",
      allowNull: false,
    },
    as: "pedidos"
  })

  Pedido.belongsTo(Cliente, {
    foreignKey: {
      name: "clienteId",
      allowNull: false,
    },
    as: "cliente"
  })
}
