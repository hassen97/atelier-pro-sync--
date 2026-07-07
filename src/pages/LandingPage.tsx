import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useDemoLogin } from "@/hooks/useDemoLogin";
import {
  Package, Wrench, Truck, RotateCcw,
  Menu, X, ChevronRight, Check, Smartphone,
  Shield, BarChart3, Users, Zap, ArrowRight,
  Sparkles, PlayCircle, LogIn, UserPlus, Loader2
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";
import { getUpdateStatus, applyUpdateNow } from "@/lib/swUpdate";
import { UpdateCheckOverlay } from "@/components/landing/UpdateCheckOverlay";
import repairProLogo from "@/assets/repairpro-logo.png";
import { TrialCountdownBanner } from "@/components/landing/TrialCountdownBanner";


/* ── animation variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};

/* ── data ── */
const features = [
  { icon: Package, title: "Inventaire Intelligent", desc: "Gestion de stock avec codes-barres, alertes de seuil, importation Excel et suivi en temps réel.", span: "sm:col-span-2 sm:row-span-1" },
  { icon: Wrench, title: "Suivi de Réparations", desc: "Tickets numérotés, suivi client par lien, historique de statut et reçus PDF automatiques.", span: "sm:col-span-1 sm:row-span-2" },
  { icon: Truck, title: "Comptabilité Fournisseur", desc: "Soldes fournisseurs, achats liés au stock, transactions et preuves de paiement.", span: "sm:col-span-1 sm:row-span-1" },
  { icon: RotateCcw, title: "Retours & RMA", desc: "Retours produits, scan rapide, tickets garantie et suivi des pièces défectueuses.", span: "sm:col-span-1 sm:row-span-1" },
  { icon: BarChart3, title: "Analytique Avancée", desc: "Tableaux de bord, statistiques de ventes et marges en temps réel.", span: "sm:col-span-1 sm:row-span-1" },
  { icon: Users, title: "Multi-équipe", desc: "Gérez vos employés, assignez des tâches et contrôlez les accès par rôle.", span: "sm:col-span-2 sm:row-span-1" },
];

const stats = [
  { value: "500+", label: "Ateliers actifs" },
  { value: "50K+", label: "Réparations suivies" },
  { value: "99.9%", label: "Disponibilité" },
  { value: "4.8/5", label: "Satisfaction" },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [updatePhase, setUpdatePhase] = useState<
    "checking" | "current" | "update" | "done"
  >("checking");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const { data: plans } = usePublicPlans();
  const { startDemo, loading: demoLoading } = useDemoLogin();


  // On open: run a status-returning update check, then drive the 3D overlay.
  //  - "current": play a brief confirmation beat, then reveal the landing page.
  //  - "update":  show a blocking refresh prompt (mandatory) until the user
  //               clears the cache and reloads into the latest version.
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    getUpdateStatus(2500)
      .then((status) => {
        if (!active) return;
        if (status === "update") {
          setUpdatePhase("update");
        } else {
          setUpdatePhase("current");
          timer = setTimeout(() => active && setUpdatePhase("done"), 1500);
        }
      })
      .catch(() => active && setUpdatePhase("done"));
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const ctaLink = user ? "/dashboard" : "/auth";

  const handlePlanClick = (planId: string) => {
    if (user) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`);
    }
  };



  const displayPlans = plans || [];

  // 3D update-check overlay while we verify the visitor is on the latest build.
  if (updatePhase !== "done") {
    return (
      <UpdateCheckOverlay
        state={updatePhase}
        onRefresh={() => applyUpdateNow()}
      />
    );
  }


  return (
    <main className="landing-page min-h-screen relative" style={{ scrollBehavior: "smooth" }}>
      <SEO
        title="RepairPro — Gestion d'atelier de réparation mobile"
        description="SaaS tout-en-un pour ateliers de réparation mobile : inventaire, réparations, facturation et suivi clients."
        path="/"
      />
      <div className="lp-mesh-gradient" />

      {/* ─── Floating Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "lp-navbar-scrolled" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 relative z-10">
            <img src={repairProLogo} alt="RepairPro" className="h-8 w-8 rounded-lg" width={32} height={32} />

            <span className="text-lg font-bold tracking-tight" style={{ color: "hsl(0 0% 98%)" }}>RepairPro</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm transition-colors" style={{ color: "hsl(240 5% 55%)" }} onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 98%)")} onMouseLeave={e => (e.currentTarget.style.color = "hsl(240 5% 55%)")}>
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm transition-colors" style={{ color: "hsl(240 5% 55%)" }} onMouseEnter={e => (e.currentTarget.style.color = "hsl(0 0% 98%)")} onMouseLeave={e => (e.currentTarget.style.color = "hsl(240 5% 55%)")}>
              Tarifs
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={startDemo}
              disabled={demoLoading}
              className="text-sm"
              style={{ color: "hsl(217 91% 70%)" }}
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="mr-1.5 h-4 w-4" /> Démo</>}
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm" style={{ color: "hsl(240 5% 65%)" }}>Connexion</Button>
            </Link>
            <Link to="/auth?tab=register">
              <Button size="sm" className="lp-glow-btn rounded-full px-5 text-sm font-medium" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%))", color: "white" }}>
                Créer un compte
              </Button>
            </Link>

          </div>

          <button className="md:hidden p-2 relative z-10" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ color: "hsl(240 5% 65%)" }}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lp-glass px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: "hsl(240 5% 65%)" }}>Fonctionnalités</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: "hsl(240 5% 65%)" }}>Tarifs</a>
              <Button
                variant="outline"
                onClick={() => { setMenuOpen(false); startDemo(); }}
                disabled={demoLoading}
                className="w-full justify-center rounded-full"
                style={{ borderColor: "hsla(217, 91%, 60%, 0.4)", color: "hsl(217 91% 70%)" }}
              >
                {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="mr-1.5 h-4 w-4" /> Essayer la démo</>}
              </Button>
              <Link to="/auth" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start" style={{ color: "hsl(240 5% 65%)" }}>Connexion</Button>
              </Link>
              <Link to="/auth?tab=register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-full" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 45%))", color: "white" }}>Créer un compte</Button>
              </Link>

            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        <motion.div className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6" variants={stagger} initial="hidden" animate="visible">
          <motion.div variants={fadeUp}>
            <Badge className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium border" style={{ background: "hsla(217, 91%, 60%, 0.1)", borderColor: "hsla(217, 91%, 60%, 0.2)", color: "hsl(217 91% 70%)" }}>
              <Sparkles className="mr-1.5 h-3 w-3" /> Nouveau — Suivi client par lien en temps réel
            </Badge>
          </motion.div>

          <motion.h1 variants={fadeUp} className="text-4xl font-extrabold sm:text-5xl lg:text-7xl" style={{ letterSpacing: "-0.03em", lineHeight: 1.1 }}>
            <span className="lp-gradient-text">Le Logiciel Tout-en-Un</span>
            <br />
            <span className="lp-gradient-text-accent">pour les Pros du Mobile</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="mx-auto mt-6 max-w-2xl text-base sm:text-lg" style={{ color: "hsl(240 5% 55%)", lineHeight: 1.7 }}>
            Gérez votre inventaire, suivez vos réparations, facturez vos clients et pilotez votre activité
            — le tout depuis une seule plateforme pensée pour les ateliers en Tunisie et en France.
          </motion.p>

          {/* CTA: 3 actions — Démo / Créer un compte / Connexion */}
          <motion.div variants={fadeUp} className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={startDemo}
              disabled={demoLoading}
              className="lp-glow-btn rounded-full px-7 h-12 text-sm font-semibold w-full sm:w-auto"
              style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))", color: "white" }}
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="mr-2 h-5 w-5" /> Essayer la démo</>}
            </Button>
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-7 h-12 text-sm font-medium w-full"
                style={{ background: "hsla(240, 6%, 10%, 0.6)", borderColor: "hsla(0, 0%, 100%, 0.12)", color: "hsl(0 0% 98%)" }}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Créer un compte
              </Button>
            </Link>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full px-7 h-12 text-sm font-medium w-full"
                style={{ color: "hsl(240 5% 70%)" }}
              >
                <LogIn className="mr-2 h-4 w-4" /> Connexion
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-3 text-xs" style={{ color: "hsl(240 5% 40%)" }}>
            Testez gratuitement avec des données d'exemple — aucune inscription requise.
          </motion.p>


          {/* Dashboard Mockup */}
          <motion.div variants={fadeUp} className="mt-16 sm:mt-20">
            <motion.div style={{ opacity: heroOpacity }} className="lp-dashboard-mockup mx-auto max-w-4xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.06)" }}>
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full" style={{ background: "hsl(0 72% 51%)" }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: "hsl(38 92% 50%)" }} />
                  <div className="h-3 w-3 rounded-full" style={{ background: "hsl(152 69% 40%)" }} />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs font-medium" style={{ color: "hsl(240 5% 40%)" }}>RepairPro — Dashboard</span>
                </div>
              </div>
              <div className="p-4 sm:p-6">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Réparations", val: "128", color: "hsl(217 91% 60%)" },
                    { label: "Revenus", val: "12,450 DT", color: "hsl(152 69% 50%)" },
                    { label: "Stock", val: "2,341", color: "hsl(38 92% 55%)" },
                    { label: "Clients", val: "489", color: "hsl(187 72% 50%)" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg p-3" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
                      <div className="text-xs mb-1" style={{ color: "hsl(240 5% 45%)" }}>{s.label}</div>
                      <div className="text-lg font-bold" style={{ color: s.color }}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-lg h-32" style={{ background: "hsla(0, 0%, 100%, 0.02)", border: "1px solid hsla(0, 0%, 100%, 0.04)" }}>
                    <div className="p-3">
                      <div className="text-xs mb-3" style={{ color: "hsl(240 5% 45%)" }}>Revenus hebdomadaires</div>
                      <div className="flex items-end gap-1.5 h-16">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div key={i} className="flex-1 rounded-sm" style={{ height: `${h}%`, background: `hsla(217, 91%, 60%, ${0.3 + i * 0.1})` }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg h-32" style={{ background: "hsla(0, 0%, 100%, 0.02)", border: "1px solid hsla(0, 0%, 100%, 0.04)" }}>
                    <div className="p-3">
                      <div className="text-xs mb-2" style={{ color: "hsl(240 5% 45%)" }}>Statuts</div>
                      <div className="space-y-2">
                        {[
                          { l: "En cours", w: "75%", c: "hsl(217 91% 60%)" },
                          { l: "Terminé", w: "60%", c: "hsl(152 69% 50%)" },
                          { l: "En attente", w: "30%", c: "hsl(38 92% 55%)" },
                        ].map((b) => (
                          <div key={b.l}>
                            <div className="text-[10px] mb-0.5" style={{ color: "hsl(240 5% 40%)" }}>{b.l}</div>
                            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsla(0, 0%, 100%, 0.05)" }}>
                              <div className="h-full rounded-full" style={{ width: b.w, background: b.c }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative z-10 py-12" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.05)", borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
        <motion.div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-2xl font-bold sm:text-3xl lp-gradient-text-accent">{s.value}</div>
              <div className="mt-1 text-xs sm:text-sm" style={{ color: "hsl(240 5% 45%)" }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Bento Grid ─── */}
      <section id="features" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div className="text-center mb-16" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <Badge className="mb-4 rounded-full px-4 py-1 text-xs" style={{ background: "hsla(217, 91%, 60%, 0.1)", borderColor: "hsla(217, 91%, 60%, 0.2)", color: "hsl(217 91% 70%)" }}>
              <Zap className="mr-1 h-3 w-3" /> Fonctionnalités
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl lp-gradient-text" style={{ letterSpacing: "-0.02em" }}>
              Tout ce qu'il faut pour votre atelier
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: "hsl(240 5% 50%)" }}>
              Des outils professionnels conçus pour simplifier votre quotidien.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-3 auto-rows-[minmax(180px,auto)]"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn} className={`lp-glass-card lp-bento-card rounded-xl p-6 ${f.span}`}>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg mb-4" style={{ background: "hsla(217, 91%, 60%, 0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: "hsl(217 91% 65%)" }} />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: "hsl(0 0% 95%)" }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(240 5% 50%)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Extra Value Props ─── */}
      <section className="relative z-10 py-16" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.05)", borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
        <motion.div className="mx-auto max-w-5xl px-4 sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Sécurisé", desc: "Données chiffrées, accès par rôle et sauvegarde automatique." },
              { icon: Zap, title: "Ultra Rapide", desc: "Interface optimisée, chargement instantané et temps réel." },
              { icon: Smartphone, title: "Mobile First", desc: "Conçu pour fonctionner parfaitement sur téléphone et tablette." },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "hsla(217, 91%, 60%, 0.08)" }}>
                  <item.icon className="h-5 w-5" style={{ color: "hsl(217 91% 65%)" }} />
                </div>
                <div>
                  <h3 className="font-semibold" style={{ color: "hsl(0 0% 95%)" }}>{item.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: "hsl(240 5% 50%)" }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Pricing (Dynamic) ─── */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <motion.div className="text-center mb-16" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl lp-gradient-text" style={{ letterSpacing: "-0.02em" }}>
              Des tarifs simples et transparents
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: "hsl(240 5% 50%)" }}>
              Commencez gratuitement, évoluez quand vous êtes prêt.
            </p>
          </motion.div>

          <motion.div className="grid gap-6 sm:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            {displayPlans.map((plan) => (
              <motion.div key={plan.id} variants={scaleIn}>
                <div className={`lp-glass-card rounded-2xl p-6 sm:p-8 flex flex-col h-full relative ${plan.highlight ? "lp-pricing-popular" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="rounded-full px-4 py-1 text-xs font-medium shadow-lg" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(187 72% 50%))", color: "white", border: "none" }}>
                        <Sparkles className="mr-1 h-3 w-3" /> Le plus populaire
                      </Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-1" style={{ color: "hsl(0 0% 95%)" }}>{plan.name}</h3>
                    <p className="text-sm" style={{ color: "hsl(240 5% 45%)" }}>{plan.description}</p>
                    <div className="mt-4">
                      <span className="text-4xl font-bold lp-gradient-text">
                        {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                      </span>
                      {plan.period && <span className="text-sm ml-1" style={{ color: "hsl(240 5% 45%)" }}>{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {(Array.isArray(plan.features) ? plan.features : ((plan.features as any)?.display ?? [])).map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "hsl(240 5% 60%)" }}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(217 91% 60%)" }} />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <div>
                    {plan.price === 0 ? (
                      <Link to={ctaLink}>
                        <Button className="w-full rounded-full lp-glow-btn" style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))", color: "white" }}>
                          Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handlePlanClick(plan.id)}
                        className="w-full rounded-full lp-glow-btn"
                        style={{ background: plan.highlight ? "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))" : "hsla(0, 0%, 100%, 0.06)", color: plan.highlight ? "white" : "hsl(0 0% 90%)", border: plan.highlight ? "none" : "1px solid hsla(0, 0%, 100%, 0.1)" }}
                      >
                        Choisir ce plan <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="relative z-10 py-20 sm:py-28">
        <motion.div className="mx-auto max-w-3xl px-4 text-center sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl lp-gradient-text" style={{ letterSpacing: "-0.02em" }}>
            Prêt à digitaliser votre atelier ?
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: "hsl(240 5% 50%)" }}>
            Rejoignez des centaines d'ateliers qui utilisent RepairPro pour gérer leur activité au quotidien.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button
              size="lg"
              onClick={startDemo}
              disabled={demoLoading}
              className="lp-glow-btn rounded-full px-8 h-12 text-sm font-semibold w-full sm:w-auto"
              style={{ background: "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))", color: "white" }}
            >
              {demoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PlayCircle className="mr-2 h-5 w-5" /> Essayer la démo</>}
            </Button>
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 h-12 text-sm font-medium w-full"
                style={{ background: "hsla(240, 6%, 10%, 0.6)", borderColor: "hsla(0, 0%, 100%, 0.12)", color: "hsl(0 0% 98%)" }}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Créer un compte
              </Button>
            </Link>
            <Link to="/auth" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full px-8 h-12 text-sm font-medium w-full"
                style={{ color: "hsl(240 5% 70%)" }}
              >
                <LogIn className="mr-2 h-4 w-4" /> Connexion
              </Button>
            </Link>
          </motion.div>
        </motion.div>
      </section>


      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8" style={{ borderTop: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img src={repairProLogo} alt="RepairPro" className="h-6 w-6 rounded-md" width={24} height={24} loading="lazy" />

            <span className="font-semibold text-sm" style={{ color: "hsl(0 0% 85%)" }}>RepairPro</span>
          </div>
          <p className="text-xs" style={{ color: "hsl(240 5% 35%)" }}>
            © {new Date().getFullYear()} RepairPro. Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  );
}
