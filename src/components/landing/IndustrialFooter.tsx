import repairProLogo from "@/assets/repairpro-logo.png";

const SUPPORT_EMAIL = "contact@repairprotunisie.com";

export function IndustrialFooter() {
  return (
    <footer className="rp-footer">
      <div className="rp-container">
        <div className="rp-footer-grid">
          <div className="rp-footer-brand">
            <a href="/" className="rp-logo">
              <span className="rp-logo-mark">
                <img src={repairProLogo} alt="RepairPro" width={18} height={18} />
              </span>
              REPAIRPRO<span style={{ color: "var(--rp-muted)" }}>//tn</span>
            </a>
            <p>
              La table d'opération numérique des ateliers de réparation mobile en Tunisie. Assemblée à la
              main, avec précision.
            </p>
          </div>
          <div>
            <h4>Produit</h4>
            <a href="#atelier" className="rp-foot-link">Atelier</a>
            <a href="#produit" className="rp-foot-link">Aperçu produit</a>
            <a href="#outils" className="rp-foot-link">Outils</a>
            <a href="#tarifs" className="rp-foot-link">Tarifs</a>
            <a href="#faq" className="rp-foot-link">FAQ</a>
          </div>
          <div>
            <h4>Démarrer</h4>
            <a href="/auth?tab=register" className="rp-foot-link">Créer un compte</a>
            <a href="/auth" className="rp-foot-link">Connexion</a>
            <a href="#faq" className="rp-foot-link">Essai gratuit</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="rp-foot-link">
              {SUPPORT_EMAIL}
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Support%20WhatsApp`} className="rp-foot-link">
              Support WhatsApp
            </a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Question%20commerciale`} className="rp-foot-link">
              Question commerciale
            </a>
          </div>
        </div>
        <div className="rp-footer-bottom">
          <span>© {new Date().getFullYear()} RepairPro // Tous droits réservés</span>
          <span className="rp-legal">
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Confidentialité`}>Confidentialité</a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Conditions`}>Conditions</a>
            <a href={`mailto:${SUPPORT_EMAIL}?subject=Mentions légales`}>Mentions légales</a>
          </span>
        </div>
      </div>
    </footer>
  );
}
