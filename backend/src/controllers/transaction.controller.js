import { sql } from '../config/db.js';
import { asyncHandler } from '../utils/asyncHandler.js';

/**
 * Get all transactions for a specific user
 */
export const getTransactionByUserId = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const result = await sql`
    SELECT * FROM transactions WHERE user_id = ${userId} ORDER BY created_at DESC;`;
  res.status(200).send(result);
});

/**
 * Add a new transaction
 */
export const createTransaction = asyncHandler(async (req, res) => {
  const { user_id, title, amount, category } = req.body;
  if (!user_id || !title || !amount || !category) {
    const error = new Error('Missing required fields');
    error.statusCode = 400;
    throw error;
  }
  const result = await sql`
    INSERT INTO transactions (user_id, title, amount, category)
    VALUES (${user_id}, ${title}, ${amount}, ${category})
    RETURNING *;`;
  res.status(201).send(result[0]);
});

/**
 * Delete a transaction
 */
export const deleteTransaction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (isNaN(id) || parseInt(id) <= 0) {
    const error = new Error('Invalid transaction ID');
    error.statusCode = 400;
    throw error;
  }
  const result = await sql`
    DELETE FROM transactions WHERE id = ${id} RETURNING *;`;

  if (result.length === 0) {
    const error = new Error('Transaction not found');
    error.statusCode = 404;
    throw error;
  }
  res.status(200).json({ message: 'Deleted successfully' });
});

/**
 * Get transaction summary (income, expense, net)
 */
export const getTransactionSummary = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const [result] = await sql`
    SELECT 
      SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END) AS income,
      ABS(SUM(CASE WHEN amount < 0 THEN amount ELSE 0 END)) AS expense
    FROM transactions
    WHERE user_id = ${userId};`;

  const income = parseFloat(result?.income || 0);
  const expenses = parseFloat(result?.expense || 0);
  const balance = income - expenses;

  res.status(200).json({ income, expenses, balance });
});
