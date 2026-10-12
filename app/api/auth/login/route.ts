import { createAdminSession, isSameOrigin, SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, PayloadTooLargeError, readLimitedBody } from "@/lib/http";
import { verifyPassword } from "@/lib/password";
import { clearRateLimit, consumeRateLimit } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);

  try {
    const limited = await consumeRateLimit(request, "admin-login", 10, 900, 900);
    if (limited) return jsonError("Trop de tentatives. Réessayez dans 15 minutes.", 429);

    const body = await readLimitedBody(request, 8_192);
    const payload: unknown = JSON.parse(new TextDecoder().decode(body));
    if (
      typeof payload !== "object" ||
      payload === null ||
      typeof (payload as Record<string, unknown>).email !== "string" ||
      typeof (payload as Record<string, unknown>).password !== "string"
    ) {
      return jsonError("Adresse e-mail ou mot de passe invalide.", 400);
    }

    const { email, password } = payload as { email: string; password: string };
    const normalizedEmail = email.trim().toLowerCase();
    if (normalizedEmail.length > 254 || password.length > 128) {
      return jsonError("Adresse e-mail ou mot de passe invalide.", 400);
    }

    const admin = await prisma.admin.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      select: { id: true, passwordHash: true },
    });
    const valid = await verifyPassword(
      password,
      admin?.passwordHash ?? `${"0".repeat(32)}:${"0".repeat(128)}`,
    );
    if (!admin || !valid) return jsonError("Adresse e-mail ou mot de passe invalide.", 401);

    await clearRateLimit(request, "admin-login");
    const session = await createAdminSession(admin.id);
    const response = Response.json({ ok: true });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=${session.token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    if (error instanceof PayloadTooLargeError || error instanceof SyntaxError) {
      return jsonError("Corps de requête invalide ou trop volumineux.", 400);
    }
    console.error("[auth/login] Authentication request failed.", error);
    return jsonError("Une erreur interne est survenue.", 500);
  }
}
