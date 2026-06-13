// ============================================
// Xeno CRM — Prisma Config (Prisma 7)
// Connection URLs go here, NOT in schema.prisma
// ============================================

import "dotenv/config";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  earlyAccess: true,
  schema: path.join(__dirname, "prisma", "schema.prisma"),

  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"),
  },

  migrate: {
    async url() {
      return env("DATABASE_URL");
    },
  },
});
