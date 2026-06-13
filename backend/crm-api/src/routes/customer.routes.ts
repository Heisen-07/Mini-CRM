// ============================================
// Customer Routes
// GET  /api/customers      → list all customers
// GET  /api/customers/:id  → get customer by ID
// POST /api/customers      → create new customer
// ============================================

import { Router, Request, Response } from "express";
import { sendSuccess, sendError } from "../utils/response";
import {
  getAllCustomers,
  getCustomerById,
  createCustomer,
} from "../services/customer.service";

const router = Router();

// Get all customers
router.get("/", async (_req: Request, res: Response) => {
  try {
    const customers = await getAllCustomers();
    sendSuccess(res, {
      count: customers.length,
      data: customers,
    });
  } catch (error) {
    sendError(res, "Failed to fetch customers");
  }
});

// Get customer by ID
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const customer = await getCustomerById(req.params.id as string);

    if (!customer) {
      sendError(res, "Customer not found", 404);
      return;
    }

    sendSuccess(res, { data: customer });
  } catch (error) {
    sendError(res, "Failed to fetch customer");
  }
});

// Create customer
router.post("/", async (req: Request, res: Response) => {
  try {
    const { name, email, phone, city } = req.body;

    // Validate required fields
    if (!name || !email) {
      sendError(res, "Name and email are required", 400);
      return;
    }

    const customer = await createCustomer({ name, email, phone, city });
    sendSuccess(res, { data: customer }, 201);
  } catch (error: any) {
    // Prisma unique constraint violation (duplicate email)
    if (error.code === "P2002") {
      sendError(res, "A customer with this email already exists", 400);
      return;
    }

    sendError(res, "Failed to create customer");
  }
});

export default router;