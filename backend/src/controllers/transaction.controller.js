import { sql } from "../config/db.js";

export const getTransactions = async (req, res) => {
  try {
    const result = await sql`
    SELECT * FROM transactions;`;
    res.status(200).send(result);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error getting transactions");
  }
};

export const createTransactions = async (req, res) => {
  try {
    const { user_id, title, amount, category } = req.body;
    if (!user_id || !title || !amount || !category) {
      return res.status(400).send("Missing required fields");
    }
    const result = await sql`
    INSERT INTO transactions (user_id, title, amount, category)
    VALUES (${user_id}, ${title}, ${amount}, ${category})
    RETURNING *;`;
    res.status(201).send(result[0]);
  } catch (error) {
    console.log(error);
    res.status(500).send("Error creating transaction");
  }
};
