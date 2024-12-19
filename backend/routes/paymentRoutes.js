import express from "express";
import { processPayment } from "../controllers/paymentController.js";

const router = express.Router();

// Route: POST /api/payments to process payment
router.post("/", processPayment);

export default router;
