import { DataTypes, Model } from "sequelize"
import { sequelize } from "../db/index.js"
import { Cliente } from "./Cliente.js"

export class Pedido extends Model {}

Pedido.init({
  nomeProduto: { type: DataTypes.STRING, allowNull: false, defaultValue: "Produto desconhecido"  },
  dataRecebimento: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  dataEntrega: { type: DataTypes.DATE, allowNull: false },
  descricao: { type: DataTypes.STRING },
  quantidade: { type: DataTypes.INTEGER, defaultValue: 0 },
  precoUnt: { type: DataTypes.FLOAT, defaultValue: 0 },
  pago: { type: DataTypes.BOOLEAN, defaultValue: false },
  formaPagamento: { type: DataTypes.ENUM('pix', 'credito', 'debito', 'dinheiro'), defaultValue: 'dinheiro' }
}, {
  sequelize,
  modelName: "Pedido"
})


 