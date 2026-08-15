import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useDemoLogin } from "@/hooks/useDemoLogin";
import { Menu, X, PlayCircle, Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { SEO } from "@/components/seo/SEO";
import { getUpdateStatus, applyUpdateNow } from "@/lib/swUpdate";
import { TrialCountdownBanner } from "@/components/landing/TrialCountdownBanner";
import { IndustrialHero } from "@/components/landing/IndustrialHero";
import { BlueprintSteps } from "@/components/landing/BlueprintSteps";
import { ToolWall } from "@/components/landing/ToolWall";
import { TelemetryStrip } from "@/components/landing/TelemetryStrip";
import { WorkshopVisits } from "@/components/landing/WorkshopVisits";
import { IndustrialPricing } from "@/components/landing/IndustrialPricing";
import { TerminalFAQ } from "@/components/landing/TerminalFAQ";
import { IndustrialFooter } from "@/components/landing/IndustrialFooter";
import repairProLogo from "@/assets/repairpro-logo.png";
import "@/components/landing/industrial.css";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: plans } = usePublicPlans();
  const { startDemo, loading: demoLoading } = useDemoLogin();

  // Non-blocking update check: the landing renders immediately; a newer
  // deployment only surfaces as a persistent toast (never a full-screen gate).
  useEffect(() => {
    getUpdateStatus(2500)
      .then((status) => {
        if (status !== "update") return;
        toast("Nouvelle version disponible", {
          description: "Actualisez pour charger la dernière version.",
          duration: Infinity,
          action: { label: "Rafraîchir", onClick: () => applyUpdateNow() },
        });
      })
      .catch(() => {
        /* silent — the landing must never be blocked by the update check */
      });
  }, []);

  const handlePlanClick = (planId: string) => {
    if (user) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`);
    }
  };

  return (
    <main className="rp-landing" style={{ scrollBehavior: "smooth", minHeight: "100vh" }}>
      <SEO
        title="RepairPro — Gestion d'atelier de réparation mobile"
        description="SaaS tout-en-un pour ateliers de réparation mobile : inventaire, réparations, facturation et suivi clients."
        path="/"
      />

      {/* ─── Navbar ─── */}
      <nav className="rp-nav">
        <div className="rp-container rp-nav-inner">
          <Link to="/" className="rp-logo">
            <span className="rp-logo-mark">
              <img src={repairProLogo} alt="RepairPro" width={18} height={18} />
            </span>
            REPAIRPRO<span style={{ color: "var(--rp-muted)" }}>//tn</span>
          </Link>

          <div className="rp-nav-links">
            <a href="#atelier" className="rp-link">Atelier</a>
            <a href="#outils" className="rp-link">Outils</a>
            <a href="#tarifs" className="rp-link">Tarifs</a>
            <a href="#faq" className="rp-link">FAQ</a>
            <button
              className="rp-btn rp-btn-ghost rp-btn-sm rp-desktop-only"
              onClick={startDemo}
              disabled={demoLoading}
            >
              {demoLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Démo
            </button>
            <Link to="/auth" className="rp-btn rp-btn-ghost rp-btn-sm rp-desktop-only">
              Connexion
            </Link>
            <Link to="/auth?tab=register" className="rp-btn rp-btn-primary rp-btn-sm">
              Créer un compte
            </Link>
            <button
              className="rp-burger rp-btn rp-btn-ghost rp-btn-sm"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Menu"
            >
              {menuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="rp-mobile-menu">
            <a href="#atelier" className="rp-link" onClick={() => setMenuOpen(false)}>Atelier</a>
            <a href="#outils" className="rp-link" onClick={() => setMenuOpen(false)}>Outils</a>
            <a href="#tarifs" className="rp-link" onClick={() => setMenuOpen(false)}>Tarifs</a>
            <a href="#faq" className="rp-link" onClick={() => setMenuOpen(false)}>FAQ</a>
            <button
              className="rp-btn rp-btn-ghost"
              onClick={() => {
                setMenuOpen(false);
                startDemo();
              }}
              disabled={demoLoading}
            >
              {demoLoading ? <Loader2 size={14} className="animate-spin" /> : <PlayCircle size={14} />}
              Essayer la démo
            </button>
            <Link to="/auth" className="rp-btn rp-btn-ghost" onClick={() => setMenuOpen(false)}>
              Connexion
            </Link>
            <Link to="/auth?tab=register" className="rp-btn rp-btn-primary" onClick={() => setMenuOpen(false)}>
              Créer un compte
            </Link>
          </div>
        )}
      </nav>

      {/* ─── First-visit trial offer ─── */}
      {!user && <TrialCountdownBanner />}

      <IndustrialHero startDemo={startDemo} demoLoading={demoLoading} />
      <BlueprintSteps />
      <ToolWall />
      <TelemetryStrip />
      <WorkshopVisits />
      <IndustrialPricing plans={plans || []} onPlanClick={handlePlanClick} />
      <TerminalFAQ />

      {/* ─── Final CTA ─── */}
      <section className="rp-final">
        <div className="rp-container">
          <span className="rp-eyebrow">Atelier · ouverture imminente</span>
          <h2>
            Prêt à ouvrir
            <br />
            votre atelier numérique ?
          </h2>
          <p>Rejoignez les réparateurs qui ont abandonné le cahier pour RepairPro.</p>
          <div className="rp-hero-cta">
            <Link to="/auth?tab=register" className="rp-btn rp-btn-primary">
              <UserPlus size={16} /> Ouvrir mon atelier
            </Link>
            <button className="rp-btn rp-btn-ghost" onClick={startDemo} disabled={demoLoading}>
              {demoLoading ? <Loader2 size={16} className="animate-spin" /> : <PlayCircle size={16} />}
              Démo sans inscription
            </button>
          </div>
        </div>
      </section>

      <IndustrialFooter />
    </main>
  );
}
