import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { normalizeDatabaseUrl } from "@/lib/database-url";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient() {
  const configuredConnectionString =
    process.env.DATABASE_URL ??
    (process.env.NEXT_PHASE === "phase-production-build"
      ? "postgresql://build:build@localhost:5432/candidatures?schema=public"
      : undefined);
  if (!configuredConnectionString) {
    throw new Error("DATABASE_URL must be configured before using the database.");
  }
  const connectionString = normalizeDatabaseUrl(configuredConnectionString);
  if (!connectionString) {
    throw new Error("DATABASE_URL must be configured before using the database.");
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
