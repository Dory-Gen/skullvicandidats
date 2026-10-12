import CandidateApplicationForm from "@/components/public/candidate-application-form";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";
import type { Job } from "@/lib/types";

export default function JobPageContent({ job }: { job: Job }) {
  return (
    <main className="public-page">
      <SiteHeader jobPage />
      <section className="job-detail-hero">
        <p className="eyebrow"><span className="eyebrow-dot" /> {job.department}</p>
        <h1>{job.title}</h1>
        <p className="job-detail-summary">{job.summary}</p>
        <div className="job-tags job-detail-tags">
          <span>⌖ {job.location}</span><span>◷ {job.contractType}</span><span>◉ {job.workMode}</span>
        </div>
      </section>
      <section className="job-detail-layout">
        <article className="job-description">
          <p className="eyebrow">LE POSTE</p>
          <h2>Votre prochain chapitre.</h2>
          <div className="prose-copy">{job.description}</div>
          <div className="job-description-note">
            <span>✳</span>
            <p>Une question avant de vous lancer ? <a href="mailto:bonjour@koratalents.fr">Parlons-en.</a></p>
          </div>
        </article>
        <aside className="application-card" id="candidater">
          <div className="application-card-heading">
            <p className="eyebrow">À VOUS DE JOUER</p>
            <h2>Postulez en quelques minutes.</h2>
            <p>Présentez-vous et joignez votre CV. Nous reviendrons vers vous rapidement.</p>
          </div>
          <CandidateApplicationForm slug={job.slug} fields={job.fields ?? []} />
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}

export function JobPageLoading() {
  return (
    <main className="public-page">
      <SiteHeader jobPage showJobCta={false} />
      <section className="job-detail-hero">
        <p className="eyebrow">OFFRE D’EMPLOI</p>
        <h1>Nous préparons les détails du poste.</h1>
      </section>
    </main>
  );
}
