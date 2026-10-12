import { isSameOrigin, requireAdmin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, isRecord, PayloadTooLargeError, readLimitedBody } from "@/lib/http";
import type { ApplicationStatus, QualificationStatus } from "@/lib/types";

const STATUSES = new Set<ApplicationStatus>([
  "new",
  "reviewing",
  "interview",
  "accepted",
  "rejected",
]);
const QUALIFICATIONS = new Set<QualificationStatus>([
  "to_review",
  "qualified",
  "not_qualified",
]);

function mapAnswers(value: Prisma.JsonValue): Record<string, string> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
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

export async function GET(request: Request) {
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const qualification = searchParams.get("qualification");
    const priority = searchParams.get("priority");
    const sort = searchParams.get("sort") ?? "recent";
    const query = searchParams.get("q")?.trim().slice(0, 100) ?? "";
    const page = Number(searchParams.get("page") ?? "1");
    if (!Number.isSafeInteger(page) || page < 1 || page > 100_000) {
      return jsonError("Numéro de page invalide.", 400);
    }
    const where: Prisma.ApplicationWhereInput = {};
    if (status && status !== "all" && !STATUSES.has(status as ApplicationStatus)) {
      return jsonError("Filtre de statut invalide.", 400);
    }
    if (qualification && qualification !== "all" && !QUALIFICATIONS.has(qualification as QualificationStatus)) {
      return jsonError("Filtre de qualification invalide.", 400);
    }
    if (priority && priority !== "all" && priority !== "true") {
      return jsonError("Filtre de priorité invalide.", 400);
    }
    if (sort !== "recent" && sort !== "score" && sort !== "priority") {
      return jsonError("Classement invalide.", 400);
    }
    if (status && status !== "all") where.status = status;
    if (qualification && qualification !== "all") where.qualification = qualification;
    if (priority === "true") where.priority = true;
    if (query) {
      where.OR = [
        { fullName: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { job: { title: { contains: query, mode: "insensitive" } } },
      ];
    }
    const [total, priorityCount, summary, rows] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.count({ where: { priority: true } }),
      prisma.application.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.application.findMany({
        where,
        select: {
          id: true,
          jobId: true,
          job: { select: { title: true } },
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
        orderBy:
          sort === "recent"
            ? { createdAt: "desc" }
            : sort === "score"
              ? [{ score: { sort: "desc", nulls: "last" } }, { priority: "desc" }, { createdAt: "desc" }]
              : [{ priority: "desc" }, { score: { sort: "desc", nulls: "last" } }, { createdAt: "desc" }],
        skip: (page - 1) * 50,
        take: 50,
      }),
    ]);
    const pending = summary
      .filter((row) => row.status === "new" || row.status === "reviewing")
      .reduce((sum, row) => sum + row._count._all, 0);
    const pageSize = 50;
    return Response.json({
      total,
      summary: {
        total: summary.reduce((sum, row) => sum + row._count._all, 0),
        pending,
        priority: priorityCount,
      },
      page,
      pageSize,
      applications: rows.map((row) => ({
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
      })),
    });
  } catch (error) {
    console.error("[admin/applications] Application list failed.", error);
    return jsonError("Impossible de charger les candidatures.", 500);
  }
}

export async function PATCH(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);
  const admin = await requireAdmin(request);
  if (!admin) return jsonError("Authentification requise.", 401);

  try {
    const body = await readLimitedBody(request, 4_096);
    const payload: unknown = JSON.parse(new TextDecoder().decode(body));
    if (!isRecord(payload) || typeof payload.id !== "string" || !/^[0-9a-f-]{36}$/i.test(payload.id)) {
      return jsonError("Données de candidature invalides.", 400);
    }
    const data: Prisma.ApplicationUpdateManyMutationInput = {};
    if ("status" in payload) {
      if (typeof payload.status !== "string" || !STATUSES.has(payload.status as ApplicationStatus)) {
        return jsonError("Statut de candidature invalide.", 400);
      }
      data.status = payload.status;
    }
    if ("qualification" in payload) {
      if (typeof payload.qualification !== "string" || !QUALIFICATIONS.has(payload.qualification as QualificationStatus)) {
        return jsonError("Qualification invalide.", 400);
      }
      data.qualification = payload.qualification;
    }
    if ("score" in payload) {
      if (
        payload.score !== null &&
        (typeof payload.score !== "number" || !Number.isInteger(payload.score) || payload.score < 0 || payload.score > 100)
      ) {
        return jsonError("La note doit être un nombre entier entre 0 et 100.", 400);
      }
      data.score = payload.score;
    }
    if ("priority" in payload) {
      if (typeof payload.priority !== "boolean") return jsonError("Priorité invalide.", 400);
      data.priority = payload.priority;
    }
    if ("assessmentNotes" in payload) {
      if (typeof payload.assessmentNotes !== "string" || payload.assessmentNotes.length > 4_000) {
        return jsonError("Les notes d’évaluation ne doivent pas dépasser 4 000 caractères.", 400);
      }
      data.assessmentNotes = payload.assessmentNotes.trim();
    }
    if (!Object.keys(data).length) return jsonError("Aucune information à mettre à jour.", 400);
    const updated = await prisma.application.updateMany({
      where: { id: payload.id },
      data,
    });
    if (!updated.count) return jsonError("Cette candidature n’existe plus.", 404);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PayloadTooLargeError || error instanceof SyntaxError) {
      return jsonError("Corps de requête invalide ou trop volumineux.", 400);
    }
    console.error("[admin/applications] Application update failed.", error);
    return jsonError("Impossible de mettre à jour la candidature.", 500);
  }
}
