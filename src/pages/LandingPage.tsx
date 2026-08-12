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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
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
  { value: "500+", label: "Ateliers équipés" },
  { value: "50K+", label: "Réparations traitées" },
  { value: "99.9%", label: "Taux de disponibilité" },
  { value: "4.8/5", label: "Satisfaction client" },
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
      className="landing-page min-h-screen relative bg-background text-foreground selection:bg-primary/20"
      style={{ scrollBehavior: "smooth" }}
    >
      <SEO
        title="RepairPro — Système de Gestion pour Atelier de Réparation"
        description="Le logiciel de caisse et de gestion d'atelier conçu pour les professionnels de la réparation mobile et informatique."
        path="/"
      />

      {/* ─── Floating Navbar ─── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 relative z-10">
            <img src={repairProLogo} alt="RepairPro" className="h-8 w-8 rounded-lg shadow-sm" width={32} height={32} />
            <span className="text-lg font-bold tracking-tight text-foreground">RepairPro</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Fonctionnalités
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Tarifs
            </a>
            <Button
              variant="outline"
              size="sm"
              onClick={startDemo}
              disabled={demoLoading}
              className="text-sm font-medium"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-1.5 h-4 w-4 text-primary" /> Démo
                </>
              )}
            </Button>
            <Link to="/auth">
              <Button
                variant="ghost"
                size="sm"
                className="text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                Connexion
              </Button>
            </Link>
            <Link to="/auth?tab=register">
              <Button size="sm" className="px-5 text-sm font-medium">
                Créer un compte
              </Button>
            </Link>
          </div>

          <button
            className="md:hidden p-2 relative z-10 text-muted-foreground hover:text-foreground"
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
            className="absolute top-full left-0 right-0 bg-background border-b border-border px-4 pb-4 pt-2 md:hidden shadow-lg"
          >
            <div className="flex flex-col gap-3">
              <a
                href="#features"
                onClick={() => setMenuOpen(false)}
                className="text-sm py-2 font-medium text-muted-foreground"
              >
                Fonctionnalités
              </a>
              <a
                href="#pricing"
                onClick={() => setMenuOpen(false)}
                className="text-sm py-2 font-medium text-muted-foreground"
              >
                Tarifs
              </a>
              <Button
                variant="outline"
                onClick={() => {
                  setMenuOpen(false);
                  startDemo();
                }}
                disabled={demoLoading}
                className="w-full justify-center"
              >
                {demoLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <PlayCircle className="mr-1.5 h-4 w-4 text-primary" /> Essayer la démo
                  </>
                )}
              </Button>
              <Link to="/auth" onClick={() => setMenuOpen(false)}>
                <Button variant="ghost" className="w-full justify-start font-medium text-muted-foreground">
                  Connexion
                </Button>
              </Link>
              <Link to="/auth?tab=register" onClick={() => setMenuOpen(false)}>
                <Button className="w-full">Créer un compte</Button>
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── First-visit trial offer ─── */}
      {!user && <TrialCountdownBanner />}

      {/* ─── Hero ─── */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 overflow-hidden bg-dot-black/[0.03] dark:bg-dot-white/[0.03]">
        <motion.div
          className="relative z-10 mx-auto max-w-5xl px-4 text-center sm:px-6"
          variants={stagger}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={fadeUp}>
            <Badge
              variant="outline"
              className="mb-6 rounded-full px-4 py-1.5 text-xs font-medium border-primary/30 text-primary bg-primary/5"
            >
              Nouveau — Suivi client par lien en temps réel
            </Badge>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold sm:text-5xl lg:text-7xl tracking-tight text-foreground"
            style={{ lineHeight: 1.15 }}
          >
            Le Système de Gestion pour les <br className="hidden sm:block" />
            <span className="text-primary">Ateliers Exigeants.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-muted-foreground leading-relaxed"
          >
            Inventaire intelligent, suivi de réparation en temps réel, facturation B2B et Caisse Enregistreuse. Reprenez
            le contrôle total de votre boutique.
          </motion.p>

          <motion.div
            variants={fadeUp}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
          >
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button size="lg" className="px-8 h-12 text-sm font-semibold w-full">
                Démarrer l'essai gratuit
              </Button>
            </Link>

            <Button
              size="lg"
              variant="outline"
              onClick={startDemo}
              disabled={demoLoading}
              className="px-7 h-12 text-sm font-medium w-full sm:w-auto bg-background"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Voir la démo
                </>
              )}
            </Button>
          </motion.div>

          <motion.p variants={fadeUp} className="mt-4 text-xs text-muted-foreground font-medium">
            Testez avec des données d'exemple — Aucune carte de crédit requise.
          </motion.p>

          {/* Clean, Grounded Dashboard Mockup */}
          <motion.div variants={fadeUp} className="mt-16 sm:mt-24">
            <motion.div
              style={{ opacity: heroOpacity }}
              className="mx-auto max-w-4xl overflow-hidden rounded-xl border border-border bg-card shadow-2xl"
            >
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs font-medium text-muted-foreground">RepairPro — Tableau de bord</span>
                </div>
              </div>
              <div className="p-4 sm:p-6 bg-card text-left">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Réparations", val: "128", trend: "+12%" },
                    { label: "Chiffre d'affaires", val: "12,450 DT", trend: "+8%" },
                    { label: "Pièces en stock", val: "2,341", trend: "Stable" },
                    { label: "Nouveaux clients", val: "48", trend: "+24%" },
                  ].map((s) => (
                    <div key={s.label} className="rounded-lg p-4 border border-border bg-muted/10 shadow-sm">
                      <div className="text-xs font-medium text-muted-foreground mb-1">{s.label}</div>
                      <div className="text-xl font-bold text-foreground">{s.val}</div>
                      <div className="text-[10px] font-medium text-emerald-600 mt-1">{s.trend} ce mois</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 rounded-lg h-36 border border-border bg-muted/10 p-4 shadow-sm flex flex-col justify-end">
                    <div className="text-xs font-medium text-muted-foreground mb-auto">Activité de la semaine</div>
                    <div className="flex items-end gap-2 h-20">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm bg-primary/80 hover:bg-primary transition-colors cursor-pointer"
                          style={{ height: `${h}%` }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg h-36 border border-border bg-muted/10 p-4 shadow-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-3">État des tickets</div>
                    <div className="space-y-3">
                      {[
                        { l: "En cours", w: "75%", c: "bg-blue-500" },
                        { l: "À facturer", w: "60%", c: "bg-emerald-500" },
                        { l: "En attente pièce", w: "30%", c: "bg-amber-500" },
                      ].map((b) => (
                        <div key={b.l}>
                          <div className="flex justify-between text-[10px] font-medium text-muted-foreground mb-1">
                            <span>{b.l}</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden bg-muted">
                            <div className={`h-full rounded-full ${b.c}`} style={{ width: b.w }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative z-10 py-12 border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl font-bold sm:text-3xl text-foreground">{s.value}</div>
              <div className="mt-1 text-xs font-medium sm:text-sm text-muted-foreground">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Features Grid ─── */}
      <section id="features" className="relative z-10 py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl tracking-tight text-foreground">
              Conçu pour l'efficacité opérationnelle
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Des outils professionnels structurés pour centraliser la gestion de votre centre de réparation.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3 auto-rows-[minmax(180px,auto)]">
            {features.map((f) => (
              <div
                key={f.title}
                className={`bg-card border border-border shadow-sm hover:shadow-md transition-shadow rounded-xl p-6 ${f.span}`}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4 border border-primary/20">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-card-foreground">{f.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Extra Value Props ─── */}
      <section className="relative z-10 py-16 border-y border-border bg-muted/30">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              {
                icon: Shield,
                title: "Infrastructure Sécurisée",
                desc: "Base de données isolée par boutique (RLS) et sauvegardes automatiques.",
              },
              {
                icon: Zap,
                title: "Productivité Maximale",
                desc: "Recherche ultra-rapide, raccourcis clavier et navigation sans rechargement.",
              },
              {
                icon: Smartphone,
                title: "Accessibilité Multi-Support",
                desc: "Interface responsive optimisée pour les ordinateurs, tablettes et mobiles.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 items-start">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background border border-border shadow-sm">
                  <item.icon className="h-5 w-5 text-foreground" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing ─── */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold sm:text-4xl tracking-tight text-foreground">
              Des tarifs simples et transparents
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
              Pas de frais cachés. Évoluez sereinement selon les besoins de votre entreprise.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {displayPlans.map((plan) => (
              <div key={plan.id}>
                <div
                  className={`bg-card rounded-2xl p-6 sm:p-8 flex flex-col h-full relative border transition-shadow ${
                    plan.highlight
                      ? "border-primary shadow-lg ring-1 ring-primary/10"
                      : "border-border shadow-sm hover:shadow-md"
                  }`}
                >
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="rounded-full px-4 py-1 text-xs font-semibold bg-primary text-primary-foreground border-0 shadow-sm">
                        Plan Recommandé
                      </Badge>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-lg font-bold mb-1 text-card-foreground">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground font-medium">{plan.description}</p>
                    <div className="mt-6 flex items-end gap-1">
                      <span className="text-4xl font-extrabold text-foreground tracking-tight">
                        {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                      </span>
                      {plan.period && (
                        <span className="text-sm font-medium text-muted-foreground mb-1">{plan.period}</span>
                      )}
                    </div>
                  </div>

                  <ul className="flex-1 space-y-3 mb-8 mt-2">
                    {(Array.isArray(plan.features) ? plan.features : ((plan.features as any)?.display ?? [])).map(
                      (feat: string, i: number) => (
                        <li key={i} className="flex items-start gap-3 text-sm font-medium text-muted-foreground">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          {feat}
                        </li>
                      ),
                    )}
                  </ul>

                  <div>
                    {plan.price === 0 ? (
                      <Link to="/auth?tab=register">
                        <Button variant="outline" className="w-full font-semibold">
                          Commencer gratuitement
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handlePlanClick(plan.id)}
                        variant={plan.highlight ? "default" : "outline"}
                        className="w-full font-semibold"
                      >
                        Sélectionner ce plan
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA final ─── */}
      <section className="relative z-10 py-20 sm:py-28 bg-muted/30 border-t border-border">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-bold sm:text-4xl tracking-tight text-foreground">
            Prêt à moderniser votre gestion ?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground">
            Rejoignez les professionnels qui font confiance à RepairPro pour structurer et développer leur activité au
            quotidien.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link to="/auth?tab=register" className="w-full sm:w-auto">
              <Button size="lg" className="px-8 h-12 text-sm font-semibold w-full">
                Créer mon compte
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={startDemo}
              disabled={demoLoading}
              className="px-8 h-12 text-sm font-semibold w-full sm:w-auto bg-background"
            >
              {demoLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <PlayCircle className="mr-2 h-4 w-4 text-muted-foreground" /> Voir la démo
                </>
              )}
            </Button>
          </div>
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8 border-t border-border bg-background">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <img
              src={repairProLogo}
              alt="RepairPro"
              className="h-6 w-6 rounded-md grayscale opacity-80"
              width={24}
              height={24}
              loading="lazy"
            />
            <span className="font-semibold text-sm text-foreground">RepairPro</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">
            © {new Date().getFullYear()} RepairPro. Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  );
}
