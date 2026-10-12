import type { Job } from "@/lib/types";

export default function AdminStatCards({
  totalApplications,
  pendingApplications,
  priorityApplications,
  jobs,
}: {
  totalApplications: number;
  pendingApplications: number;
  priorityApplications: number;
  jobs: Job[];
}) {
  return (
    <div className="admin-stats">
      <article className="stat-card">
        <span className="stat-icon stat-icon-lime">✳</span><span className="stat-label">Candidatures reçues</span>
        <strong>{totalApplications}</strong><small>Tous postes confondus</small>
      </article>
      <article className="stat-card">
        <span className="stat-icon stat-icon-peach">◷</span><span className="stat-label">À étudier</span>
        <strong>{pendingApplications}</strong><small>Profils à découvrir</small>
      </article>
      <article className="stat-card">
        <span className="stat-icon stat-icon-blue">◈</span><span className="stat-label">Offres publiées</span>
        <strong>{jobs.filter((job) => job.status === "published").length}</strong><small>Opportunités en ligne</small>
      </article>
      <article className="stat-card">
        <span className="stat-icon stat-icon-priority">★</span><span className="stat-label">À étudier en priorité</span>
        <strong>{priorityApplications}</strong><small>Profils signalés</small>
      </article>
    </div>
  );
}
