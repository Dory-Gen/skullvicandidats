"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { FormField, Job } from "@/lib/types";
import { DEFAULT_FORM_FIELDS } from "@/lib/types";
import AdminLoginScreen from "@/components/admin/admin-login-screen";
import AdminSidebar from "@/components/admin/admin-sidebar";
import AdminStatCards from "@/components/admin/admin-stat-cards";
import ApplicationsPanel from "@/components/admin/applications-panel";
import JobsPanel from "@/components/admin/jobs-panel";
import JobEditorDrawer from "@/components/admin/job-editor-drawer";
import type { Admin, AdminApplication, JobDraft } from "@/components/admin/types";

type ApplicationListResponse = {
  applications: AdminApplication[];
  total: number;
  summary: { total: number; pending: number; priority: number };
  page: number;
  pageSize: number;
};

const EMPTY_DRAFT: JobDraft = {
  title: "",
  department: "",
  location: "",
  contractType: "",
  workMode: "",
  summary: "",
  description: "",
  status: "draft",
  closingAt: "",
  fields: DEFAULT_FORM_FIELDS,
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", ...init });
  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error ?? "Une erreur est survenue.");
  }
  return result as T;
}

export default function AdminConsole() {
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [activeTab, setActiveTab] = useState<"applications" | "jobs">("applications");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<AdminApplication[]>([]);
  const [totalApplications, setTotalApplications] = useState(0);
  const [pendingApplications, setPendingApplications] = useState(0);
  const [priorityApplications, setPriorityApplications] = useState(0);
  const [applicationTotal, setApplicationTotal] = useState(0);
  const [applicationPage, setApplicationPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualificationFilter, setQualificationFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [applicationSort, setApplicationSort] = useState("recent");
  const [jobEditorOpen, setJobEditorOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [draft, setDraft] = useState<JobDraft>(EMPTY_DRAFT);
  const router = useRouter();

  const fetchJobs = useCallback(() => requestJson<{ jobs: Job[] }>("/api/admin/jobs"), []);
  const fetchApplications = useCallback((page: number, query: string, status: string, qualification: string, priority: string, sort: string) => {
    const params = new URLSearchParams({ page: String(page), q: query, status, qualification, priority, sort });
    return requestJson<ApplicationListResponse>(`/api/admin/applications?${params}`);
  }, []);

  const refreshData = useCallback(async () => {
    const [jobsResponse, applicationResponse] = await Promise.all([
      fetchJobs(),
      fetchApplications(applicationPage, search, statusFilter, qualificationFilter, priorityFilter, applicationSort),
    ]);
    setJobs(jobsResponse.jobs);
    setApplications(applicationResponse.applications);
    setApplicationTotal(applicationResponse.total);
    setTotalApplications(applicationResponse.summary.total);
    setPendingApplications(applicationResponse.summary.pending);
    setPriorityApplications(applicationResponse.summary.priority);
    const lastPage = Math.max(1, Math.ceil(applicationResponse.total / applicationResponse.pageSize));
    if (applicationPage > lastPage) setApplicationPage(lastPage);
  }, [applicationPage, applicationSort, fetchApplications, fetchJobs, priorityFilter, qualificationFilter, search, statusFilter]);

  useEffect(() => {
    let mounted = true;
    requestJson<{ admin: Admin }>("/api/auth/session")
      .then(({ admin: currentAdmin }) => {
        if (mounted) setAdmin(currentAdmin);
      })
      .catch((reason: unknown) => {
        if (reason instanceof Error && !reason.message.includes("Authentification requise")) {
          setError(reason.message);
        }
      })
      .finally(() => {
        if (mounted) setInitializing(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    fetchJobs().then(({ jobs: currentJobs }) => {
      if (active) setJobs(currentJobs);
    }).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Impossible de charger les offres.");
    });
    return () => {
      active = false;
    };
  }, [admin, fetchJobs]);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    fetchApplications(applicationPage, search, statusFilter, qualificationFilter, priorityFilter, applicationSort)
      .then((result) => {
        if (!active) return;
        setApplications(result.applications);
        setApplicationTotal(result.total);
        setTotalApplications(result.summary.total);
        setPendingApplications(result.summary.pending);
        setPriorityApplications(result.summary.priority);
        const lastPage = Math.max(1, Math.ceil(result.total / result.pageSize));
        if (applicationPage > lastPage) setApplicationPage(lastPage);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Impossible de charger les candidatures.");
        }
      });
    return () => {
      active = false;
    };
  }, [admin, applicationPage, applicationSort, fetchApplications, priorityFilter, qualificationFilter, search, statusFilter]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setApplicationPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const totalApplicationPages = Math.max(1, Math.ceil(applicationTotal / 50));

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJson("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const { admin: currentAdmin } = await requestJson<{ admin: Admin }>("/api/auth/session");
      setAdmin(currentAdmin);
      setPassword("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La connexion a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await requestJson("/api/auth/logout", { method: "POST" });
      setAdmin(null);
      setJobs([]);
      setApplications([]);
      setTotalApplications(0);
      setPendingApplications(0);
      setPriorityApplications(0);
      setApplicationTotal(0);
      setApplicationPage(1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La déconnexion a échoué.");
    } finally {
      setBusy(false);
    }
  }

  function startCreateJob() {
    setEditingJobId(null);
    setDraft(EMPTY_DRAFT);
    setError("");
    setJobEditorOpen(true);
  }

  function startEditJob(job: Job) {
    setEditingJobId(job.id);
    setDraft({
      title: job.title,
      department: job.department,
      location: job.location,
      contractType: job.contractType,
      workMode: job.workMode,
      summary: job.summary,
      description: job.description,
      status: job.status,
      closingAt: job.closingAt?.slice(0, 10) ?? "",
      fields: job.fields ?? DEFAULT_FORM_FIELDS,
    });
    setError("");
    setJobEditorOpen(true);
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await requestJson(
        editingJobId ? `/api/admin/jobs/${editingJobId}` : "/api/admin/jobs",
        {
          method: editingJobId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, closingAt: draft.closingAt || null }),
        },
      );
      setJobEditorOpen(false);
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’offre n’a pas pu être enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteJob(job: Job) {
    if (!window.confirm(`Supprimer l’offre « ${job.title} » ?`)) return;
    setBusy(true);
    setError("");
    try {
      await requestJson(`/api/admin/jobs/${job.id}`, { method: "DELETE" });
      await refreshData();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’offre n’a pas pu être supprimée.");
    } finally {
      setBusy(false);
    }
  }

  function updateField(index: number, patch: Partial<FormField>) {
    setDraft((current) => ({
      ...current,
      fields: current.fields.map((field, fieldIndex) =>
        fieldIndex === index ? { ...field, ...patch } : field,
      ),
    }));
  }

  function addField() {
    const nextNumber = draft.fields.length + 1;
    setDraft((current) => ({
      ...current,
      fields: [
        ...current.fields,
        {
      id: `question_${crypto.randomUUID().replaceAll("-", "").slice(0, 10)}`,
          label: `Nouvelle question ${nextNumber}`,
          type: "text",
          required: false,
        },
      ],
    }));
  }

  function removeField(index: number) {
    if (["full_name", "email", "phone"].includes(draft.fields[index]?.id)) return;
    setDraft((current) => ({
      ...current,
      fields: current.fields.filter((_, fieldIndex) => fieldIndex !== index),
    }));
  }

  if (initializing) {
    return <main className="admin-loading"><span className="loading-mark">k.</span><p>Ouverture de votre espace…</p></main>;
  }

  if (!admin) {
    return (
      <AdminLoginScreen
        busy={busy}
        email={email}
        error={error}
        password={password}
        setEmail={setEmail}
        setPassword={setPassword}
        onSubmit={signIn}
      />
    );
  }

  return (
    <main className="admin-shell">
      <AdminSidebar
        activeTab={activeTab}
        applicationCount={totalApplications}
        busy={busy}
        email={admin.email}
        jobCount={jobs.length}
        onSelectTab={setActiveTab}
        onSignOut={signOut}
      />

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumb"><strong>{activeTab === "applications" ? "Candidatures" : "Offres d’emploi"}</strong></div>
         
        </header>

        <div className="admin-content">
          {error ? <div className="admin-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Fermer">×</button></div> : null}
          <div className="admin-page-heading">
            <div>
             
              <h1>{activeTab === "applications" ? "Candidatures reçues" : "Vos offres"}</h1>
  
            </div>
            {activeTab === "jobs" ? <button className="button button-dark" onClick={startCreateJob}>＋ Créer une offre</button> : null}
          </div>

          <AdminStatCards
            totalApplications={totalApplications}
            pendingApplications={pendingApplications}
            priorityApplications={priorityApplications}
            jobs={jobs}
          />

          {activeTab === "applications" ? (
            <ApplicationsPanel
              applications={applications}
              applicationPage={applicationPage}
              applicationTotal={applicationTotal}
              onPageChange={setApplicationPage}
              onSelectApplication={(application) => router.push(`/admin/candidatures/${application.id}`)}
              searchInput={searchInput}
              setSearchInput={setSearchInput}
              qualificationFilter={qualificationFilter}
              setQualificationFilter={setQualificationFilter}
              priorityFilter={priorityFilter}
              setPriorityFilter={setPriorityFilter}
              applicationSort={applicationSort}
              setApplicationSort={setApplicationSort}
              setStatusFilter={setStatusFilter}
              statusFilter={statusFilter}
              totalApplicationPages={totalApplicationPages}
              totalApplications={totalApplications}
            />
          ) : (
            <JobsPanel
              jobs={jobs}
              onCreate={startCreateJob}
              onDelete={deleteJob}
              onEdit={startEditJob}
            />
          )}
        </div>
      </section>

      {jobEditorOpen ? (
        <JobEditorDrawer
          busy={busy}
          draft={draft}
          editingJobId={editingJobId}
          error={error}
          onAddField={addField}
          onClose={() => setJobEditorOpen(false)}
          onRemoveField={removeField}
          onSave={saveJob}
          onUpdateField={updateField}
          setDraft={setDraft}
        />
      ) : null}
    </main>
  );
}
