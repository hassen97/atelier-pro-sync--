import { useState } from "react";
import { ShoppingCart, Package, Wrench, LayoutDashboard, Users, BarChart3 } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

type TabKey = "caisse" | "stock" | "reparations";

const NAV = [
  { key: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "caisse", label: "Caisse", icon: ShoppingCart },
  { key: "stock", label: "Inventaire", icon: Package },
  { key: "reparations", label: "Réparations", icon: Wrench },
  { key: "clients", label: "Clients", icon: Users },
  { key: "stats", label: "Analytique", icon: BarChart3 },
] as const;

const CHART = [42, 58, 47, 72, 63, 88, 76];

function WindowChrome({ active, children }: { active: string; children: React.ReactNode }) {
  return (
    <div className="rp-window">
      <div className="rp-win-bar" aria-hidden="true">
        <span className="rp-win-dot" style={{ background: "#ef4444" }} />
        <span className="rp-win-dot" style={{ background: "#f59e0b" }} />
        <span className="rp-win-dot" style={{ background: "#22c55e" }} />
        <span className="rp-win-url">app.repairpro.tn / atelier</span>
      </div>
      <div className="rp-win-body">
        <div className="rp-win-side" aria-hidden="true">
          <span className="rp-win-logo">
            <i /> REPAIRPRO
          </span>
          {NAV.map((n) => (
            <span className={`rp-win-nav${n.key === active ? " active" : ""}`} key={n.key}>
              <n.icon size={15} strokeWidth={1.75} /> {n.label}
            </span>
          ))}
        </div>
        <div className="rp-win-main">{children}</div>
      </div>
    </div>
  );
}

function Caisse() {
  return (
    <WindowChrome active="caisse">
      <div className="rp-win-head">Caisse · session ouverte</div>
      <div className="rp-kpis">
        <div className="rp-kpi"><div className="k">Ventes</div><div className="v">1 240<small>DT</small></div></div>
        <div className="rp-kpi"><div className="k">Ticket moyen</div><div className="v">68<small>DT</small></div></div>
        <div className="rp-kpi"><div className="k">Espèces</div><div className="v">820<small>DT</small></div></div>
        <div className="rp-kpi"><div className="k">En ligne</div><div className="v">420<small>DT</small></div></div>
      </div>
      <div className="rp-chart" aria-hidden="true">
        {CHART.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}
      </div>
      <div className="rp-table" aria-hidden="true">
        <div className="rp-tr head"><span>Article</span><span>Qté</span><span className="rp-col-hide">Client</span><span className="rp-st">Total</span></div>
        <div className="rp-tr"><span>Écran iPhone 13</span><span>1</span><span className="rp-col-hide">Walk-in</span><span className="rp-st">180 DT</span></div>
        <div className="rp-tr"><span>Batterie Pixel 7</span><span>1</span><span className="rp-col-hide">M. Ben</span><span className="rp-st">95 DT</span></div>
        <div className="rp-tr"><span>Coque + verre</span><span>2</span><span className="rp-col-hide">Walk-in</span><span className="rp-st">40 DT</span></div>
      </div>
    </WindowChrome>
  );
}

function Stock() {
  const rows = [
    { name: "Écran OLED iPhone 13", qty: "12 en stock", pct: 78, low: false },
    { name: "Batterie Samsung A52", qty: "4 en stock", pct: 26, low: true },
    { name: "Connecteur de charge", qty: "31 en stock", pct: 92, low: false },
    { name: "Vitre arrière Redmi", qty: "3 en stock", pct: 18, low: true },
  ];
  return (
    <WindowChrome active="stock">
      <div className="rp-win-head">Inventaire · valorisation temps réel</div>
      <div className="rp-kpis">
        <div className="rp-kpi"><div className="k">Références</div><div className="v">486</div></div>
        <div className="rp-kpi"><div className="k">Valeur stock</div><div className="v">84K<small>DT</small></div></div>
        <div className="rp-kpi"><div className="k">Alertes</div><div className="v">7</div></div>
        <div className="rp-kpi"><div className="k">Ruptures</div><div className="v">2</div></div>
      </div>
      <div className="rp-table" aria-hidden="true">
        {rows.map((r) => (
          <div className="rp-tr" key={r.name} style={{ gridTemplateColumns: "1.6fr 1fr" }}>
            <span>{r.name}</span>
            <span className="rp-stock-row">
              <span className={`rp-stock-bar${r.low ? " low" : ""}`}><i style={{ width: `${r.pct}%` }} /></span>
              <span style={{ color: r.low ? "#ef4444" : "var(--rp-muted)", whiteSpace: "nowrap" }}>{r.qty}</span>
            </span>
          </div>
        ))}
      </div>
    </WindowChrome>
  );
}

function Reparations() {
  return (
    <WindowChrome active="reparations">
      <div className="rp-win-head">Réparations · file d'atelier</div>
      <div className="rp-kpis">
        <div className="rp-kpi"><div className="k">En cours</div><div className="v">6</div></div>
        <div className="rp-kpi"><div className="k">Terminées</div><div className="v">14</div></div>
        <div className="rp-kpi"><div className="k">Livrées</div><div className="v">128</div></div>
        <div className="rp-kpi"><div className="k">CA rép.</div><div className="v">3.1K<small>DT</small></div></div>
      </div>
      <div className="rp-table" aria-hidden="true">
        <div className="rp-tr head"><span>Ticket</span><span>Appareil</span><span className="rp-col-hide">Client</span><span className="rp-st">Statut</span></div>
        <div className="rp-tr"><span>#0147</span><span>iPhone 13 Pro</span><span className="rp-col-hide">S. Karim</span><span className="rp-st rp-badge-wip">En cours</span></div>
        <div className="rp-tr"><span>#0148</span><span>Galaxy A52</span><span className="rp-col-hide">M. Ali</span><span className="rp-st rp-badge-ok">Terminé</span></div>
        <div className="rp-tr"><span>#0149</span><span>Redmi Note 11</span><span className="rp-col-hide">L. Ines</span><span className="rp-st rp-badge-wait">En attente</span></div>
      </div>
    </WindowChrome>
  );
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "caisse", label: "Caisse" },
  { key: "stock", label: "Inventaire" },
  { key: "reparations", label: "Réparations" },
];

/**
 * ProductShowcase: an abstracted, data-free recreation of the real app UI in a
 * device/browser frame, with tabs for the three core modules. Gives visitors a
 * credible look at the product without exposing any real shop data.
 */
export function ProductShowcase() {
  const [tab, setTab] = useState<TabKey>("caisse");

  return (
    <section id="produit" className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <Reveal>
          <div className="rp-section-head">
            <span className="rp-eyebrow">Aperçu produit · interface réelle</span>
            <h2>
              Voyez l'atelier
              <br />
              de l'intérieur.
            </h2>
            <p>Caisse, inventaire et réparations — la même interface nette que vous utiliserez chaque jour.</p>
          </div>
        </Reveal>

        <Reveal delay={80}>
          <div className="rp-showcase-tabs" role="tablist" aria-label="Modules du produit">
            {TABS.map((t) => (
              <button
                key={t.key}
                role="tab"
                aria-selected={tab === t.key}
                className="rp-tab"
                onClick={() => setTab(t.key)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Reveal>

        <Reveal delay={140}>
          {tab === "caisse" && <Caisse />}
          {tab === "stock" && <Stock />}
          {tab === "reparations" && <Reparations />}
        </Reveal>
      </div>
    </section>
  );
}
