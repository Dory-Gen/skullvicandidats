import { isSameOrigin, requireAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, isRecord, PayloadTooLargeError, readLimitedBody } from "@/lib/http";
import { mapJob } from "@/lib/jobs";
import { validateDateOnly, validateFormFields } from "@/lib/validation";
import type { JobStatus } from "@/lib/types";

const JOB_STATUSES = new Set<JobStatus>(["draft", "published", "closed"]);
const LIMITS = {
  title: 120,
  department: 80,
  location: 100,
  contractType: 80,
  workMode: 60,
  summary: 240,
  description: 15_000,
} as const;

function validateJob(value: unknown) {
  if (!isRecord(value)) return null;
  const fields: Record<string, string> = {};
  for (const [key, limit] of Object.entries(LIMITS)) {
    const entry = value[key];
    if (typeof entry !== "string" || !entry.trim() || entry.trim().length > limit) return null;
    fields[key] = entry.trim();
  }
  if (typeof value.status !== "string" || !JOB_STATUSES.has(value.status as JobStatus)) {
    return null;
  }
  const formFields = validateFormFields(value.fields);
  if (!formFields || formFields.length === 0) return null;
  const closingAt = validateDateOnly(value.closingAt);
  if (closingAt === undefined) return null;
  return {
    title: fields.title,
    department: fields.department,
    location: fields.location,
    contractType: fields.contractType,
    workMode: fields.workMode,
    summary: fields.summary,
    description: fields.description,
    status: value.status as JobStatus,
    fields: formFields,
    closingAt,
  };
}

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return jsonError("Identifiant d’offre invalide.", 400);
    }
    const body = await readLimitedBody(request, 32_768);
    const input = validateJob(JSON.parse(new TextDecoder().decode(body)));
    if (!input) return jsonError("Vérifiez les informations de l’offre et du formulaire.", 400);

    const existing = await prisma.job.findUnique({
      where: { id },
      select: { publishedAt: true },
    });
    if (!existing) return jsonError("Cette offre n’existe plus.", 404);

    const job = await prisma.job.update({
      where: { id },
      data: {
        title: input.title,
        department: input.department,
        location: input.location,
        contractType: input.contractType,
        workMode: input.workMode,
        summary: input.summary,
        description: input.description,
        status: input.status,
        closingAt: input.closingAt ? new Date(`${input.closingAt}T00:00:00.000Z`) : null,
        formFields: JSON.parse(JSON.stringify(input.fields)) as Prisma.InputJsonValue,
        ...(input.status === "published" && !existing.publishedAt
          ? { publishedAt: new Date() }
          : {}),
      },
    });
    return Response.json({ job: mapJob(job) });
  } catch (error) {
    if (error instanceof PayloadTooLargeError || error instanceof SyntaxError) {
      return jsonError("Corps de requête invalide ou trop volumineux.", 400);
    }
    console.error("[admin/jobs] Job update failed.", error);
    return jsonError("Impossible de mettre à jour l’offre.", 500);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const { id } = await params;
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return jsonError("Identifiant d’offre invalide.", 400);
    }
    const deleted = await prisma.job.deleteMany({
      where: { id, applications: { none: {} } },
    });
    if (deleted.count) return Response.json({ ok: true });

    const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
    if (!job) return jsonError("Cette offre n’existe plus.", 404);
    return jsonError("Une offre avec des candidatures ne peut pas être supprimée.", 409);
  } catch (error) {
    console.error("[admin/jobs] Job deletion failed.", error);
    return jsonError("Impossible de supprimer l’offre.", 500);
  }
}
