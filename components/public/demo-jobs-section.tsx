"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { getPublishedDemoJobs, subscribeToDemoChanges } from "@/lib/demo-store";
import type { Job } from "@/lib/types";

export default function DemoJobsSection() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const refreshJobs = useCallback(() => {
    getPublishedDemoJobs()
      .then((currentJobs) => {
        setJobs(currentJobs);
        setError("");
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "Impossible de charger les offres locales.");
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    refreshJobs();
    return subscribeToDemoChanges(refreshJobs);
  }, [refreshJobs]);

  return (
    <section className="opportunities-section" id="offres">
      <div className="section-heading">
        <h2>Postuler maintenant</h2>
      </div>

      {error ? <p className="form-error" role="alert">{error}</p> : null}
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
            <h3>{loaded ? "Un peu de patience, la suite arrive." : "Nous préparons les opportunités."}</h3>
            {loaded ? <p>Publiez une offre depuis l’espace admin pour la faire apparaître ici.</p> : null}
          </div>
        </div>
      )}
    </section>
  );
}
