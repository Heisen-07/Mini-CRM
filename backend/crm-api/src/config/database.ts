// ============================================
// Prisma Singleton (Prisma 7)
// Uses @prisma/adapter-pg for direct PostgreSQL connection
// Reuses one PrismaClient instance across the app
// ============================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "./env";

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;