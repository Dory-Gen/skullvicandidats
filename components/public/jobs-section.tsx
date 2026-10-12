import Link from "next/link";
import { connection } from "next/server";
import { getPublishedJobs } from "@/lib/jobs";

export default async function JobsSection() {
  await connection();
  const jobs = await getPublishedJobs();

  return (
    <section className="opportunities-section" id="offres">
     
        <div className="section-heading">
          <h2>Postuler maintenant</h2>
        </div>
        
      
      {jobs.length ? (
        <div className="job-grid">
          {jobs.map((job, index) => (
            <article className={`job-card job-card-${index % 3}`} key={job.id}>
              <div className="job-card-top">
                <span className="job-department">{job.department}</span>
                <span className="job-open-indicator">↗</span>
              </div>
              <h3>{job.title}</h3>
              <p className="job-summary">{job.summary}</p>
              <div className="job-tags">
                <span>⌖ {job.location}</span>
                <span>◷ {job.contractType}</span>
                <span>◉ {job.workMode}</span>
              </div>
              <Link className="job-link" href={`/offres/${job.slug}`}>
                Découvrir l’offre <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-jobs">
          <span className="empty-jobs-icon">✳</span>
          <div>
            <h3>Un peu de patience, la suite arrive.</h3>
            <p>Nos nouvelles opportunités seront bientôt publiées. Revenez nous voir.</p>
          </div>
        </div>
      )}
    </section>
  );
}

export function JobsLoading() {
  return (
    <section className="opportunities-section" id="offres">
      <div className="section-heading">
        <div>
          <p className="eyebrow">VOTRE PROCHAINE ÉTAPE</p>
          <h2>Des postes faits<br />pour <em>vous.</em></h2>
        </div>
        <p className="section-intro">
          Chaque opportunité est sélectionnée avec soin. Trouvons ensemble celle qui fera la différence.
        </p>
      </div>
      <div className="empty-jobs" aria-label="Chargement des offres">
        <span className="empty-jobs-icon">✳</span>
        <div><h3>Nous préparons les opportunités.</h3></div>
      </div>
    </section>
  );
}
