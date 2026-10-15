"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {
  deleteDemoApplication,
  deleteDemoJob,
  getDemoApplications,
  getDemoJobs,
  saveDemoJob,
  subscribeToDemoChanges,
  updateDemoApplicationStatus,
  type DemoApplication,
  type DemoJobInput,
} from "@/lib/demo-store";
import { DEFAULT_FORM_FIELDS, type ApplicationStatus, type Job, type JobStatus, type FormField } from "@/lib/types";

type AdminTab = "jobs" | "applications";

const EMPTY_JOB: DemoJobInput = {
  title: "",
  department: "",
  location: "",
  contractType: "CDI",
  workMode: "Hybride",
  summary: "",
  description: "",
  status: "draft",
  closingAt: null,
  fields: DEFAULT_FORM_FIELDS,
};

const APPLICATION_STATUSES: { value: ApplicationStatus; label: string }[] = [
  { value: "new", label: "Nouvelle" },
  { value: "reviewing", label: "En cours" },
  { value: "interview", label: "Entretien" },
  { value: "accepted", label: "Retenue" },
  { value: "rejected", label: "Refusée" },
];

const STATUS_COLORS: Record<ApplicationStatus, string> = {
  new: "status-new",
  reviewing: "status-reviewing",
  interview: "status-interview",
  accepted: "status-accepted",
  rejected: "status-rejected",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

// ─── Drawer de détail candidature ────────────────────────────────────────────

function ApplicationDetailDrawer({
  application,
  jobFields,
  onClose,
  onChangeStatus,
  onDownloadResume,
  onDelete,
  busy,
}: {
  application: DemoApplication;
  jobFields: FormField[];
  onClose: () => void;
  onChangeStatus: (id: string, status: ApplicationStatus) => void;
  onDownloadResume: (application: DemoApplication) => void;
  onDelete: (application: DemoApplication) => void;
  busy: boolean;
}) {
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const statusLabel = APPLICATION_STATUSES.find((s) => s.value === application.status)?.label ?? application.status;
  const metaKeys = new Set(["full_name", "email", "phone"]);
  const customAnswers = Object.entries(application.answers).filter(([key]) => !metaKeys.has(key));

  function getFieldLabel(key: string): string {
    const field = jobFields.find((f) => f.id === key);
    return field?.label ?? key.replaceAll("_", " ");
  }

  return (
    <div
      className="drawer-backdrop"
      role="presentation"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        ref={drawerRef}
        className="demo-detail-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-drawer-title"
      >
        <div className="demo-detail-drawer-header">
          <div>
            <p className="eyebrow">ESPACE RECRUTEUR · CANDIDATURE</p>
            <h2 id="detail-drawer-title">Détail de la soumission</h2>
          </div>
          <button className="demo-detail-close" onClick={onClose} aria-label="Fermer">×</button>
        </div>

        <div className="demo-detail-drawer-body">
          {/* Identité */}
          <section className="demo-detail-identity" aria-label="Identité du candidat">
            <span className="demo-detail-avatar">
              {application.fullName.slice(0, 1).toUpperCase()}
            </span>
            <div className="demo-detail-identity-info">
              <h3>{application.fullName}</h3>
              <p className="demo-detail-job-title">{application.jobTitle}</p>
              <div className="demo-detail-meta-row">
                <span className={`status-pill ${STATUS_COLORS[application.status]}`}>{statusLabel}</span>
                <span className="demo-detail-date">
                  Reçue le {formatDate(application.createdAt)} à {formatTime(application.createdAt)}
                </span>
              </div>
            </div>
          </section>

          {/* Coordonnées */}
          <section className="demo-detail-section" aria-label="Coordonnées">
            <div className="demo-detail-section-heading">
              <span className="demo-detail-section-icon">01</span>
              <div>
                <h4>Coordonnées</h4>
                <p>Informations de contact du candidat.</p>
              </div>
            </div>
            <div className="demo-detail-contact-grid">
              <div className="demo-detail-contact-item">
                <span className="demo-detail-contact-label">✉ E-mail</span>
                <a href={`mailto:${application.email}`} className="demo-detail-contact-value">
                  {application.email}
                </a>
              </div>
              <div className="demo-detail-contact-item">
                <span className="demo-detail-contact-label">✆ Téléphone</span>
                <a href={`tel:${application.phone}`} className="demo-detail-contact-value">
                  {application.phone}
                </a>
              </div>
            </div>
          </section>

          {/* Réponses */}
          {customAnswers.length > 0 && (
            <section className="demo-detail-section" aria-label="Réponses du candidat">
              <div className="demo-detail-section-heading">
                <span className="demo-detail-section-icon">02</span>
                <div>
                  <h4>Réponses du candidat</h4>
                  <p>Les informations transmises avec la candidature.</p>
                </div>
              </div>
              <div className="demo-detail-answers">
                {customAnswers.map(([key, value]) => (
                  <div className="demo-detail-answer-item" key={key}>
                    <strong>{getFieldLabel(key)}</strong>
                    <p>{value || <em className="demo-detail-empty-answer">Sans réponse</em>}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* CV */}
          <section className="demo-detail-section" aria-label="Curriculum vitae">
            <div className="demo-detail-section-heading">
              <span className="demo-detail-section-icon">{customAnswers.length > 0 ? "03" : "02"}</span>
              <div>
                <h4>Curriculum vitæ</h4>
                <p>Document joint à la candidature.</p>
              </div>
            </div>
            <div className="demo-detail-resume">
              <div className="demo-detail-resume-info">
                <span className="demo-detail-resume-icon">📄</span>
                <span>{application.resumeName}</span>
              </div>
              <button
                className="button button-dark demo-detail-download-btn"
                onClick={() => onDownloadResume(application)}
                disabled={busy}
              >
                ↓ Télécharger le CV <span className="demo-detail-download-format">PDF</span>
              </button>
            </div>
          </section>

          {/* Suivi statut */}
          <section className="demo-detail-section" aria-label="Suivi de la candidature">
            <div className="demo-detail-section-heading">
              <span className="demo-detail-section-icon">{customAnswers.length > 0 ? "04" : "03"}</span>
              <div>
                <h4>Suivi de la candidature</h4>
                <p>Faites avancer le profil dans votre processus de recrutement.</p>
              </div>
            </div>
            <div className="demo-detail-status-steps">
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s.value}
                  className={`demo-detail-status-step${application.status === s.value ? " active" : ""}`}
                  onClick={() => onChangeStatus(application.id, s.value)}
                  disabled={busy}
                  aria-pressed={application.status === s.value}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </section>
        </div>

        <div className="demo-detail-drawer-footer">
          <button
            className="delete-application-button"
            onClick={() => onDelete(application)}
            disabled={busy}
          >
            Supprimer définitivement cette candidature
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── Console principale ───────────────────────────────────────────────────────

export default function DemoAdminConsole() {
  const [tab, setTab] = useState<AdminTab>("jobs");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<DemoApplication[]>([]);
  const [draft, setDraft] = useState<DemoJobInput>(EMPTY_JOB);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<DemoApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");

  const refresh = useCallback(async () => {
    try {
      const [currentJobs, currentApplications] = await Promise.all([
        getDemoJobs(),
        getDemoApplications(),
      ]);
      setJobs(currentJobs);
      setApplications(currentApplications);
      setError("");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Impossible de lire les données de démonstration.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    return subscribeToDemoChanges(() => void refresh());
  }, [refresh]);

  // Mettre à jour l'application sélectionnée si les données sont rafraîchies
  useEffect(() => {
    if (selectedApplication) {
      const updated = applications.find((a) => a.id === selectedApplication.id);
      if (updated) setSelectedApplication(updated);
    }
  }, [applications, selectedApplication]);

  function startNewJob() {
    setEditingJobId(null);
    setDraft({ ...EMPTY_JOB, fields: DEFAULT_FORM_FIELDS });
    setError("");
    setEditorOpen(true);
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
      closingAt: job.closingAt?.slice(0, 10) ?? null,
      fields: job.fields ?? DEFAULT_FORM_FIELDS,
    });
    setError("");
    setEditorOpen(true);
  }

  async function saveJob(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await saveDemoJob(draft, editingJobId ?? undefined);
      setEditorOpen(false);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’offre n’a pas pu être enregistrée.");
    } finally {
      setBusy(false);
    }
  }

  async function changeJobStatus(job: Job, status: JobStatus) {
    setError("");
    try {
      await saveDemoJob({
        title: job.title,
        department: job.department,
        location: job.location,
        contractType: job.contractType,
        workMode: job.workMode,
        summary: job.summary,
        description: job.description,
        status,
        closingAt: job.closingAt,
        fields: job.fields ?? DEFAULT_FORM_FIELDS,
      }, job.id);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le statut de l’offre n’a pas pu être modifié.");
    }
  }

  async function removeJob(job: Job) {
    if (!window.confirm(`Supprimer l’offre « ${job.title} » ?`)) return;
    setError("");
    try {
      await deleteDemoJob(job.id);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "L’offre n’a pas pu être supprimée.");
    }
  }

  async function changeApplicationStatus(id: string, status: ApplicationStatus) {
    setBusy(true);
    setError("");
    try {
      await updateDemoApplicationStatus(id, status);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Le statut de la candidature n’a pas pu être modifié.");
    } finally {
      setBusy(false);
    }
  }

  async function removeApplication(application: DemoApplication) {
    if (!window.confirm(`Supprimer la candidature de ${application.fullName} ?`)) return;
    setBusy(true);
    setError("");
    try {
      await deleteDemoApplication(application.id);
      if (selectedApplication?.id === application.id) {
        setSelectedApplication(null);
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "La candidature n’a pas pu être supprimée.");
    } finally {
      setBusy(false);
    }
  }

  function downloadResume(application: DemoApplication) {
    const url = URL.createObjectURL(application.resume);
    const link = document.createElement("a");
    link.href = url;
    link.download = application.resumeName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }

  function getJobFields(jobId: string) {
    const job = jobs.find((j) => j.id === jobId);
    return job?.fields ?? DEFAULT_FORM_FIELDS;
  }

  const filteredApplications = applications.filter((app) => {
    const query = searchInput.trim().toLowerCase();
    if (!query) return true;
    return (
      app.fullName.toLowerCase().includes(query) ||
      app.email.toLowerCase().includes(query) ||
      app.jobTitle.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return <main className="admin-loading"><span className="loading-mark">k.</span><p>Ouverture de la démo…</p></main>;
  }

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <Link className="brand admin-brand" href="/">
          <span className="brand-light">skullvi</span>
        </Link>
        <p className="sidebar-label">ESPACE RECRUTEUR</p>
        <nav className="admin-nav" aria-label="Navigation admin">
          <button className={`admin-nav-item${tab === "jobs" ? " active" : ""}`} onClick={() => setTab("jobs")}>
            <span className="nav-icon">↗</span> Offres <span className="nav-count">{jobs.length}</span>
          </button>
          <button className={`admin-nav-item${tab === "applications" ? " active" : ""}`} onClick={() => setTab("applications")}>
            <span className="nav-icon">✳</span> Candidatures <span className="nav-count">{applications.length}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <p className="demo-storage-note">MVP de démonstration<br />Données de ce navigateur uniquement</p>
          <Link className="sign-out-button" href="/">← Retour au site</Link>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div className="breadcrumb"><strong>{tab === "jobs" ? "Offres d’emploi" : "Candidatures"}</strong></div>
          <span className="admin-secure"><span /> Démo locale</span>
        </header>

        <div className="admin-content">
          {error ? <div className="admin-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Fermer">×</button></div> : null}
          <div className="admin-page-heading">
            <div>
              <p className="eyebrow">ESPACE RECRUTEUR · MODE DÉMO</p>
              <h1>{tab === "jobs" ? "Vos offres" : "Candidatures reçues"}</h1>
              <p>Les données restent dans le stockage local de ce navigateur.</p>
            </div>
            {tab === "jobs" ? (
              <button className="button button-dark" onClick={startNewJob}>＋ Créer une offre</button>
            ) : null}
          </div>

          {tab === "jobs" ? (
            <section className="demo-record-list" aria-label="Offres">
              {jobs.length ? jobs.map((job) => (
                <article className="demo-record" key={job.id}>
                  <div className="demo-record-main">
                    <div className="demo-record-title">
                      <h2>{job.title}</h2>
                      <span className={`demo-status demo-status-${job.status}`}>
                        {job.status === "published" ? "Publiée" : job.status === "closed" ? "Clôturée" : "Brouillon"}
                      </span>
                    </div>
                    <p>{job.department} · {job.location} · {job.contractType} · {job.workMode}</p>
                    <small>{applications.filter((application) => application.jobId === job.id).length} candidature(s)</small>
                  </div>
                  <div className="demo-record-actions">
                    <button className="button button-outline" onClick={() => startEditJob(job)}>Modifier</button>
                    {job.status === "published" ? (
                      <button className="button button-outline" onClick={() => void changeJobStatus(job, "closed")}>Clôturer</button>
                    ) : (
                      <button className="button button-dark" onClick={() => void changeJobStatus(job, "published")}>Publier</button>
                    )}
                    <button className="demo-delete-button" onClick={() => void removeJob(job)}>Supprimer</button>
                    {job.status === "published" ? (
                      <Link className="demo-public-link" href={`/offres/${job.slug}`}>Voir l’offre publique →</Link>
                    ) : null}
                  </div>
                </article>
              )) : (
                <div className="demo-empty-state">
                  <h2>Aucune offre pour le moment</h2>
                  <p>Créez une offre et publiez-la pour la rendre visible sur le site.</p>
                </div>
              )}
            </section>
          ) : (
            /* ── Onglet Candidatures ───────────────────────────────────────────────── */
            <section className="admin-panel" aria-label="Candidatures">
              <div className="panel-heading">
                <div>
                  <h2>Candidatures reçues</h2>
                  <p>Cliquez sur une ligne pour consulter tous les détails de la soumission.</p>
                </div>
                <span className="panel-total">{filteredApplications.length} résultat{filteredApplications.length > 1 ? "s" : ""}</span>
              </div>
              <div className="table-toolbar">
                <label className="search-field">
                  <span>⌕</span>
                  <input
                    placeholder="Rechercher un candidat, un e-mail ou un poste…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </label>
              </div>
              {filteredApplications.length ? (
                <div className="application-table-wrap">
                  <table className="application-table">
                    <thead>
                      <tr>
                        <th>CANDIDAT</th>
                        <th>POSTE</th>
                        <th>STATUT</th>
                        <th>CV</th>
                        <th>DATE</th>
                        <th />
                      </tr>
                    </thead>
                    <tbody>
                      {filteredApplications.map((application) => {
                        const sLabel = APPLICATION_STATUSES.find((s) => s.value === application.status)?.label ?? application.status;
                        return (
                          <tr
                            key={application.id}
                            onClick={() => setSelectedApplication(application)}
                            className={selectedApplication?.id === application.id ? "demo-row-selected" : ""}
                          >
                            <td>
                              <div className="candidate-cell">
                                <span className="candidate-avatar">
                                  {application.fullName.slice(0, 1).toUpperCase()}
                                </span>
                                <span>
                                  <strong>{application.fullName}</strong>
                                  <small>{application.email}</small>
                                </span>
                              </div>
                            </td>
                            <td><span className="table-job-title">{application.jobTitle}</span></td>
                            <td>
                              <span className={`status-pill ${STATUS_COLORS[application.status]}`}>
                                {sLabel}
                              </span>
                            </td>
                            <td>
                              <span className="demo-cv-badge" title={application.resumeName}>
                                📄 {application.resumeName.length > 22 ? application.resumeName.slice(0, 20) + "…" : application.resumeName}
                              </span>
                            </td>
                            <td className="table-date">{formatDate(application.createdAt)}</td>
                            <td>
                              <button className="row-open-button" aria-label={`Voir ${application.fullName}`}>→</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="admin-empty">
                  <span>✳</span>
                  <h3>{applications.length ? "Aucun résultat pour cette recherche." : "Les prochaines belles rencontres arrivent bientôt."}</h3>
                  <p>{applications.length ? "Modifiez votre recherche." : "Les candidatures reçues apparaîtront ici."}</p>
                </div>
              )}
            </section>
          )}
        </div>
      </section>

      {editorOpen ? (
        <div className="demo-editor-backdrop" role="presentation">
          <section className="demo-editor" role="dialog" aria-modal="true" aria-labelledby="demo-editor-title">
            <div className="demo-editor-heading">
              <div>
                <p className="eyebrow">OFFRE D’EMPLOI</p>
                <h2 id="demo-editor-title">{editingJobId ? "Modifier l’offre" : "Créer une offre"}</h2>
              </div>
              <button className="demo-close-button" onClick={() => setEditorOpen(false)} aria-label="Fermer">×</button>
            </div>
            <form className="application-form demo-job-form" onSubmit={saveJob}>
              <label className="form-field"><span>Intitulé du poste *</span><input required maxLength={120} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
              <div className="demo-form-row">
                <label className="form-field"><span>Équipe *</span><input required maxLength={80} value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label>
                <label className="form-field"><span>Lieu *</span><input required maxLength={100} value={draft.location} onChange={(event) => setDraft({ ...draft, location: event.target.value })} /></label>
              </div>
              <div className="demo-form-row">
                <label className="form-field"><span>Contrat *</span><input required maxLength={80} value={draft.contractType} onChange={(event) => setDraft({ ...draft, contractType: event.target.value })} /></label>
                <label className="form-field"><span>Mode de travail *</span><input required maxLength={80} value={draft.workMode} onChange={(event) => setDraft({ ...draft, workMode: event.target.value })} /></label>
              </div>
              <label className="form-field"><span>Résumé *</span><textarea required maxLength={300} rows={2} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
              <label className="form-field"><span>Description du poste *</span><textarea required maxLength={8_000} rows={6} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
              <label className="form-field"><span>Publication</span>
                <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as JobStatus })}>
                  <option value="draft">Enregistrer en brouillon</option>
                  <option value="published">Publier immédiatement</option>
                  <option value="closed">Clôturer l’offre</option>
                </select>
              </label>
              <label className="form-field"><span>Date limite (facultatif)</span><input type="date" value={draft.closingAt ?? ""} onChange={(event) => setDraft({ ...draft, closingAt: event.target.value || null })} /></label>
              {error ? <p className="form-error" role="alert">{error}</p> : null}
              <div className="demo-editor-actions">
                <button className="button button-outline" type="button" onClick={() => setEditorOpen(false)}>Annuler</button>
                <button className="button button-dark" type="submit" disabled={busy}>{busy ? "Enregistrement…" : "Enregistrer l’offre"}</button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {selectedApplication ? (
        <ApplicationDetailDrawer
          application={selectedApplication}
          jobFields={getJobFields(selectedApplication.jobId)}
          onClose={() => setSelectedApplication(null)}
          onChangeStatus={changeApplicationStatus}
          onDownloadResume={downloadResume}
          onDelete={removeApplication}
          busy={busy}
        />
      ) : null}
    </main>
  );
}
