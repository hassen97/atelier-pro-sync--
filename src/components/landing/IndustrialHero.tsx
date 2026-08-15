import { useRef } from "react";
import { Link } from "react-router-dom";
import { PlayCircle, Loader2, UserPlus } from "lucide-react";
import { usePausedOffscreen } from "@/components/landing/usePausedOffscreen";

const SCOPE_PATH =
  "M0 20 L50 20 L60 5 L70 35 L80 15 L90 25 L100 20 L200 20 L210 5 L220 35 L230 15 L240 25 L250 20 L400 20 L410 5 L420 35 L430 15 L440 25 L450 20 L600 20 L610 5 L620 35 L630 15 L640 25 L650 20 L800 20";

interface IndustrialHeroProps {
  startDemo: () => void;
  demoLoading: boolean;
}

export function IndustrialHero({ startDemo, demoLoading }: IndustrialHeroProps) {
  const phoneRef = useRef<HTMLDivElement>(null);
  const { ref: scopeRef, paused: scopePaused } = usePausedOffscreen<HTMLDivElement>();

  // Mouse-follow parallax: mutate the transform directly to avoid re-renders.
  const onSceneMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const phone = phoneRef.current;
    if (!phone) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    phone.style.transform = `rotateX(${12 - y * 14}deg) rotateY(${-18 + x * 24}deg)`;
  };
  const onSceneMouseLeave = () => {
    if (phoneRef.current) phoneRef.current.style.transform = "rotateX(12deg) rotateY(-18deg)";
  };

  return (
    <section className="rp-hero">
      <div className="rp-container">
        <div className="rp-hero-grid">
          <div>
            <span className="rp-eyebrow">Atelier 01 · Spécification technique</span>
            <h1>
              L'atelier
              <br />
              réparé par
              <br />
              <em>l'ingénierie.</em>
            </h1>
            <p className="rp-tag">
              <strong>RepairPro</strong> est la table d'opération numérique des réparateurs mobiles tunisiens.
              Inventaire, caisse, réparations, clients — assemblés avec précision dans une seule application.
            </p>
            <div className="rp-hero-cta">
              <Link to="/auth?tab=register" className="rp-btn rp-btn-primary">
                <UserPlus size={16} /> Ouvrir mon atelier
              </Link>
              <button className="rp-btn rp-btn-ghost" onClick={startDemo} disabled={demoLoading}>
                {demoLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
                Démo en 1 clic
              </button>
            </div>
            <div className="rp-meta-row">
              <span>
                <span className="rp-meta-dot" /> Système opérationnel
              </span>
              <span>uptime 99.9%</span>
              <span>v4.2 · Août 2026</span>
            </div>

            <div ref={scopeRef} className={`rp-oscilloscope${scopePaused ? " rp-paused" : ""}`}>
              <div className="rp-scope-title">◆ Telemetry · ventes/sec · atelier réseau</div>
              <svg className="rp-scope-svg" viewBox="0 0 800 40" preserveAspectRatio="none" aria-hidden="true">
                <path className="rp-scope-path-bg" d={SCOPE_PATH} />
                <path className="rp-scope-path" d={SCOPE_PATH} />
              </svg>
            </div>
          </div>

          {/* Exploded 3D phone */}
          <div
            className="rp-scene"
            onMouseMove={onSceneMouseMove}
            onMouseLeave={onSceneMouseLeave}
            aria-hidden="true"
          >
            <div className="rp-phone" ref={phoneRef}>
              <div className="rp-layer rp-l-frame">
                <span className="rp-layer-label rp-label-frame">01 · Châssis titane</span>
              </div>
              <div className="rp-layer rp-l-battery">
                <span className="rp-layer-label rp-label-battery">02 · Cellule 4500mAh</span>
              </div>
              <div className="rp-layer rp-l-board">
                <span className="rp-layer-label rp-label-board">03 · Carte mère</span>
              </div>
              <div className="rp-layer rp-l-screen">
                <div className="rp-status-bar">
                  <span>09:41</span>
                  <span>◉ 100%</span>
                </div>
                <div className="rp-tiles">
                  <div className="rp-tile">
                    VENTES
                    <div className="rp-v">1 240</div>
                  </div>
                  <div className="rp-tile">
                    STOCK
                    <div className="rp-v">2 341</div>
                  </div>
                  <div className="rp-tile">
                    RÉP.
                    <div className="rp-v">14</div>
                  </div>
                  <div className="rp-tile">
                    DT
                    <div className="rp-v" style={{ color: "#34d399" }}>
                      +18%
                    </div>
                  </div>
                </div>
                <span className="rp-layer-label rp-label-screen">04 · Écran OLED</span>
              </div>
              <div className="rp-layer rp-l-glass">
                <span className="rp-layer-label rp-label-glass">05 · Verre trempé</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
