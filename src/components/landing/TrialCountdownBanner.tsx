import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
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
 * First-visit urgency banner: a per-visitor 24h countdown. Signing up while the
 * timer is live grants a 7-day Pro trial (handled on the Auth page).
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
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative z-30 mx-auto max-w-5xl px-4 pt-24 sm:pt-28"
    >
      <div className="rounded-2xl border border-emerald-400/25 bg-gradient-to-r from-emerald-500/10 via-emerald-400/5 to-transparent backdrop-blur-sm p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-500/15 flex items-center justify-center">
            <Gift className="h-5 w-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm sm:text-base">
              Offre de bienvenue : 7 jours Pro gratuits
            </p>
            <p className="text-emerald-300/80 text-xs sm:text-sm">
              Créez votre compte avant la fin du compte à rebours pour en profiter.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-white">
            <Clock className="h-4 w-4 text-emerald-400" />
            <span className="font-mono font-bold tabular-nums text-base sm:text-lg tracking-tight">
              {pad(h)}:{pad(m)}:{pad(s)}
            </span>
          </div>
          <Link
            to="/auth?tab=register&trial=7"
            className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-semibold text-sm px-4 py-2 transition-colors"
          >
            Réclamer <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
