import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Gift, Clock, ArrowRight } from "lucide-react";

const OFFER_KEY = "rp_trial_offer_start";
const OFFER_MS = 24 * 60 * 60 * 1000; // 24h per-visitor window

function getOfferStart(): number {
  try {
    const raw = localStorage.getItem(OFFER_KEY);
    if (raw) {
      const n = Number(raw);
      if (Number.isFinite(n)) return n;
    }
    const now = Date.now();
    localStorage.setItem(OFFER_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/**
 * First-visit offer banner, styled in the landing's "Industrial Workshop"
 * language (square corners, forge-orange, mono type) so it no longer reads as a
 * foreign template glued onto the page. Same per-visitor 24h window as before;
 * signing up while it is live grants a 7-day Pro trial (handled on Auth).
 */
export function TrialCountdownBanner() {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const start = getOfferStart();
    const tick = () => {
      const left = start + OFFER_MS - Date.now();
      setRemaining(left > 0 ? left : 0);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Hide once the offer window has elapsed
  if (remaining === null || remaining <= 0) return null;

  const totalSec = Math.floor(remaining / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;

  return (
    /* Plain div + CSS — keeps framer-motion out of the landing bundle */
    <div className="rp-banner animate-fade-in">
      <div className="rp-banner-inner">
        <div className="rp-banner-card">
          <span className="rp-banner-ic">
            <Gift size={20} strokeWidth={1.75} />
          </span>
          <div className="rp-banner-txt">
            <b>Offre de bienvenue · 7 jours Pro offerts</b>
            <span>Essai complet, sans carte bancaire. Activez-le en créant votre compte.</span>
          </div>
          <div className="rp-banner-cta">
            <span className="rp-countdown" aria-label="Temps restant">
              <Clock size={16} strokeWidth={1.75} />
              {pad(h)}:{pad(m)}:{pad(s)}
            </span>
            <Link to="/auth?tab=register&trial=7" className="rp-btn rp-btn-primary rp-btn-sm">
              Réclamer <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
