import { Router } from "express";
import {
  createTransactions,
  getTransactions,
} from "../controllers/transaction.controller.js";

const router = Router();

router.get("/", getTransactions);
router.post("/", createTransactions);

export default router;
