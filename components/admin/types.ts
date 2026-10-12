import type { ApplicationStatus, FormField, JobStatus, QualificationStatus } from "@/lib/types";

export type Admin = { id: string; email: string };

export type AdminApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  answers: Record<string, string>;
  hasResume: boolean;
  status: ApplicationStatus;
  qualification: QualificationStatus;
  score: number | null;
  priority: boolean;
  assessmentNotes: string;
  createdAt: string;
};

export type ApplicationAssessment = Pick<
  AdminApplication,
  "qualification" | "score" | "priority" | "assessmentNotes"
>;

export type JobDraft = {
  title: string;
  department: string;
  location: string;
  contractType: string;
  workMode: string;
  summary: string;
  description: string;
  status: JobStatus;
  closingAt: string;
  fields: FormField[];
};

export type AdminTab = "applications" | "jobs";

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  new: "Nouvelle",
  reviewing: "À étudier",
  interview: "Entretien",
  accepted: "Retenue",
  rejected: "Refusée",
};

export const QUALIFICATION_LABELS: Record<QualificationStatus, string> = {
  to_review: "À qualifier",
  qualified: "Qualifié",
  not_qualified: "Non retenu",
};
