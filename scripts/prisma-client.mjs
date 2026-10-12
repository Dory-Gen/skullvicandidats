import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required. Set it in .env.local before using the database.");
}

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });
