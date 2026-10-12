export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select";

export type FormField = {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  options?: string[];
};

export type JobStatus = "draft" | "published" | "closed";
export type ApplicationStatus =
  | "new"
  | "reviewing"
  | "interview"
  | "accepted"
  | "rejected";
export type QualificationStatus = "to_review" | "qualified" | "not_qualified";

export type Job = {
  id: string;
  slug: string;
  title: string;
  department: string;
  location: string;
  contractType: string;
  workMode: string;
  summary: string;
  description: string;
  status: JobStatus;
  publishedAt: string | null;
  closingAt: string | null;
  createdAt: string;
  applicationCount?: number;
  fields?: FormField[];
};

export type Application = {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  answers: Record<string, string>;
  resumeKey: string | null;
  status: ApplicationStatus;
  createdAt: string;
};

export const DEFAULT_FORM_FIELDS: FormField[] = [
  { id: "full_name", label: "Nom complet", type: "text", required: true },
  { id: "email", label: "Adresse e-mail", type: "email", required: true },
  { id: "phone", label: "Téléphone", type: "phone", required: true },
  {
    id: "motivation",
    label: "Quelques mots sur votre motivation",
    type: "textarea",
    required: true,
  },
];
