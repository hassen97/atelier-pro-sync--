import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useDemoLogin } from "@/hooks/useDemoLogin";
import {
  Package,
  Wrench,
  Truck,
  RotateCcw,
  Menu,
  X,
  Check,
  Smartphone,
  Shield,
  BarChart3,
  Users,
  Zap,
  ArrowRight,
  Sparkles,
  PlayCircle,
  LogIn,
  UserPlus,
  Loader2,
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
  {
    icon: Package,
    title: "Inventaire Intelligent",
    desc: "Gestion de stock avec codes-barres, alertes de seuil, importation Excel et suivi en temps réel.",
    span: "sm:col-span-2 sm:row-span-1",
  },
  {
    icon: Wrench,
    title: "Suivi de Réparations",
    desc: "Tickets numérotés, suivi client par lien, historique de statut et reçus PDF automatiques.",
    span: "sm:col-span-1 sm:row-span-2",
  },
  {
    icon: Truck,
    title: "Comptabilité Fournisseur",
    desc: "Soldes fournisseurs, achats liés au stock, transactions et preuves de paiement.",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    icon: RotateCcw,
    title: "Retours & RMA",
    desc: "Retours produits, scan rapide, tickets garantie et suivi des pièces défectueuses.",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    icon: BarChart3,
    title: "Analytique Avancée",
    desc: "Tableaux de bord, statistiques de ventes et marges en temps réel.",
    span: "sm:col-span-1 sm:row-span-1",
  },
  {
    icon: Users,
    title: "Multi-équipe",
    desc: "Gérez vos employés, assignez des tâches et contrôlez les accès par rôle.",
    span: "sm:col-span-2 sm:row-span-1",
  },
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
  const [updatePhase, setUpdatePhase] = useState<"checking" | "current" | "update" | "done">("checking");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const { data: plans } = usePublicPlans();
  const { startDemo, loading: demoLoading } = useDemoLogin();

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

  const handlePlanClick = (planId: string) => {
    if (user) {
      navigate(`/checkout?plan=${planId}`);
    } else {
      navigate(`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`);
    }
  };

  const displayPlans = plans || [];

  if (updatePhase !== "done") {
    return <UpdateCheckOverlay state={updatePhase} onRefresh={() => applyUpdateNow()} />;
  }

  return (
    <main
      className="landing-page min-h-screen relative text-foreground bg-background"
      style={{ scrollBehavior: "smooth" }}
    >
      <SEO
        title="RepairPro — Gestion d'atelier de réparation mobile"
        description="SaaS tout-en-un pour ateliers de réparation mobile : inventaire, réparations, facturation et suivi clients."
        path="/"
      />
      <div className="lp-mesh-gradient" />

      {/* ─── Floating Navbar ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "lp-navbar-scrolled backdrop-blur-md bg-background/50 border-b border-white/5" : "bg-transparent"}`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 relative z-10">
            <img src={repairProLogo} alt="RepairPro" className="h-8 w-8 rounded-lg" width={32} height={32} />
            <span className="text-lg font-bold tracking-tight text-white">RepairPro</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-white transition-colors">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-white transition-colors">
              Tarifs
            </a>
            <Button
              variant="ghost"
              size="sm"
              onClick={startDemo}
              disabled={demoLoading}
              className="text-sm text-blue-400 hover:text-blue-300 hover:bg-blue-400/10"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-1.5 h-4 w-4" /> Démo
                </>
              )}
            </Button>
            <Link to="/auth">
              <Button variant="ghost" size="sm" className="text-sm text-muted-foreground hover:text-white">
                Connexion
              </Button>
            </Link>
            <Link to="/auth?tab=register">
              <Button
                size="sm"
                className="rounded-full px-5 text-sm font-medium bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-lg shadow-blue-500/25 border-0"
              >
                Créer un compte
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 relative z-10 text-muted-foreground hover:text-white"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Menu"
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-full left-0 right-0 backdrop-blur-xl bg-background/90 border-b border-white/10 px-4 pb-4 pt-2 md:hidden shadow-2xl"
          >
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm py-2 text-muted-foreground">
                Fonctionnalités
              </a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm py-2 text-muted-foreground">
                Tarifs
              </a>
              <Button
                variant="outline"
                onClick={() => {
                  setMenuOpen(false);
                  startDemo();
                }}
                disabled={demoLoading}
                className="w-full justify-center rounded-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10"
              >
                {demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PlayCircle className="mr-1.5 h-4 w-4" /> Essayer la démo
                  </>
                )}
              </Button>
              <Link to="/auth" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-white">
                  Connexion
                </Button>
              </Link>
              <Link to="/auth?tab=register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-full bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25 border-0">
                  Créer un compte
                </Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── First-visit trial offer ─── */}
      {!user && <TrialCountdownBanner />}

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden">
        {/* Cinematic Ambient Glow */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-600/20 blur-[150px] rounded-full pointer-events-none -z-10" />

        <motion.div
          className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Badge className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium border border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Sparkles className="mr-1.5 h-3 w-3" /> Nouveau — Suivi client par lien en temps réel
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold sm:text-5xl lg:text-7xl tracking-tight"
            style={{ lineHeight: 1.1 }}
          >
            <span className="text-white">Votre Boutique</span>
            <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Élevée au Niveau Supérieur.
            </span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed"
          >
            Inventaire intelligent, suivi de réparation en temps réel et facturation en un clic. Reprenez le contrôle
            total de votre activité de réparation mobile.
          </motion.p>

          {/* Optimized Hierarchy CTA */}
          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center"
          >
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 text-sm font-semibold w-full bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-xl shadow-blue-500/20 border-0"
              >
                <UserPlus className="mr-2 h-5 w-5" /> Créer un compte
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={startDemo}
              disabled={demoLoading}
              className="rounded-full px-7 h-12 text-sm font-medium w-full sm:w-auto backdrop-blur-md bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4 text-blue-400" /> Essayer la démo
                </>
              )}
            </Button>

            <Link to="/auth" className="w-full sm:w-auto hidden sm:block">
              <Button
                size="lg"
                variant="ghost"
                className="rounded-full px-4 h-12 text-sm font-medium w-full text-muted-foreground hover:text-white"
              >
                Connexion
              </Button>
            </Link>
          </motion.div>
          <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground/70">
            Testez gratuitement avec des données d'exemple — aucune inscription requise.
          </motion.p>

          {/* 3D Dashboard Mockup */}
          <motion.div variants={fadeUp} className="mt-16 sm:mt-24" style={{ perspective: "1200px" }}>
            <motion.div
              style={{ opacity: heroOpacity }}
              animate={{ rotateX: 5, rotateY: -2 }}
              transition={{ duration: 2, ease: "easeOut" }}
              className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-black/40 backdrop-blur-2xl shadow-[0_30px_60px_-15px_rgba(59,130,246,0.3)]"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-amber-500" />
                  <div className="h-3 w-3 rounded-full bg-emerald-500" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs font-medium text-muted-foreground">RepairPro — Dashboard</span>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-background/80">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                  {[
                    { label: "Réparations", val: "128", color: "text-blue-400" },
                    { label: "Revenus", val: "12,450 DT", color: "text-emerald-400" },
                    { label: "Stock", val: "2,341", color: "text-amber-400" },
                    { label: "Clients", val: "489", color: "text-cyan-400" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg p-3 bg-white/5 border border-white/5">
                      <div className="text-xs mb-1 text-muted-foreground">{s.label}</div>
                      <div className={`text-lg font-bold ${s.color}`}>{s.val}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 rounded-lg h-32 bg-white/5 border border-white/5">
                    <div className="p-3">
                      <div className="text-xs mb-3 text-muted-foreground">Revenus hebdomadaires</div>
                      <div className="flex items-end gap-1.5 h-16">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm bg-blue-500"
                            style={{ height: `${h}%`, opacity: 0.4 + i * 0.1 }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="rounded-lg h-32 bg-white/5 border border-white/5">
                    <div className="p-3">
                      <div className="text-xs mb-2 text-muted-foreground">Statuts</div>
                      <div className="space-y-2">
                        {[
                          { l: "En cours", w: "75%", c: "bg-blue-500" },
                          { l: "Terminé", w: "60%", c: "bg-emerald-500" },
                          { l: "En attente", w: "30%", c: "bg-amber-500" },
                        ].map((b) => (
                          <div key={b.l}>
                            <div className="text-[10px] mb-0.5 text-muted-foreground">{b.l}</div>
                            <div className="h-1.5 rounded-full overflow-hidden bg-white/5">
                              <div className={`h-full rounded-full ${b.c}`} style={{ width: b.w }} />
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
      <section className="relative z-10 py-12 border-y border-white/5 bg-white/[0.02]">
        <motion.div
          className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-50px" }}
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="text-2xl font-bold sm:text-3xl text-white">{s.value}</div>
              <div className="mt-1 text-xs sm:text-sm text-muted-foreground">{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Bento Grid ─── */}
      <section id="features" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <Badge className="mb-4 rounded-full px-4 py-1 text-xs border-blue-500/30 bg-blue-500/10 text-blue-400">
              <Zap className="mr-1 h-3 w-3" /> Fonctionnalités
            </Badge>
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl tracking-tight text-white">
              Tout ce qu'il faut pour votre atelier
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground">
              Des outils professionnels conçus pour simplifier votre quotidien.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-4 sm:grid-cols-3 auto-rows-[minmax(180px,auto)]"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={scaleIn}
                className={`backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl rounded-2xl p-6 hover:bg-white/10 transition-colors ${f.span}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 mb-4 border border-blue-500/20">
                  <f.icon className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-white">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Extra Value Props ─── */}
      <section className="relative z-10 py-16 border-y border-white/5 bg-white/[0.01]">
        <motion.div
          className="mx-auto max-w-5xl px-4 sm:px-6"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Sécurisé", desc: "Données chiffrées, accès par rôle et sauvegarde automatique." },
              { icon: Zap, title: "Ultra Rapide", desc: "Interface optimisée, chargement instantané et temps réel." },
              {
                icon: Smartphone,
                title: "Mobile First",
                desc: "Conçu pour fonctionner parfaitement sur téléphone et tablette.",
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                  <item.icon className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Pricing (Dynamic) ─── */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl tracking-tight text-white">
              Des tarifs simples et transparents
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground">
              Commencez gratuitement, évoluez quand vous êtes prêt.
            </p>
          </motion.div>

          <motion.div
            className="grid gap-6 sm:grid-cols-3"
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-80px" }}
          >
            {displayPlans.map((plan) => (
              <motion.div key={plan.id} variants={scaleIn}>
                <div
                  className={`backdrop-blur-xl rounded-3xl p-6 sm:p-8 flex flex-col h-full relative border ${
                    plan.highlight
                      ? "bg-blue-900/10 border-blue-500/30 shadow-[0_0_40px_-15px_rgba(59,130,246,0.3)]"
                      : "bg-white/5 border-white/10 shadow-xl"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="rounded-full px-4 py-1 text-xs font-medium shadow-lg bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
                        <Sparkles className="mr-1 h-3 w-3" /> Le plus populaire
                      </Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-semibold mb-1 text-white">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                    <div className="mt-4 flex items-end gap-1">
                      <span className="text-4xl font-bold text-white">
                        {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                      </span>
                      {plan.period && <span className="text-sm text-muted-foreground mb-1">{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8">
                    {(Array.isArray(plan.features) ? plan.features : ((plan.features as any)?.display ?? [])).map(
                      (feat: string, i: number) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-400" />
                          {feat}
                        </li>
                      ),
                    )}
                  </ul>

                  <div>
                    {plan.price === 0 ? (
                      <Link to="/auth?tab=register">
                        <Button className="w-full rounded-full bg-white/10 hover:bg-white/20 text-white border border-white/10">
                          Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handlePlanClick(plan.id)}
                        className={`w-full rounded-full border-0 ${
                          plan.highlight
                            ? "bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25 hover:from-blue-600 hover:to-blue-800"
                            : "bg-white/10 hover:bg-white/20 text-white border border-white/10"
                        }`}
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
      <section className="relative z-10 py-20 sm:py-28 overflow-hidden">
        {/* Subtle glow for footer CTA */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-blue-600/10 blur-[100px] rounded-full pointer-events-none -z-10" />

        <motion.div
          className="mx-auto max-w-3xl px-4 text-center sm:px-6 relative z-10"
          variants={stagger}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          <motion.h2 variants={fadeUp} className="text-3xl font-bold sm:text-4xl tracking-tight text-white">
            Prêt à digitaliser votre atelier ?
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-muted-foreground">
            Rejoignez des centaines d'ateliers qui utilisent RepairPro pour gérer leur activité au quotidien.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="rounded-full px-8 h-12 text-sm font-semibold w-full bg-gradient-to-br from-blue-500 to-blue-700 text-white hover:from-blue-600 hover:to-blue-800 shadow-xl shadow-blue-500/20 border-0"
              >
                <UserPlus className="mr-2 h-5 w-5" /> Créer un compte
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={startDemo}
              disabled={demoLoading}
              className="rounded-full px-8 h-12 text-sm font-medium w-full sm:w-auto backdrop-blur-md bg-white/5 border-white/10 text-white hover:bg-white/10"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4 text-blue-400" /> Essayer la démo
                </>
              )}
            </Button>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8 border-t border-white/5 bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img
              src={repairProLogo}
              alt="RepairPro"
              className="h-6 w-6 rounded-md"
              width={24}
              height={24}
              loading="lazy"
            />
            <span className="font-semibold text-sm text-white/80">RepairPro</span>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} RepairPro. Tous droits réservés.</p>
        </div>
      </footer>
    </main>
  );
}
