"use client";

import type { Job } from "@/lib/types";

export default function JobsPanel({
  jobs,
  onCreate,
  onDelete,
  onEdit,
}: {
  jobs: Job[];
  onCreate: () => void;
  onDelete: (job: Job) => void;
  onEdit: (job: Job) => void;
}) {
  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div><h2>Toutes vos offres</h2><p>Gérez vos annonces et les formulaires de candidature associés.</p></div>
        <span className="panel-total">{jobs.length} offre{jobs.length > 1 ? "s" : ""}</span>
      </div>
      {jobs.length ? (
        <div className="job-admin-list">
          {jobs.map((job) => (
            <article className="job-admin-card" key={job.id}>
              <div className="job-admin-icon">◈</div>
              <div className="job-admin-info">
                <div className="job-admin-title-line">
                  <h3>{job.title}</h3>
                  <span className={`status-pill job-status-${job.status}`}>
                    {job.status === "published" ? "Publiée" : job.status === "draft" ? "Brouillon" : "Clôturée"}
                  </span>
                </div>
                <p>{job.department} · {job.location} · {job.contractType}</p>
                <div className="job-admin-meta">
                  <span>▤ {job.applicationCount ?? 0} candidature{job.applicationCount === 1 ? "" : "s"}</span>
                  <span>Formulaire : {job.fields?.length ?? 0} questions</span>
                </div>
              </div>
              <div className="job-admin-actions">
                {job.status === "published" ? (
                  <a className="text-action" href={`/offres/${job.slug}`} target="_blank" rel="noreferrer">Voir ↗</a>
                ) : null}
                <button className="text-action" onClick={() => onEdit(job)}>Modifier</button>
                <button
                  className="text-action text-action-danger"
                  disabled={(job.applicationCount ?? 0) > 0}
                  title={(job.applicationCount ?? 0) > 0 ? "Cette offre conserve des candidatures" : "Supprimer"}
                  onClick={() => onDelete(job)}
                >
                  Supprimer
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="admin-empty">
          <span>✳</span><h3>Votre première offre commence ici.</h3>
          <p>Créez une annonce, choisissez son formulaire et publiez-la en un instant.</p>
          <button className="button button-dark" onClick={onCreate}>＋ Créer une offre</button>
        </div>
      )}
    </section>
  );
}
