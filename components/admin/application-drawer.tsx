"use client";

import { useState, type FormEvent } from "react";
import type { ApplicationStatus, FormField, QualificationStatus } from "@/lib/types";
import type { AdminApplication, ApplicationAssessment } from "@/components/admin/types";
import { QUALIFICATION_LABELS, STATUS_LABELS } from "@/components/admin/types";
import Link from "next/link";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export default function ApplicationDrawer({
  application,
  busy,
  fields,
  onChangeStatus,
  onSaveAssessment,
  onDelete,
  onDownloadResume,
}: {
  application: AdminApplication;
  busy: boolean;
  fields: FormField[];
  onChangeStatus: (application: AdminApplication, status: ApplicationStatus) => void;
  onSaveAssessment: (application: AdminApplication, assessment: ApplicationAssessment) => void;
  onDelete: (application: AdminApplication) => void;
  onDownloadResume: (applicationId: string) => void;
}) {
  const [qualification, setQualification] = useState<QualificationStatus>(application.qualification);
  const [score, setScore] = useState(application.score?.toString() ?? "");
  const [priority, setPriority] = useState(application.priority);
  const [assessmentNotes, setAssessmentNotes] = useState(application.assessmentNotes);

  function saveAssessment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSaveAssessment(application, {
      qualification,
      score: score === "" ? null : Number(score),
      priority,
      assessmentNotes,
    });
  }

  return (
    <main className="application-detail-page">
      <div className="application-detail-page-card">
        <header className="application-detail-topbar">
          <div>
            <span className="eyebrow">ESPACE RECRUTEUR · CANDIDATURE</span>
            <h1 className="application-detail-title">Détail du profil</h1>
          </div>
          <Link className="application-detail-back" href="/admin">← Retour aux candidatures</Link>
        </header>

        <section className="application-profile-hero" aria-label="Profil du candidat">
          <span className="drawer-avatar">{application.fullName.slice(0, 1).toUpperCase()}</span>
          <div className="application-profile-identity">
            <h2>{application.fullName}</h2>
            <p className="drawer-job">{application.jobTitle}</p>
          </div>
          <div className="application-profile-contact">
            <a href={`mailto:${application.email}`}>{application.email}</a>
            <a href={`tel:${application.phone}`}>{application.phone}</a>
          </div>
          <div className="application-profile-meta">
            <span className={`status-pill status-${application.status}`}>{STATUS_LABELS[application.status]}</span>
            <span>Reçue le {dateLabel(application.createdAt)}</span>
            <span>{application.score === null ? "Note non attribuée" : `Note ${application.score}/100`}</span>
            {application.priority ? <span className="priority-marker">À étudier en priorité</span> : null}
          </div>
        </section>

        <div className="application-detail-grid">
          <div className="application-detail-main">
            <section className="application-detail-section">
              <div className="application-detail-section-heading">
                <span className="application-detail-section-icon">01</span>
                <div>
                  <h2>Suivi de la candidature</h2>
                  <p>Faites avancer le profil dans votre processus de recrutement.</p>
                </div>
              </div>
              <label className="form-field">
                <span>Statut</span>
                <select
                  value={application.status}
                  disabled={busy}
                  onChange={(event) => onChangeStatus(application, event.target.value as ApplicationStatus)}
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
            </section>

            <section className="application-detail-section">
              <div className="application-detail-section-heading">
                <span className="application-detail-section-icon">02</span>
                <div>
                  <h2>Réponses du candidat</h2>
                  <p>Les informations transmises avec sa candidature.</p>
                </div>
              </div>
              {Object.entries(application.answers)
                .filter(([key]) => !["full_name", "email", "phone"].includes(key))
                .map(([key, value]) => {
                  const field = fields.find((item) => item.id === key);
                  return (
                    <div className="answer-item" key={key}>
                      <strong>{field?.label ?? key}</strong>
                      <p>{value}</p>
                    </div>
                  );
                })}
            </section>
          </div>

          <aside className="application-detail-side">
            <form className="assessment-form" onSubmit={saveAssessment}>
              <div className="application-detail-section-heading">
                <span className="application-detail-section-icon">03</span>
                <div>
                  <h2>Évaluation interne</h2>
                  <p>Ces informations restent réservées à l’équipe.</p>
                </div>
              </div>
              <label className="form-field">
                <span>Qualification</span>
                <select
                  value={qualification}
                  disabled={busy}
                  onChange={(event) => setQualification(event.target.value as QualificationStatus)}
                >
                  {Object.entries(QUALIFICATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span>Note globale (0 à 100)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={score}
                  disabled={busy}
                  onChange={(event) => setScore(event.target.value)}
                  placeholder="Non évalué"
                />
              </label>
              <label className="priority-toggle">
                <input
                  type="checkbox"
                  checked={priority}
                  disabled={busy}
                  onChange={(event) => setPriority(event.target.checked)}
                />
                <span>À étudier en priorité</span>
              </label>
              <label className="form-field">
                <span>Notes internes</span>
                <textarea
                  rows={5}
                  maxLength={4000}
                  value={assessmentNotes}
                  disabled={busy}
                  onChange={(event) => setAssessmentNotes(event.target.value)}
                  placeholder="Compétences clés, expérience pertinente, points à vérifier en entretien…"
                />
              </label>
              <button className="button button-dark assessment-save" type="submit" disabled={busy}>
                Enregistrer l’évaluation
              </button>
            </form>

            <section className="application-detail-section application-resume-section">
              <div className="application-detail-section-heading">
                <span className="application-detail-section-icon">04</span>
                <div>
                  <h2>CV du candidat</h2>
                  <p>Document privé, accessible aux administrateurs.</p>
                </div>
              </div>
              {application.hasResume ? (
                <button
                  className="button button-dark resume-download"
                  disabled={busy}
                  onClick={() => onDownloadResume(application.id)}
                >
                  ↓ Télécharger le CV <span>PDF</span>
                </button>
              ) : (
                <p className="drawer-no-resume">Aucun CV n’est joint à cette candidature.</p>
              )}
            </section>

            <button className="delete-application-button" disabled={busy} onClick={() => onDelete(application)}>
              Supprimer définitivement cette candidature
            </button>
          </aside>
        </div>
      </div>
    </main>
  );
}
