// ============================================
// Order Routes
// GET  /api/orders  → list all orders
// POST /api/orders  → create new order
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import { getAllOrders, createOrder } from "../services/order.service";

const router = Router();

// Get all orders
router.get("/", async (_req: Request, res: Response) => {
  try {
    const orders = await getAllOrders();
    sendSuccess(res, {
      count: orders.length,
      data: orders,
    });
  } catch (error) {
    sendError(res, "Failed to fetch orders");
  }
});

// Create order
router.post("/", async (req: Request, res: Response) => {
  try {
    const { customerId, amount, productCategory } = req.body;

    // Validate required fields
    if (!customerId || amount === undefined || amount === null) {
      sendError(res, "customerId and amount are required", 400);
      return;
    }

    if (typeof amount !== "number" || amount <= 0) {
      sendError(res, "amount must be a positive number", 400);
      return;
    }

    const order = await createOrder({ customerId, amount, productCategory });

    if (!order) {
      sendError(res, "Customer not found", 404);
      return;
    }

    sendSuccess(res, { data: order }, 201);
  } catch (error) {
    sendError(res, "Failed to create order");
  }
});

export default router;