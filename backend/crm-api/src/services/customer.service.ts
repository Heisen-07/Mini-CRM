// ============================================
// Customer Service
// Business logic for customer operations
// Uses Prisma directly — no repository layer
// ============================================

import prisma from "../config/database";

export async function getAllCustomers() {
  return prisma.customer.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getCustomerById(id: string) {
  return prisma.customer.findUnique({
    where: { id },
  });
}

export async function createCustomer(data: {
  name: string;
  email: string;
  phone?: string;
  city?: string;
}) {
  return prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      city: data.city,
    },
  });
}