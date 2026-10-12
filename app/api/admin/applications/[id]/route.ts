import { isSameOrigin, requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { jsonError, isRecord } from "@/lib/http";
import { deleteResume } from "@/lib/storage";
import { validateFormFields } from "@/lib/validation";
import { Prisma } from "@/generated/prisma/client";

function mapAnswers(value: Prisma.JsonValue): Record<string, string> {
  if (!isRecord(value)) {
    throw new Error("An application has invalid answers stored in the database.");
  }
  const answers: Record<string, string> = {};
  for (const [key, answer] of Object.entries(value)) {
    if (typeof answer !== "string") {
      throw new Error("An application answer is not stored as text.");
    }
    answers[key] = answer;
  }
  return answers;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return jsonError("Identifiant de candidature invalide.", 400);
    }
    const row = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        jobId: true,
        job: { select: { title: true, formFields: true } },
        fullName: true,
        email: true,
        phone: true,
        answers: true,
        hasResume: true,
        status: true,
        qualification: true,
        score: true,
        priority: true,
        assessmentNotes: true,
        createdAt: true,
      },
    });
    if (!row) return jsonError("Cette candidature n’existe plus.", 404);

    const fields = validateFormFields(row.job.formFields);
    if (!fields) throw new Error("A job has invalid application form fields in the database.");

    return Response.json({
      application: {
        id: row.id,
        jobId: row.jobId,
        jobTitle: row.job.title,
        fullName: row.fullName,
        email: row.email,
        phone: row.phone,
        answers: mapAnswers(row.answers),
        hasResume: row.hasResume,
        status: row.status,
        qualification: row.qualification,
        score: row.score,
        priority: row.priority,
        assessmentNotes: row.assessmentNotes,
        createdAt: row.createdAt,
      },
      fields,
    });
  } catch (error) {
    console.error("[admin/applications] Application detail failed.", error);
    return jsonError("Impossible de charger le détail de la candidature.", 500);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);

  let resumeKey: string | null = null;
  let resumeVersionId: string | null = null;
  try {
    const admin = await requireAdmin(request);
    if (!admin) return jsonError("Authentification requise.", 401);

    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return jsonError("Identifiant de candidature invalide.", 400);
    }
    const found = await prisma.$transaction(async (transaction) => {
      const application = await transaction.application.findUnique({
        where: { id },
        select: { resumeKey: true, resumeVersionId: true },
      });
      if (!application) return false;
      resumeKey = application.resumeKey;
      resumeVersionId = application.resumeVersionId;
      await transaction.application.delete({ where: { id } });
      if (resumeKey) {
        await transaction.storageDeletionQueue.upsert({
          where: { objectKey: resumeKey },
          create: { objectKey: resumeKey, versionId: resumeVersionId },
          update: { versionId: resumeVersionId },
        });
      }
      return true;
    });
    if (!found) return jsonError("Cette candidature n’existe plus.", 404);

    if (resumeKey) {
      try {
        await deleteResume(resumeKey, resumeVersionId);
        await prisma.storageDeletionQueue.deleteMany({ where: { objectKey: resumeKey } });
      } catch (error) {
        console.error("[admin/applications] CV cleanup queued for retry.", error);
        return Response.json({ ok: true, cleanupPending: true }, { status: 202 });
      }
    }
    return Response.json({ ok: true, cleanupPending: false });
  } catch (error) {
    console.error("[admin/applications] Application deletion failed.", error);
    return jsonError("Impossible de supprimer la candidature.", 500);
  }
}
