import express from "express";
const app = express();
app.use(express.json());

import "dotenv/config";
const PORT = process.env.PORT || 5001;

import cors from "cors";
app.use(cors());

import { sql } from "./src/config/db.js";
const initDb = async () => {
  try {
    await sql`CREATE TABLE IF NOT EXISTS transactions (
      id SERIAL PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      amount DECIMAL(10,2) NOT NULL,
      category VARCHAR(255) NOT NULL,
      created_at DATE NOT NULL DEFAULT CURRENT_DATE
    )`;
    console.log("Database initialized");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

import transactionRouter from "./src/routes/transaction.route.js";
app.use("/api/transactions", transactionRouter);

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
  });
});
