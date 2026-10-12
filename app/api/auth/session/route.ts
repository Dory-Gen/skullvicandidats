import { getAdminSession, getRequestToken } from "@/lib/auth";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  const token = getRequestToken(request);
  try {
    const admin = await getAdminSession(token);
    if (!admin) return jsonError("Authentification requise.", 401);
    return Response.json({ admin });
  } catch (error) {
    console.error("[auth/session] Session lookup failed.", error);
    return jsonError("Une erreur interne est survenue.", 500);
  }
}
