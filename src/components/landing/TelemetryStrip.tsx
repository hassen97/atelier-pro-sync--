import { usePausedOffscreen } from "@/components/landing/usePausedOffscreen";

const BARS = [40, 60, 50, 80, 70, 90, 75, 85];

export function TelemetryStrip() {
  const { ref, paused } = usePausedOffscreen<HTMLDivElement>();

  return (
    <section className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <div className="rp-section-head">
          <span className="rp-eyebrow">Télémétrie · en direct</span>
          <h2>L'atelier ne dort jamais.</h2>
        </div>
        <div ref={ref} className={`rp-telemetry${paused ? " rp-paused" : ""}`}>
          <div className="rp-metric">
            <div className="rp-metric-k">Ventes/jour</div>
            <div className="rp-metric-v">142</div>
            <div className="rp-metric-d">↑ +18.4%</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Stock valorisé</div>
            <div className="rp-metric-v">
              84K<span> DT</span>
            </div>
            <div className="rp-metric-d">↑ +2.1%</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Latence caisse</div>
            <div className="rp-metric-v">
              340<span>ms</span>
            </div>
            <div className="rp-metric-d rp-down">↓ record</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Débit atelier</div>
            <div className="rp-metric-v">
              4.2<span>/h</span>
            </div>
            <div className="rp-bars" aria-hidden="true">
              {BARS.map((h, i) => (
                <div key={i} style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
