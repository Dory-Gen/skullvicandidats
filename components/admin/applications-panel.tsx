"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { AdminApplication } from "@/components/admin/types";
import { QUALIFICATION_LABELS, STATUS_LABELS } from "@/components/admin/types";

type ApplicationsPanelProps = {
  applications: AdminApplication[];
  applicationPage: number;
  applicationTotal: number;
  onPageChange: (page: number) => void;
  onSelectApplication: (application: AdminApplication) => void;
  searchInput: string;
  setSearchInput: Dispatch<SetStateAction<string>>;
  qualificationFilter: string;
  setQualificationFilter: Dispatch<SetStateAction<string>>;
  priorityFilter: string;
  setPriorityFilter: Dispatch<SetStateAction<string>>;
  applicationSort: string;
  setApplicationSort: Dispatch<SetStateAction<string>>;
  setStatusFilter: Dispatch<SetStateAction<string>>;
  statusFilter: string;
  totalApplicationPages: number;
  totalApplications: number;
};

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

export default function ApplicationsPanel({
  applications,
  applicationPage,
  applicationTotal,
  onPageChange,
  onSelectApplication,
  searchInput,
  setSearchInput,
  qualificationFilter,
  setQualificationFilter,
  priorityFilter,
  setPriorityFilter,
  applicationSort,
  setApplicationSort,
  setStatusFilter,
  statusFilter,
  totalApplicationPages,
  totalApplications,
}: ApplicationsPanelProps) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div><h2>Vos dernières candidatures</h2><p>Retrouvez et suivez les profils qui ont postulé.</p></div>
        <span className="panel-total">{applicationTotal} résultat{applicationTotal > 1 ? "s" : ""}</span>
      </div>
      <div className="table-toolbar">
        <label className="search-field">
          <span>⌕</span>
          <input
            placeholder="Rechercher un candidat ou un poste…"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>
        <select
          className="filter-select"
          value={statusFilter}
          onChange={(event) => {
            onPageChange(1);
            setStatusFilter(event.target.value);
          }}
          aria-label="Filtrer par statut"
        >
          <option value="all">Tous les statuts</option>
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={qualificationFilter}
          onChange={(event) => {
            onPageChange(1);
            setQualificationFilter(event.target.value);
          }}
          aria-label="Filtrer par qualification"
        >
          <option value="all">Toutes les qualifications</option>
          {Object.entries(QUALIFICATION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select
          className="filter-select"
          value={priorityFilter}
          onChange={(event) => {
            onPageChange(1);
            setPriorityFilter(event.target.value);
          }}
          aria-label="Filtrer par priorité"
        >
          <option value="all">Tous les profils</option>
          <option value="true">Prioritaires uniquement</option>
        </select>
        <select
          className="filter-select"
          value={applicationSort}
          onChange={(event) => {
            onPageChange(1);
            setApplicationSort(event.target.value);
          }}
          aria-label="Classer les candidatures"
        >
          <option value="recent">Plus récentes</option>
          <option value="score">Meilleures notes</option>
          <option value="priority">Priorité et note</option>
        </select>
      </div>
      {applications.length ? (
        <div className="application-table-wrap">
          <table className="application-table">
            <thead><tr><th>CANDIDAT</th><th>OFFRE</th><th>NOTE</th><th>QUALIFICATION</th><th>DATE</th><th>SUIVI</th><th /></tr></thead>
            <tbody>
              {applications.map((application) => (
                <tr key={application.id} onClick={() => onSelectApplication(application)}>
                  <td>
                    <div className="candidate-cell">
                      <span className="candidate-avatar">{application.fullName.slice(0, 1).toUpperCase()}</span>
                      <span>
                        <Link className="candidate-detail-link" href={`/admin/candidatures/${application.id}`}>
                          <strong>{application.fullName}</strong>
                        </Link>
                        <small>{application.email}</small>
                      </span>
                    </div>
                  </td>
                  <td><span className="table-job-title">{application.jobTitle}</span></td>
                  <td><span className="candidate-score">{application.score === null ? "—" : `${application.score}/100`}</span></td>
                  <td>
                    <span className={`qualification-pill qualification-${application.qualification}`}>
                      {QUALIFICATION_LABELS[application.qualification]}
                    </span>
                    {application.priority ? <span className="priority-marker">Prioritaire</span> : null}
                  </td>
                  <td className="table-date">{dateLabel(application.createdAt)}</td>
                  <td><span className={`status-pill status-${application.status}`}>{STATUS_LABELS[application.status]}</span></td>
                  <td><button className="row-open-button" aria-label={`Voir ${application.fullName}`}>→</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="admin-empty">
          <span>✳</span>
          <h3>{totalApplications ? "Aucun résultat pour cette recherche." : "Les prochaines belles rencontres arrivent bientôt."}</h3>
          <p>{totalApplications ? "Modifiez votre recherche ou votre filtre." : "Les candidatures reçues apparaîtront ici."}</p>
        </div>
      )}
      {applicationTotal > 0 ? (
        <div className="table-pagination">
          <span>{(applicationPage - 1) * 50 + 1}–{Math.min(applicationPage * 50, applicationTotal)} sur {applicationTotal}</span>
          <div>
            <button disabled={applicationPage <= 1} onClick={() => onPageChange(applicationPage - 1)}>Précédent</button>
            <span>Page {applicationPage} / {totalApplicationPages}</span>
            <button disabled={applicationPage >= totalApplicationPages} onClick={() => onPageChange(applicationPage + 1)}>Suivant</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
