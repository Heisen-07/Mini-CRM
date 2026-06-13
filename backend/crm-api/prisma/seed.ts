// ============================================
// Database Seed Script
// Populates CRM with realistic demo data
// Run: npx ts-node prisma/seed.ts
// ============================================

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ============================================
// Data pools
// ============================================

const FIRST_NAMES = [
  "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun",
  "Reyansh", "Sai", "Arnav", "Dhruv", "Kabir",
  "Ananya", "Diya", "Myra", "Sara", "Aadhya",
  "Isha", "Kiara", "Riya", "Anvi", "Priya",
  "Rohan", "Kunal", "Nikhil", "Rahul", "Amit",
  "Sneha", "Pooja", "Neha", "Kavya", "Meera",
  "Vikram", "Suresh", "Rajesh", "Deepak", "Manish",
  "Sunita", "Rekha", "Pallavi", "Swati", "Nisha",
  "Harsh", "Yash", "Dev", "Karan", "Ishaan",
  "Tanvi", "Shruti", "Jaya", "Ritika", "Simran",
];

const LAST_NAMES = [
  "Sharma", "Patel", "Gupta", "Singh", "Kumar",
  "Reddy", "Nair", "Joshi", "Verma", "Mehta",
  "Iyer", "Rao", "Das", "Chopra", "Malhotra",
  "Bhat", "Pillai", "Shah", "Desai", "Menon",
  "Agarwal", "Chauhan", "Pandey", "Mishra", "Thakur",
];

const CITIES = [
  "Mumbai", "Mumbai", "Mumbai",         // weighted heavier
  "Delhi", "Delhi", "Delhi",
  "Bangalore", "Bangalore",
  "Pune", "Pune",
  "Hyderabad", "Hyderabad",
  "Chennai", "Chennai",
  "Kolkata",
  "Ahmedabad",
];

const CATEGORIES = ["Electronics", "Fashion", "Books", "Home", "Sports"];

// ============================================
// Helpers
// ============================================

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randAmount(): number {
  // Weighted: more orders in the 500-5000 range, fewer big ones
  const roll = Math.random();
  if (roll < 0.5) return randInt(500, 3000);
  if (roll < 0.8) return randInt(3000, 8000);
  return randInt(8000, 20000);
}

function randomDate(daysAgoMin: number, daysAgoMax: number): Date {
  const daysAgo = randInt(daysAgoMin, daysAgoMax);
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(randInt(8, 22), randInt(0, 59), randInt(0, 59));
  return date;
}

function generatePhone(): string {
  return `9${randInt(100000000, 999999999)}`;
}

// ============================================
// Seed
// ============================================

async function seed() {
  console.log("🌱 Starting database seed...\n");

  // Clear existing data (order matters for foreign keys)
  console.log("  Clearing existing data...");
  await prisma.communicationEvent.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.order.deleteMany();
  await prisma.customer.deleteMany();
  console.log("  ✓ Cleared\n");

  // Track used emails to avoid duplicates
  const usedEmails = new Set<string>();

  // Generate 50 customers
  console.log("  Creating 50 customers...");
  const customers: Array<{
    id: string;
    name: string;
    city: string;
  }> = [];

  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i];
    const lastName = pick(LAST_NAMES);
    const name = `${firstName} ${lastName}`;
    const city = pick(CITIES);

    // Generate unique email
    let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    let suffix = 1;
    while (usedEmails.has(email)) {
      email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${suffix}@example.com`;
      suffix++;
    }
    usedEmails.add(email);

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: generatePhone(),
        city,
        totalSpend: 0,
        orderCount: 0,
        lastPurchaseDate: null,
        createdAt: randomDate(30, 180), // joined 1-6 months ago
      },
    });

    customers.push({ id: customer.id, name: customer.name, city: customer.city! });
  }
  console.log("  ✓ 50 customers created\n");

  // Generate orders with varied distribution
  // Some customers get 0 orders (inactive), some get 1-5
  console.log("  Creating orders...");
  let totalOrders = 0;

  for (const customer of customers) {
    // Weighted order count: ~10 customers get 0, rest get 1-5
    const roll = Math.random();
    let orderCount: number;
    if (roll < 0.15) orderCount = 0;        // 15% inactive
    else if (roll < 0.35) orderCount = 1;    // 20% light
    else if (roll < 0.60) orderCount = 2;    // 25% moderate
    else if (roll < 0.80) orderCount = 3;    // 20% active
    else if (roll < 0.93) orderCount = 4;    // 13% heavy
    else orderCount = 5;                      //  7% power users

    let totalSpend = 0;
    let lastPurchaseDate: Date | null = null;

    for (let j = 0; j < orderCount; j++) {
      const amount = randAmount();
      // Orders spread over last 1-90 days, more recent orders more likely
      const orderDate = randomDate(1, 90);

      await prisma.order.create({
        data: {
          customerId: customer.id,
          amount,
          productCategory: pick(CATEGORIES),
          orderDate,
          createdAt: orderDate,
        },
      });

      totalSpend += amount;
      if (!lastPurchaseDate || orderDate > lastPurchaseDate) {
        lastPurchaseDate = orderDate;
      }
      totalOrders++;
    }

    // Update customer statistics to match orders
    await prisma.customer.update({
      where: { id: customer.id },
      data: {
        totalSpend,
        orderCount,
        lastPurchaseDate,
      },
    });
  }
  console.log(`  ✓ ${totalOrders} orders created\n`);

  // Print summary
  console.log("📊 Seed Summary");
  console.log("================");

  const customerCount = await prisma.customer.count();
  const orderCount = await prisma.order.count();
  console.log(`  Customers: ${customerCount}`);
  console.log(`  Orders:    ${orderCount}`);

  // City distribution
  const cities = await prisma.customer.groupBy({
    by: ["city"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
  });
  console.log("\n  City Distribution:");
  for (const c of cities) {
    console.log(`    ${c.city}: ${c._count.id} customers`);
  }

  // Spending tiers
  const highSpenders = await prisma.customer.count({ where: { totalSpend: { gt: 10000 } } });
  const midSpenders = await prisma.customer.count({ where: { totalSpend: { gt: 3000, lte: 10000 } } });
  const lowSpenders = await prisma.customer.count({ where: { totalSpend: { gt: 0, lte: 3000 } } });
  const noSpend = await prisma.customer.count({ where: { totalSpend: 0 } });
  console.log("\n  Spending Tiers:");
  console.log(`    High (>10K):  ${highSpenders}`);
  console.log(`    Mid (3K-10K): ${midSpenders}`);
  console.log(`    Low (<3K):    ${lowSpenders}`);
  console.log(`    Inactive (0): ${noSpend}`);

  // Activity
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeRecent = await prisma.customer.count({
    where: { lastPurchaseDate: { gt: thirtyDaysAgo } },
  });
  const inactive = await prisma.customer.count({
    where: {
      OR: [
        { lastPurchaseDate: null },
        { lastPurchaseDate: { lt: thirtyDaysAgo } },
      ],
    },
  });
  console.log("\n  Activity:");
  console.log(`    Active (last 30d): ${activeRecent}`);
  console.log(`    Inactive:          ${inactive}`);

  console.log("\n✅ Seed complete!");
}

seed()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
