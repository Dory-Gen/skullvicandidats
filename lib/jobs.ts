import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { Job as DatabaseJob } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { validateFormFields } from "@/lib/validation";
import type { FormField, Job } from "@/lib/types";

function parseJobFields(value: unknown): FormField[] {
  const fields = validateFormFields(value);
  if (!fields) throw new Error("A job has invalid application form fields in the database.");
  return fields;
}

export function mapJob(row: DatabaseJob & { applicationCount?: number }): Job {
  if (row.status !== "draft" && row.status !== "published" && row.status !== "closed") {
    throw new Error("A job has an invalid publication status in the database.");
  }
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    department: row.department,
    location: row.location,
    contractType: row.contractType,
    workMode: row.workMode,
    summary: row.summary,
    description: row.description,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    closingAt: row.closingAt?.toISOString().slice(0, 10) ?? null,
    createdAt: row.createdAt.toISOString(),
    ...(row.applicationCount !== undefined ? { applicationCount: row.applicationCount } : {}),
    fields: parseJobFields(row.formFields),
  };
}

function isOpenJob(now: Date): Prisma.JobWhereInput {
  return {
    status: "published",
    OR: [
      { closingAt: null },
      {
        closingAt: {
          gte: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())),
        },
      },
    ],
  };
}

export async function getPublishedJobs() {
  const rows = await prisma.job.findMany({
    where: isOpenJob(new Date()),
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });
  return rows.map(mapJob);
}

export async function getPublishedJobBySlug(slug: string) {
  const row = await prisma.job.findFirst({
    where: { slug, ...isOpenJob(new Date()) },
  });
  return row ? mapJob(row) : null;
}
