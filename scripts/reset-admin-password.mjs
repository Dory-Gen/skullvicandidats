import { randomBytes, scryptSync } from "node:crypto";
import { prisma } from "./prisma-client.mjs";

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!process.env.DATABASE_URL || !email || !password) {
  throw new Error("DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD are required.");
}
if (password.length < 16 || password.length > 128) {
  throw new Error("ADMIN_PASSWORD must be between 16 and 128 characters.");
}

const salt = randomBytes(16);
const passwordHash = `${salt.toString("hex")}:${scryptSync(password, salt, 64, {
  maxmem: 64 * 1024 * 1024,
}).toString("hex")}`;
try {
  await prisma.$transaction(async (transaction) => {
    const admin = await transaction.admin.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true },
    });
    if (!admin) throw new Error(`No admin account exists for ${email}.`);
    await transaction.admin.update({
      where: { id: admin.id },
      data: { passwordHash },
    });
    await transaction.adminSession.deleteMany({ where: { adminId: admin.id } });
  });
    console.info(`Password updated and active sessions revoked for ${email}.`);
} finally {
  await prisma.$disconnect();
}
