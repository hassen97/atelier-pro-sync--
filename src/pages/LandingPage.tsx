import { useEffect, useRef, useState } from "react";
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
import { TrustBar } from "@/components/landing/TrustBar";
import { ProductShowcase } from "@/components/landing/ProductShowcase";
import { Reveal } from "@/components/landing/Reveal";
import { BlueprintSteps } from "@/components/landing/BlueprintSteps";
import { ToolWall } from "@/components/landing/ToolWall";
import { TelemetryStrip } from "@/components/landing/TelemetryStrip";
import { FeaturedPartners } from "@/components/landing/FeaturedPartners";
import { FeaturedShopsRow } from "@/components/landing/FeaturedShopsRow";
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
  const navRef = useRef<HTMLElement | null>(null);
  const progressRef = useRef<HTMLSpanElement | null>(null);

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

  // Floating nav condense + top scroll-progress beam. One passive listener,
  // rAF-throttled, writes straight to the DOM (no re-render per scroll frame).
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY || 0;
        navRef.current?.classList.toggle("rp-nav-scrolled", y > 8);
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        const p = max > 0 ? Math.min(1, y / max) : 0;
        if (progressRef.current) progressRef.current.style.transform = `scaleX(${p})`;
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const handlePlanClick = (planId: string) => {
    if (user) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`);
    }
  };

  return (
    <main id="contenu" tabIndex={-1} className="rp-landing" style={{ scrollBehavior: "smooth", minHeight: "100dvh" }}>
      <a href="#contenu" className="rp-skip">Aller au contenu</a>
      <div className="rp-grain" aria-hidden="true" />
      <div className="rp-progress" aria-hidden="true">
        <span ref={progressRef} />
      </div>
      <SEO
        title="RepairPro — Gestion d'atelier de réparation mobile"
        description="SaaS tout-en-un pour ateliers de réparation mobile : inventaire, réparations, facturation et suivi clients."
        path="/"
      />

      {/* ─── Navbar ─── */}
      <nav className="rp-nav" ref={navRef}>
        <div className="rp-container rp-nav-inner">
          <Link to="/" className="rp-logo">
            <span className="rp-logo-mark">
              <img src={repairProLogo} alt="RepairPro" width={18} height={18} />
            </span>
            REPAIRPRO<span style={{ color: "var(--rp-muted)" }}>//tn</span>
          </Link>

          <div className="rp-nav-links">
            <a href="#atelier" className="rp-link">Atelier</a>
            <a href="#produit" className="rp-link">Produit</a>
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
            <a href="#produit" className="rp-link" onClick={() => setMenuOpen(false)}>Produit</a>
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

      <FeaturedShopsRow />

      <IndustrialHero startDemo={startDemo} demoLoading={demoLoading} />
      <FeaturedPartners />
      <TrustBar />
      <BlueprintSteps />
      <ProductShowcase />
      <ToolWall />
      <TelemetryStrip />
      <WorkshopVisits />
      <IndustrialPricing plans={plans || []} onPlanClick={handlePlanClick} />
      <TerminalFAQ />

      {/* ─── Final CTA ─── */}
      <section className="rp-final">
        <Reveal>
        <div className="rp-container">
          <span className="rp-eyebrow">Atelier · ouverture imminente</span>
          <h2>
            Prêt à ouvrir
            <br />
            votre atelier <span className="rp-grad">numérique</span> ?
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
        </Reveal>
      </section>

      <IndustrialFooter />
    </main>
  );
}
