export default function HomeHero() {
  return (
    <section className="hero-section">
      <div className="hero-copy">
        
        <h1>Transforme ton savoir  <em>en succès</em></h1>
        <p className="hero-description">
          Developpe tes compétences, trouve le poste qui te correspond et fais décoller ta carrière avec Skullvi.
        </p>
        <a className="button button-lime" href="#offres">
          Explorer les offres 
        </a>
        <div className="hero-proof">
          <div className="avatar-stack" aria-hidden="true">
            <span>J</span><span>A</span><span>M</span><span>+</span>
          </div>
          <p><strong>1 200+</strong> talents accompagnés</p>
        </div>
      </div>
      <div  aria-label="Illustration abstraite de rencontre professionnelle">
        <img src="/img/hero.jpg" alt=""  />
      </div>
     
    </section>
  );
}
