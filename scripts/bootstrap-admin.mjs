import { randomUUID, scryptSync, randomBytes } from "node:crypto";
import { prisma } from "./prisma-client.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !password) {
  throw new Error("DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required.");
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  throw new Error("ADMIN_EMAIL must be a valid email address.");
}
if (password.length < 16 || password.length > 128) {
  throw new Error("ADMIN_PASSWORD must be between 16 and 128 characters.");
}

try {
  const existing = await prisma.admin.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw new Error(`An admin with email ${email} already exists; refusing to replace credentials.`);
  }
  const salt = randomBytes(16);
  const passwordHash = `${salt.toString("hex")}:${scryptSync(password, salt, 64, {
    maxmem: 64 * 1024 * 1024,
  }).toString("hex")}`;
  await prisma.admin.create({ data: { id: randomUUID(), email, passwordHash } });
  console.info(`Admin account provisioned for ${email}.`);
} finally {
  await prisma.$disconnect();
}
