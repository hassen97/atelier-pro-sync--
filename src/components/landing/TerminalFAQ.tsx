const FAQ = [
  {
    q: "Mes données sont-elles en sécurité ?",
    a: "Oui. Chiffrement, isolation stricte par boutique (personne d'autre n'y accède), sauvegardes quotidiennes automatiques. Vos données vous appartiennent — exportez-les à tout moment.",
  },
  {
    q: "Ça marche si ma connexion internet est lente ?",
    a: "RepairPro est une PWA installable sur téléphone ou PC. L'application continue de fonctionner même avec une connexion instable et se synchronise dès que le réseau revient.",
  },
  {
    q: "RepairPro est-il disponible en arabe ?",
    a: "Oui. Français, arabe (avec interface RTL) et anglais — changez la langue à tout moment dans les réglages.",
  },
  {
    q: "Comment fonctionne l'essai gratuit ?",
    a: "Créez un compte, commencez immédiatement. Une démo complète est aussi disponible sans même vous inscrire — un clic, c'est tout.",
  },
  {
    q: "Comment importer mon inventaire existant ?",
    a: "Un simple fichier Excel suffit : nom, prix, quantité. Notre équipe peut vous aider à préparer le fichier si besoin.",
  },
  {
    q: "Et si j'ai besoin d'aide ?",
    a: "Support par WhatsApp et e-mail, en français et en arabe. Les clients Pro sont prioritaires, temps de réponse moyen inférieur à 2h en heures ouvrées.",
  },
];

export function TerminalFAQ() {
  return (
    <section id="faq" className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <div className="rp-section-head">
          <span className="rp-eyebrow">Terminal · questions fréquentes</span>
          <h2>$ faq --show</h2>
        </div>
        <div className="rp-terminal">
          <div className="rp-term-bar">
            <span className="rp-dot" style={{ background: "#ef4444" }} />
            <span className="rp-dot" style={{ background: "#f59e0b" }} />
            <span className="rp-dot" style={{ background: "#22c55e" }} />
            <span className="rp-term-title">repairpro · ~/faq</span>
          </div>
          <div className="rp-term-body">
            {FAQ.map((f, i) => (
              <details key={f.q} open={i === 0}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
