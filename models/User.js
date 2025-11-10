import { DataTypes, Model } from "sequelize"
import { sequelize } from "../db/index.js"

export class User extends Model {}

User.init({
  username: { type: DataTypes.STRING, allowNull: false, unique: true },
  senha: { type: DataTypes.STRING, allowNull: false }
}, {
  sequelize,
  modelName: 'User'
})
