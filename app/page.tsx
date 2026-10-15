import HomeHero from "@/components/public/home-hero";
import DemoJobsSection from "@/components/public/demo-jobs-section";
import { SiteFooter } from "@/components/public/site-footer";
import { SiteHeader } from "@/components/public/site-header";

export default function Home() {
  return (
    <main className="public-page">
      <SiteHeader />
      <HomeHero />
      <DemoJobsSection />
     
      <SiteFooter />
    </main>
  );
}
