import { randomUUID } from "node:crypto";
import { isSameOrigin } from "@/lib/auth";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, PayloadTooLargeError, readLimitedBody } from "@/lib/http";
import { consumeRateLimit } from "@/lib/rate-limit";
import { validateApplicationAnswers, validateFormFields } from "@/lib/validation";
import type { FormField } from "@/lib/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const MAX_REQUEST_BYTES = MAX_UPLOAD_BYTES + 64 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return jsonError("Requête non autorisée.", 403);
  if (!request.headers.get("content-type")?.startsWith("multipart/form-data;")) {
    return jsonError("Format de candidature invalide.", 415);
  }

  try {
    if (await consumeRateLimit(request, "public-application", 16, 3_600, 3_600)) {
      return jsonError("Trop de candidatures envoyées. Réessayez plus tard.", 429);
    }
    const body = await readLimitedBody(request, MAX_REQUEST_BYTES);
    const formRequest = new Request(request.url, {
      method: "POST",
      headers: request.headers,
      body,
    });
    let form: FormData;
    try {
      form = await formRequest.formData();
    } catch {
      return jsonError("Le formulaire de candidature est mal formé.", 400);
    }
    const slug = form.get("jobSlug");
    const answersValue = form.get("answers");
    const resume = form.get("resume");
    if (
      typeof slug !== "string" ||
      !/^[a-z0-9-]{1,80}$/.test(slug) ||
      typeof answersValue !== "string" ||
      !(resume instanceof File)
    ) {
      return jsonError("Les champs requis ou le CV sont manquants.", 400);
    }

    let answers: unknown;
    try {
      answers = JSON.parse(answersValue);
    } catch {
      return jsonError("Le contenu du formulaire est invalide.", 400);
    }

    const today = new Date();
    const job = await prisma.job.findFirst({
      where: {
        slug,
        status: "published",
        OR: [
          { closingAt: null },
          { closingAt: { gte: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) } },
        ],
      },
      select: { id: true, formFields: true },
    });
    if (!job) return jsonError("Cette offre n’est plus ouverte aux candidatures.", 404);

    const fields: FormField[] | null = validateFormFields(job.formFields);
    if (!fields) {
      throw new Error("A published job has invalid application form fields in the database.");
    }
    const submittedAnswers = validateApplicationAnswers(fields, answers);
    if (!submittedAnswers) {
      return jsonError("Certains champs sont manquants ou invalides.", 400);
    }

    if (
      resume.size < 8 ||
      resume.size > MAX_UPLOAD_BYTES ||
      !resume.name.toLowerCase().endsWith(".pdf") ||
      resume.type !== "application/pdf"
    ) {
      return jsonError("Le CV doit être un fichier PDF de 8 Mo maximum.", 400);
    }
    const resumeBytes = Buffer.from(await resume.arrayBuffer());
    if (resumeBytes.length !== resume.size || resumeBytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return jsonError("Le fichier joint n’est pas un PDF valide.", 400);
    }

    const fullName = submittedAnswers.full_name;
    const email = submittedAnswers.email.toLowerCase();
    const phone = submittedAnswers.phone;
    if (!fullName || fullName.length > 160 || !email || email.length > 254 || !phone || phone.length > 40) {
      return jsonError("Vérifiez votre nom, votre adresse e-mail et votre téléphone.", 400);
    }

    const applicationId = randomUUID();
    await prisma.application.create({
      data: {
        id: applicationId,
        jobId: job.id,
        fullName,
        email,
        phone,
        answers: JSON.parse(JSON.stringify(submittedAnswers)) as Prisma.InputJsonValue,
        resumeData: resumeBytes,
        hasResume: true,
      },
    });

    return Response.json({ ok: true }, { status: 201 });
  } catch (error) {
    if (error instanceof PayloadTooLargeError) {
      return jsonError("Le CV dépasse la taille maximale de 8 Mo.", 413);
    }
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return jsonError("Une candidature a déjà été envoyée pour cette offre avec cette adresse e-mail.", 409);
    }
    console.error("[public/applications] Submission failed.", error);
    return jsonError("Votre candidature n’a pas pu être enregistrée. Réessayez plus tard.", 500);
  }
}
