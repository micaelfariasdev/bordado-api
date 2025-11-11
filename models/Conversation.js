import { DataTypes, Model } from "sequelize"
import { sequelize } from "../db/index.js"

export class Conversation extends Model {}

Conversation.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  stage: {
    type: DataTypes.JSON, // para armazenar dados do estágio
    allowNull: false,
  },
  lastInteraction: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  }
}, {
  sequelize,
  modelName: "conversation",
  tableName: "conversations",
  timestamps: false,
});
