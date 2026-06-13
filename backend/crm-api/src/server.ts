// ============================================
// CRM API Server — Entry Point
// ============================================

import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error.middleware";
import healthRoutes from "./routes/health.routes";
import customerRoutes from "./routes/customer.routes";
import orderRoutes from "./routes/order.routes";
import campaignRoutes from "./routes/campaign.routes";
import receiptRoutes from "./routes/receipt.routes";
import aiRoutes from "./routes/ai.routes";
import analyticsRoutes from "./routes/analytics.routes";

const app = express();

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- Routes ---------------
app.use("/health", healthRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/receipt", receiptRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/analytics", analyticsRoutes);

// --------------- Error Handler ---------------
// Must be registered AFTER all routes
app.use(errorHandler);

// --------------- Start Server ---------------
app.listen(env.PORT, () => {
  console.log(`CRM API running on http://localhost:${env.PORT}`);
});

export default app;