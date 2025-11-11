import { Sequelize } from "sequelize"

export const sequelize = new Sequelize({
  dialect: "sqlite",
  storage: "./db/database.sqlite",
  logging: false
})

export async function connectDB() {
  try {
    await sequelize.authenticate()
  } catch (err) {
    console.error("❌ Erro no banco:", err)
  }
}
