import { Suspense } from "react";

import HomeHero from "@/components/public/home-hero";
import JobsSection, { JobsLoading } from "@/components/public/jobs-section";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function Home() {
  return (
    <main className="public-page">
      <SiteHeader />
      <HomeHero />
      <Suspense fallback={<JobsLoading />}>
        <JobsSection />
      </Suspense>
     
      <SiteFooter />
    </main>
  );
}
