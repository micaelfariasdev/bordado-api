import { DataTypes, Model } from "sequelize"
import { sequelize } from "../db/index.js"
import { Pedido } from "./Pedido.js"

export class Cliente extends Model {}

Cliente.init({
  nomeCliente: { type: DataTypes.STRING, allowNull: false },
  numeroCliente: { type: DataTypes.NUMBER, allowNull: false },
  dataCreate: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
}, {
  sequelize,
  modelName: "Cliente"
})
 
