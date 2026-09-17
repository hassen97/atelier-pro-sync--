import { Package, Wrench, Zap, BarChart3, Users } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const TOOLS = [
  {
    icon: Package,
    title: "Inventaire",
    desc: "Codes-barres, alertes de seuil, import Excel, valorisation temps réel. Zéro rupture en pleine réparation.",
    wide: true,
  },
  {
    icon: Wrench,
    title: "Réparations",
    desc: "Tickets numérotés, historique, reçus PDF, suivi client par lien.",
    wide: false,
  },
  {
    icon: Zap,
    title: "Caisse",
    desc: "Encaissement en moins d'une seconde, crédits, rapports de clôture.",
    wide: false,
  },
  {
    icon: BarChart3,
    title: "Analytique",
    desc: "Marges, produits stars, revenus. Des chiffres, pas des opinions.",
    wide: false,
  },
  {
    icon: Users,
    title: "Équipe · permissions",
    desc: "Chaque employé à son poste. Vous gardez les clés. Accès par rôle granulaire, journal d'activité complet.",
    wide: true,
  },
];

/** Drives the CSS spotlight: write pointer position to --mx/--my (no re-render). */
function onToolMove(e: React.PointerEvent<HTMLDivElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty("--mx", `${e.clientX - r.left}px`);
  el.style.setProperty("--my", `${e.clientY - r.top}px`);
}

export function ToolWall() {
  return (
    <section id="outils" className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <Reveal>
          <div className="rp-section-head">
            <span className="rp-eyebrow">Mur d'outils · accrochez ce qu'il vous faut</span>
            <h2>Chaque outil à sa place.</h2>
            <p>Pas de superflu. Uniquement ce qui fait tourner l'atelier.</p>
          </div>
        </Reveal>
        <Reveal delay={80}>
          <div className="rp-pegboard">
            {TOOLS.map((t) => (
              <div
                className={`rp-tool${t.wide ? " rp-tool-wide" : ""}`}
                key={t.title}
                onPointerMove={onToolMove}
              >
                <div className="rp-tool-icon">
                  <t.icon size={24} strokeWidth={1.75} />
                </div>
                <h3>{t.title}</h3>
                <p>{t.desc}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
