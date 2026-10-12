import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export const SESSION_COOKIE = "candidatures_session";
const SESSION_LIFETIME_HOURS = 8;

export type AdminUser = { id: string; email: string };

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createAdminSession(adminId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_LIFETIME_HOURS * 60 * 60 * 1000);
  await prisma.adminSession.create({
    data: { tokenHash: hashSessionToken(token), adminId, expiresAt },
  });
  return { token, expiresAt };
}

export async function getAdminSession(token: string | undefined): Promise<AdminUser | null> {
  if (!token || token.length > 128) return null;

  return prisma.adminSession.findFirst({
    where: {
      tokenHash: hashSessionToken(token),
      expiresAt: { gt: new Date() },
    },
    select: {
      admin: { select: { id: true, email: true } },
    },
  }).then((session) => session?.admin ?? null);
}

export async function getAdminFromCookies(): Promise<AdminUser | null> {
  const cookieStore = await cookies();
  return getAdminSession(cookieStore.get(SESSION_COOKIE)?.value);
}

export function getRequestToken(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const pair = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${SESSION_COOKIE}=`));
  return pair?.slice(SESSION_COOKIE.length + 1);
}

export async function requireAdmin(request: Request) {
  return getAdminSession(getRequestToken(request));
}

export async function revokeAdminSession(token: string | undefined) {
  if (!token || token.length > 128) return;
  await prisma.adminSession.deleteMany({
    where: { tokenHash: hashSessionToken(token) },
  });
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;

  try {
    const parsedOrigin = new URL(origin);
    const forwardedProtocol = request.headers
      .get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim()
      .toLowerCase();
    const expectedProtocol = forwardedProtocol
      ? `${forwardedProtocol}:`
      : new URL(request.url).protocol;
    return parsedOrigin.host === host && parsedOrigin.protocol === expectedProtocol;
  } catch {
    return false;
  }
}
