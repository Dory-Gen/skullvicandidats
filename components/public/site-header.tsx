import Link from "next/link";

export function SiteHeader({
  jobPage = false,
  showJobCta = true,
}: {
  jobPage?: boolean;
  showJobCta?: boolean;
}) {
  return (
    <header className="site-header">
      <Link className="brand" href="/" aria-label="Kora Talents, accueil">
        
      <span className="brand-light">Skullvi</span>
      </Link>
      

         
          <a className="button button-dark header-cta" href="#offres">
            Nos opportunités 
          </a>
        
      
    </header>
  );
}
