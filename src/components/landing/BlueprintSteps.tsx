const STEPS = [
  {
    num: "01",
    title: "Enregistrez l'appareil",
    desc: "Un ticket de réparation en 30 secondes. Le client reçoit un lien de suivi en temps réel.",
    spec: [
      ["modèle", "iPhone 13 Pro"],
      ["panne", "Écran fissuré"],
      ["acompte", "50 DT"],
    ],
  },
  {
    num: "02",
    title: "Réparez en clarté",
    desc: "Suivi par statut, stock déduit automatiquement, alertes de rupture avant que ça bloque.",
    spec: [
      ["pièces", "-1 Écran OLED"],
      ["temps", "47 min"],
      ["marge", "+62 DT"],
    ],
  },
  {
    num: "03",
    title: "Encaissez · Fidélisez",
    desc: "Caisse instantanée, reçu PDF, points de fidélité. Votre chiffre d'affaires en direct.",
    spec: [
      ["total", "180 DT"],
      ["points", "+18"],
      ["statut", "✓ Clôturé"],
    ],
  },
];

export function BlueprintSteps() {
  return (
    <section id="atelier" className="rp-section">
      <div className="rp-container">
        <div className="rp-section-head">
          <span className="rp-eyebrow">Plan de montage · 03 étapes</span>
          <h2>
            Votre journée,
            <br />
            assemblée comme un appareil.
          </h2>
          <p>Un flux conçu pour les réparateurs — pas pour les ingénieurs de la tech.</p>
        </div>
        <div className="rp-blueprint">
          {STEPS.map((s) => (
            <div className="rp-bp-step" key={s.num}>
              <div className="rp-bp-num">{s.num}</div>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
              <div className="rp-bp-spec">
                {s.spec.map(([k, v]) => (
                  <span key={k}>
                    {k} · <b>{v}</b>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
