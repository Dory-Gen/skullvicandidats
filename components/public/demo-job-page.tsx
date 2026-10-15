"use client";

import { useEffect, useState } from "react";
import CandidateApplicationForm from "@/components/public/candidate-application-form";
import JobPageContent, { JobPageLoading } from "@/components/public/job-page-content";
import { getPublishedDemoJob } from "@/lib/demo-store";
import type { Job } from "@/lib/types";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function DemoJobPage({ slug }: { slug: string }) {
  const [job, setJob] = useState<Job | null | undefined>(undefined);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublishedDemoJob(slug)
      .then((foundJob) => {
        if (active) setJob(foundJob);
      })
      .catch((reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "Impossible de charger cette offre.");
          setJob(null);
        }
      });
    return () => {
      active = false;
    };
  }, [slug]);

  if (job === undefined) return <JobPageLoading />;
  if (!job) {
    return (
      <main className="public-page">
        <SiteHeader jobPage showJobCta={false} />
        <section className="job-detail-hero">
          <p className="eyebrow">OFFRE D’EMPLOI</p>
          <h1>Cette offre n’est plus disponible.</h1>
          {error ? <p className="form-error" role="alert">{error}</p> : null}
        </section>
        <SiteFooter />
      </main>
    );
  }

  return <JobPageContent job={job} />;
}
