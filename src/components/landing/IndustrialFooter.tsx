import repairProLogo from "@/assets/repairpro-logo.png";

export function IndustrialFooter() {
  return (
    <footer className="rp-footer">
      <div className="rp-container">
        <div className="rp-footer-grid">
          <div className="rp-footer-brand">
            <a href="#" className="rp-logo">
              <span className="rp-logo-mark">
                <img src={repairProLogo} alt="" width={18} height={18} />
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
            <a href="#outils" className="rp-foot-link">Outils</a>
            <a href="#tarifs" className="rp-foot-link">Tarifs</a>
            <a href="#faq" className="rp-foot-link">FAQ</a>
          </div>
          <div>
            <h4>Ressources</h4>
            <a href="#" className="rp-foot-link">Guide de démarrage</a>
            <a href="#" className="rp-foot-link">Communauté</a>
            <a href="#" className="rp-foot-link">Statut système</a>
          </div>
          <div>
            <h4>Contact</h4>
            <a href="#" className="rp-foot-link">WhatsApp</a>
            <a href="mailto:contact@repairprotunisie.com" className="rp-foot-link">
              contact@repairprotunisie.com
            </a>
            <a href="#" className="rp-foot-link">Facebook</a>
            <a href="#" className="rp-foot-link">Instagram</a>
          </div>
        </div>
        <div className="rp-footer-bottom">
          <span>© {new Date().getFullYear()} RepairPro // Tous droits réservés</span>
          <span>Confidentialité · Conditions · Mentions légales</span>
        </div>
      </div>
    </footer>
  );
}
