import { usePausedOffscreen } from "@/components/landing/usePausedOffscreen";
import { Reveal } from "@/components/landing/Reveal";
import { CountUp } from "@/components/landing/CountUp";

const BARS = [40, 60, 50, 80, 70, 90, 75, 85];

export function TelemetryStrip() {
  const { ref, paused } = usePausedOffscreen<HTMLDivElement>();

  return (
    <section className="rp-section" style={{ paddingTop: 0 }}>
      <div className="rp-container">
        <Reveal>
          <div className="rp-section-head">
            <span className="rp-eyebrow">Télémétrie · exemple d'atelier</span>
            <h2>L'atelier ne dort jamais.</h2>
            <p>Un aperçu des indicateurs que RepairPro suit pour vous, en temps réel, sur une journée type.</p>
          </div>
        </Reveal>
        <div ref={ref} className={`rp-telemetry${paused ? " rp-paused" : ""}`}>
          <div className="rp-metric">
            <div className="rp-metric-k">Ventes/jour</div>
            <div className="rp-metric-v">
              <CountUp end={142} />
            </div>
            <div className="rp-metric-d">↑ +18.4%</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Stock valorisé</div>
            <div className="rp-metric-v">
              <CountUp end={84} />K<span> DT</span>
            </div>
            <div className="rp-metric-d">↑ +2.1%</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Latence caisse</div>
            <div className="rp-metric-v">
              <CountUp end={340} /><span>ms</span>
            </div>
            <div className="rp-metric-d rp-down">↓ record</div>
          </div>
          <div className="rp-metric">
            <div className="rp-metric-k">Débit atelier</div>
            <div className="rp-metric-v">
              <CountUp end={4.2} decimals={1} /><span>/h</span>
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
