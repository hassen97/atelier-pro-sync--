const VISITS = [
  {
    stamp: "VISITE Nº 0147",
    date: "12.08.2026",
    quote:
      "« Avant je notais tout sur un cahier. Maintenant je sais exactement combien je gagne par jour et quelles pièces me rapportent le plus. »",
    name: "Mehdi K.",
    city: "◆ PhoneFix · Tunis",
    signature: "Mehdi",
  },
  {
    stamp: "VISITE Nº 0148",
    date: "14.08.2026",
    quote:
      "« Le lien de suivi que reçoit le client a changé notre image. Les gens nous prennent pour une grande enseigne. »",
    name: "Sami B.",
    city: "◆ TechRépare · Sfax",
    signature: "Sami",
  },
  {
    stamp: "VISITE Nº 0149",
    date: "15.08.2026",
    quote:
      "« Deux caissiers en même temps, zéro erreur de stock depuis 3 mois. La caisse est d'une rapidité incroyable. »",
    name: "Amira H.",
    city: "◆ Mobile Center · Sousse",
    signature: "Amira",
  },
];

export function WorkshopVisits() {
  return (
    <section className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <div className="rp-section-head">
          <span className="rp-eyebrow">Rapports de visite · ateliers pilotes</span>
          <h2>Parole aux réparateurs.</h2>
        </div>
        <div className="rp-visits">
          {VISITS.map((v) => (
            <div className="rp-visit" key={v.stamp}>
              <div className="rp-stamp">
                <span>{v.stamp}</span>
                <span>{v.date}</span>
              </div>
              <blockquote>{v.quote}</blockquote>
              <div className="rp-visit-author">
                <div>
                  <div className="rp-name">{v.name}</div>
                  <div className="rp-city">{v.city}</div>
                </div>
                <div className="rp-signature">{v.signature}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
