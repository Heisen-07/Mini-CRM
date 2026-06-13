// ============================================
// Channel Service Server — Entry Point
// ============================================

import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import channelRoutes from "./routes/channel.routes";
import { errorHandler } from "./middleware/error.middleware";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3001", 10);

// --------------- Middleware ---------------
app.use(cors());
app.use(express.json());

// --------------- Routes ---------------
app.use("/", channelRoutes);

// --------------- Error Handler ---------------
// Must be registered AFTER all routes
app.use(errorHandler);

// --------------- Start Server ---------------
app.listen(PORT, () => {
  console.log(`Channel Service running on http://localhost:${PORT}`);
});

export default app;