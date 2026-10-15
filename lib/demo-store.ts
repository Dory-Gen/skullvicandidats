import type { ApplicationStatus, FormField, Job, JobStatus } from "@/lib/types";
import { DEFAULT_FORM_FIELDS } from "@/lib/types";

const DATABASE_NAME = "kora-talent-demo";
const DATABASE_VERSION = 1;
const JOBS_STORE = "jobs";
const APPLICATIONS_STORE = "applications";
const CHANGE_EVENT = "kora-demo-data-changed";

export type DemoApplication = {
  id: string;
  jobId: string;
  jobTitle: string;
  fullName: string;
  email: string;
  phone: string;
  answers: Record<string, string>;
  status: ApplicationStatus;
  createdAt: string;
  resumeName: string;
  resume: Blob;
};

export type DemoJobInput = {
  title: string;
  department: string;
  location: string;
  contractType: string;
  workMode: string;
  summary: string;
  description: string;
  status: JobStatus;
  closingAt: string | null;
  fields: FormField[];
};

type StoredJob = Job & { fields: FormField[] };
type StoredApplication = DemoApplication;

let databasePromise: Promise<IDBDatabase> | undefined;

function demoJob(): StoredJob {
  const now = new Date().toISOString();
  return {
    id: "demo-job",
    slug: "chargee-de-recrutement-demo",
    title: "Chargé·e de recrutement",
    department: "Ressources humaines",
    location: "Paris",
    contractType: "CDI",
    workMode: "Hybride",
    summary: "Participez à des recrutements qui rapprochent les bons talents des bonnes équipes.",
    description:
      "Rejoignez notre équipe et accompagnez les candidats tout au long de leur parcours. Vous contribuerez à la publication des offres, à la présélection des candidatures et à l’organisation des entretiens.",
    status: "published",
    publishedAt: now,
    closingAt: null,
    createdAt: now,
    fields: DEFAULT_FORM_FIELDS,
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise) return databasePromise;

  const nextPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const jobs = database.createObjectStore(JOBS_STORE, { keyPath: "id" });
      database.createObjectStore(APPLICATIONS_STORE, { keyPath: "id" });
      jobs.add(demoJob());
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error ?? new Error("Le stockage local est indisponible."));
    request.onblocked = () => reject(new Error("Fermez les autres onglets de démonstration puis réessayez."));
  }).catch((error: unknown) => {
    databasePromise = undefined;
    throw error;
  });
  databasePromise = nextPromise;
  return nextPromise;
}

function readRequest<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("La lecture des données locales a échoué."));
  });
}

function transactionDone(transaction: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("L’enregistrement local a échoué."));
    transaction.onabort = () => reject(transaction.error ?? new Error("L’enregistrement local a été interrompu."));
  });
}

function notifyChange() {
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeToDemoChanges(listener: () => void) {
  window.addEventListener(CHANGE_EVENT, listener);
  return () => window.removeEventListener(CHANGE_EVENT, listener);
}

function isOpen(job: StoredJob, today = new Date().toISOString().slice(0, 10)) {
  return job.status === "published" && (!job.closingAt || job.closingAt.slice(0, 10) >= today);
}

export async function getDemoJobs(): Promise<StoredJob[]> {
  const database = await openDatabase();
  const transaction = database.transaction(JOBS_STORE, "readonly");
  const jobs = await readRequest(transaction.objectStore(JOBS_STORE).getAll() as IDBRequest<StoredJob[]>);
  await transactionDone(transaction);
  return jobs.sort((left, right) => (right.publishedAt ?? right.createdAt).localeCompare(left.publishedAt ?? left.createdAt));
}

export async function getPublishedDemoJobs() {
  return (await getDemoJobs()).filter((job) => isOpen(job));
}

export async function getPublishedDemoJob(slug: string) {
  return (await getDemoJobs()).find((job) => job.slug === slug && isOpen(job)) ?? null;
}

export async function saveDemoJob(input: DemoJobInput, id?: string) {
  const existingJobs = await getDemoJobs();
  const existing = id ? existingJobs.find((job) => job.id === id) : undefined;
  if (id && !existing) throw new Error("Cette offre n’existe plus dans ce navigateur.");

  const now = new Date().toISOString();
  const slugBase = input.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const job: StoredJob = {
    ...input,
    id: existing?.id ?? crypto.randomUUID(),
    slug: existing?.slug ?? `${slugBase || "offre"}-${crypto.randomUUID().slice(0, 8)}`,
    publishedAt: input.status === "published" ? existing?.publishedAt ?? now : existing?.publishedAt ?? null,
    createdAt: existing?.createdAt ?? now,
    fields: input.fields,
  };

  const database = await openDatabase();
  const transaction = database.transaction(JOBS_STORE, "readwrite");
  transaction.objectStore(JOBS_STORE).put(job);
  await transactionDone(transaction);
  notifyChange();
  return job;
}

export async function deleteDemoJob(id: string) {
  const applications = await getDemoApplications();
  if (applications.some((application) => application.jobId === id)) {
    throw new Error("Cette offre a des candidatures et ne peut pas être supprimée.");
  }
  const database = await openDatabase();
  const transaction = database.transaction(JOBS_STORE, "readwrite");
  transaction.objectStore(JOBS_STORE).delete(id);
  await transactionDone(transaction);
  notifyChange();
}

export async function createDemoApplication(
  slug: string,
  answers: Record<string, string>,
  resume: File,
) {
  const job = await getPublishedDemoJob(slug);
  if (!job) throw new Error("Cette offre n’est plus ouverte aux candidatures.");

  const existingApplications = await getDemoApplications();
  const email = (answers.email ?? "").trim().toLowerCase();
  if (existingApplications.some((application) => application.jobId === job.id && application.email === email)) {
    throw new Error("Une candidature existe déjà pour cette offre avec cette adresse e-mail.");
  }

  const application: StoredApplication = {
    id: crypto.randomUUID(),
    jobId: job.id,
    jobTitle: job.title,
    fullName: answers.full_name?.trim() ?? "",
    email,
    phone: answers.phone?.trim() ?? "",
    answers,
    status: "new",
    createdAt: new Date().toISOString(),
    resumeName: resume.name,
    resume,
  };

  const database = await openDatabase();
  const transaction = database.transaction(APPLICATIONS_STORE, "readwrite");
  transaction.objectStore(APPLICATIONS_STORE).add(application);
  await transactionDone(transaction);
  notifyChange();
}

function seedDemoApplications(jobId: string, jobTitle: string): StoredApplication[] {
  const dummyResume = new Blob(["%PDF-1.4 Demonstration CV Document"], { type: "application/pdf" });
  return [
    {
      id: "demo-app-1",
      jobId,
      jobTitle,
      fullName: "Claire Vasseur",
      email: "claire.vasseur@example.com",
      phone: "+33 6 42 18 90 23",
      answers: {
        full_name: "Claire Vasseur",
        email: "claire.vasseur@example.com",
        phone: "+33 6 42 18 90 23",
        experience: "5 ans d'expérience en recrutement tech et profils cadres au sein d'une scale-up.",
        motivation: "J'admire l'approche humaine et soignée de vos processus. Je souhaite apporter ma rigueur dans le sourcing et la relation candidat.",
        availability: "Disponible sous 1 mois (préavis négociable).",
      },
      status: "reviewing",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
      resumeName: "CV_Claire_Vasseur.pdf",
      resume: dummyResume,
    },
    {
      id: "demo-app-2",
      jobId,
      jobTitle,
      fullName: "Thomas Moreau",
      email: "thomas.moreau@example.com",
      phone: "+33 6 78 45 12 90",
      answers: {
        full_name: "Thomas Moreau",
        email: "thomas.moreau@example.com",
        phone: "+33 6 78 45 12 90",
        experience: "2 ans en cabinet de recrutement généraliste et spécialisé.",
        motivation: "Passionné par l'évaluation des compétences comportementales et l'expérience candidat.",
        availability: "Immédiate.",
      },
      status: "new",
      createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
      resumeName: "CV_Thomas_Moreau.pdf",
      resume: dummyResume,
    },
  ];
}

export async function getDemoApplications(): Promise<DemoApplication[]> {
  const database = await openDatabase();
  const readTx = database.transaction(APPLICATIONS_STORE, "readonly");
  let applications = await readRequest(
    readTx.objectStore(APPLICATIONS_STORE).getAll() as IDBRequest<StoredApplication[]>,
  );
  await transactionDone(readTx);

  if (applications.length === 0) {
    const jobs = await getDemoJobs();
    const mainJob = jobs[0];
    if (mainJob) {
      const seeded = seedDemoApplications(mainJob.id, mainJob.title);
      const writeTx = database.transaction(APPLICATIONS_STORE, "readwrite");
      const store = writeTx.objectStore(APPLICATIONS_STORE);
      for (const app of seeded) {
        store.put(app);
      }
      await transactionDone(writeTx);
      applications = seeded;
    }
  }

  return applications.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function updateDemoApplicationStatus(id: string, status: ApplicationStatus) {
  const applications = await getDemoApplications();
  const application = applications.find((item) => item.id === id);
  if (!application) throw new Error("Cette candidature n’existe plus dans ce navigateur.");
  const database = await openDatabase();
  const transaction = database.transaction(APPLICATIONS_STORE, "readwrite");
  transaction.objectStore(APPLICATIONS_STORE).put({ ...application, status });
  await transactionDone(transaction);
  notifyChange();
}

export async function deleteDemoApplication(id: string) {
  const database = await openDatabase();
  const transaction = database.transaction(APPLICATIONS_STORE, "readwrite");
  transaction.objectStore(APPLICATIONS_STORE).delete(id);
  await transactionDone(transaction);
  notifyChange();
}
