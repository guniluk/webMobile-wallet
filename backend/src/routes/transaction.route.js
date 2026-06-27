import { Router } from 'express';
import {
  createTransaction,
  getTransactionByUserId,
  deleteTransaction,
  getTransactionSummary,
} from '../controllers/transaction.controller.js';

const router = Router();

router.get('/:userId', getTransactionByUserId);
router.post('/', createTransaction);
router.delete('/:id', deleteTransaction);
router.get('/summary/:userId', getTransactionSummary);

export default router;
