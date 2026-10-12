import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError } from "@/lib/http";
import { createResumeDownloadUrl } from "@/lib/storage";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return jsonError("Identifiant de candidature invalide.", 400);
    }
    const application = await prisma.application.findUnique({
      where: { id },
      select: { resumeData: true, resumeKey: true, resumeVersionId: true },
    });
    if (!application) return jsonError("Cette candidature n’existe plus.", 404);

    if (application.resumeData) {
      if (new URL(request.url).searchParams.get("download") === "1") {
        return new Response(new Uint8Array(application.resumeData), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="cv-candidature.pdf"',
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }
      const url = `/api/admin/applications/${id}/resume?download=1`;
      return Response.json({ url });
    }

    if (!application.resumeKey) return jsonError("Aucun CV n’est disponible pour cette candidature.", 404);
    const url = await createResumeDownloadUrl(application.resumeKey, application.resumeVersionId);
    return Response.json({ url });
  } catch (error) {
    console.error("[admin/applications/resume] Resume URL creation failed.", error);
    return jsonError("Impossible de préparer le téléchargement du CV.", 500);
  }
}
