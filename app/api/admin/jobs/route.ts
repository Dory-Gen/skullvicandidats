import { randomUUID } from "node:crypto";
import { requireAdmin, isSameOrigin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, isRecord, PayloadTooLargeError, readLimitedBody } from "@/lib/http";
import { mapJob } from "@/lib/jobs";
import { validateDateOnly, validateFormFields } from "@/lib/validation";
import type { JobStatus } from "@/lib/types";

const JOB_STATUSES = new Set<JobStatus>(["draft", "published", "closed"]);
const JOB_TEXT_LIMITS = {
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
  const text: Record<string, string> = {};
  for (const [key, limit] of Object.entries(JOB_TEXT_LIMITS)) {
    const item = value[key];
    if (typeof item !== "string" || !item.trim() || item.trim().length > limit) return null;
    text[key] = item.trim();
  }
  if (typeof value.status !== "string" || !JOB_STATUSES.has(value.status as JobStatus)) {
    return null;
  }
  const fields = validateFormFields(value.fields);
  if (!fields || fields.length === 0) return null;
  const closingAt = validateDateOnly(value.closingAt);
  if (closingAt === undefined) return null;
  return {
    title: text.title,
    department: text.department,
    location: text.location,
    contractType: text.contractType,
    workMode: text.workMode,
    summary: text.summary,
    description: text.description,
    status: value.status as JobStatus,
    fields,
    closingAt,
  };
}

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const result = await prisma.job.findMany({
      include: { _count: { select: { applications: true } } },
      orderBy: { createdAt: "desc" },
    });
    return Response.json({
      jobs: result.map((job) =>
        mapJob({ ...job, applicationCount: job._count.applications }),
      ),
    });
  } catch (error) {
    console.error("[admin/jobs] Job list failed.", error);
    return jsonError("Impossible de charger les offres.", 500);
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const body = await readLimitedBody(request, 32_768);
    const input = validateJob(JSON.parse(new TextDecoder().decode(body)));
    if (!input) return jsonError("Vérifiez les informations de l’offre et du formulaire.", 400);

    const titleSlug = input.title
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 48);
    const slug = `${titleSlug || "offre"}-${randomUUID().slice(0, 8)}`;
    const job = await prisma.job.create({
      data: {
        id: randomUUID(),
        slug,
        title: input.title,
        department: input.department,
        location: input.location,
        contractType: input.contractType,
        workMode: input.workMode,
        summary: input.summary,
        description: input.description,
        status: input.status,
        publishedAt: input.status === "published" ? new Date() : null,
        closingAt: input.closingAt ? new Date(`${input.closingAt}T00:00:00.000Z`) : null,
        formFields: JSON.parse(JSON.stringify(input.fields)) as Prisma.InputJsonValue,
      },
    });
    return Response.json({ job: mapJob(job) }, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError || error instanceof SyntaxError) {
      return jsonError("Corps de requête invalide ou trop volumineux.", 400);
    }
    console.error("[admin/jobs] Job creation failed.", error);
    return jsonError("Impossible d’enregistrer l’offre.", 500);
  }
}
