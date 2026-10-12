import {
  getRequestToken,
  isSameOrigin,
  revokeAdminSession,
  SESSION_COOKIE,
} from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);

  try {
    await revokeAdminSession(getRequestToken(request));
    const response = Response.json({ ok: true });
    response.headers.append(
      "Set-Cookie",
      `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
    );
    return response;
  } catch (error) {
    console.error("[auth/logout] Session revocation failed.", error);
    return jsonError("Une erreur interne est survenue.", 500);
  }
}
