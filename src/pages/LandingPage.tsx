import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, useScroll, useTransform } from "framer-motion";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useJoinWaitlist } from "@/hooks/useWaitlist";
import {
  Package, Wrench, Truck, RotateCcw,
  Menu, X, Check, Smartphone,
  Shield, BarChart3, Users, Zap, ArrowRight,
  Mail, Loader2,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";

/* ── animation variants (snappy) ── */
const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const scaleIn = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
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

/* ── palette ── */
const EMERALD_DEEP = "#064e3b";
const EMERALD = "#0d7a5f";
const GOLD = "#c9a84c";
const CREAM = "#f5f0e0";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.18], [1, 0.4]);
  const { data: plans } = usePublicPlans();
  const joinWaitlist = useJoinWaitlist();

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

  const handleWaitlistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const email = waitlistEmail.trim();
    if (!email || !email.includes("@")) return;

    // Derive a candidate username from the local part of the email
    const localPart = email.split("@")[0] || "";
    let username = localPart.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/^_+|_+$/g, "");
    if (username.length < 3) username = (username + "_user").slice(0, 20);
    if (username.length > 20) username = username.slice(0, 20);

    const goToSignup = () => {
      setWaitlistEmail("");
      const params = new URLSearchParams({ tab: "register", email, username });
      navigate(`/auth?${params.toString()}`);
    };

    joinWaitlist.mutate(email, {
      onSuccess: goToSignup,
      onError: goToSignup,
    });
  };

  const displayPlans = plans || [];

  return (
    <main className="landing-page min-h-screen relative" style={{ scrollBehavior: "smooth" }}>
      <SEO
        title="RepairPro — Gestion d'atelier de réparation mobile"
        description="SaaS tout-en-un pour ateliers de réparation mobile : inventaire, réparations, facturation et suivi clients."
        path="/"
      />
      <div className="lp-mesh-gradient" />

      {/* ─── Navbar ─── */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "lp-navbar-scrolled" : "bg-transparent"}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5 relative z-10">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: EMERALD_DEEP }}>
              <div className="h-5 w-3.5 rounded-sm border-2" style={{ borderColor: GOLD }} />
            </div>
            <span className="font-display text-xl uppercase tracking-tight" style={{ color: EMERALD_DEEP }}>RepairPro</span>
          </Link>

          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm font-medium uppercase tracking-widest transition-colors" style={{ color: EMERALD_DEEP }} onMouseEnter={e => (e.currentTarget.style.color = EMERALD)} onMouseLeave={e => (e.currentTarget.style.color = EMERALD_DEEP)}>
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm font-medium uppercase tracking-widest transition-colors" style={{ color: EMERALD_DEEP }} onMouseEnter={e => (e.currentTarget.style.color = EMERALD)} onMouseLeave={e => (e.currentTarget.style.color = EMERALD_DEEP)}>
              Tarifs
            </a>
            <Link to="/auth" className="text-sm font-medium uppercase tracking-widest transition-colors" style={{ color: EMERALD_DEEP }} onMouseEnter={e => (e.currentTarget.style.color = EMERALD)} onMouseLeave={e => (e.currentTarget.style.color = EMERALD_DEEP)}>
              Connexion
            </Link>
            <a href="#waitlist">
              <Button size="sm" className="rounded-full px-6 text-sm font-semibold transition-all" style={{ background: EMERALD_DEEP, color: CREAM }} onMouseEnter={e => (e.currentTarget.style.background = EMERALD)} onMouseLeave={e => (e.currentTarget.style.background = EMERALD_DEEP)}>
                Rejoindre la liste
              </Button>
            </a>
          </div>

          <button className="md:hidden p-2 relative z-10" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu" style={{ color: EMERALD_DEEP }}>
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {menuOpen && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lp-glass px-4 pb-4 pt-2 md:hidden">
            <div className="flex flex-col gap-3">
              <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm py-2 font-medium uppercase tracking-widest" style={{ color: EMERALD_DEEP }}>Fonctionnalités</a>
              <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm py-2 font-medium uppercase tracking-widest" style={{ color: EMERALD_DEEP }}>Tarifs</a>
              <Link to="/auth" onClick={() => setMenuOpen(false)} className="text-sm py-2 font-medium uppercase tracking-widest" style={{ color: EMERALD_DEEP }}>Connexion</Link>
              <a href="#waitlist" onClick={() => setMenuOpen(false)}>
                <Button className="w-full rounded-full font-semibold" style={{ background: EMERALD_DEEP, color: CREAM }}>Rejoindre la liste</Button>
              </a>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ─── Hero (split-screen) ─── */}
      <section className="relative pt-28 pb-16 sm:pt-36 sm:pb-24 overflow-hidden">
        <div className="relative z-10 mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-4 sm:px-6 lg:grid-cols-2 lg:gap-16">
          {/* Content side */}
          <motion.div className="space-y-7" variants={stagger} initial="hidden" animate="visible">
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-widest" style={{ borderColor: "rgba(201,168,76,0.4)", background: "rgba(201,168,76,0.12)", color: EMERALD }}>
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" style={{ background: GOLD }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: GOLD }} />
                </span>
                Nouveau — Suivi client par lien en temps réel
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} className="font-display text-4xl uppercase leading-[0.98] sm:text-5xl lg:text-6xl xl:text-7xl" style={{ color: EMERALD_DEEP, letterSpacing: "-0.02em" }}>
              Le Logiciel{" "}
              <span style={{ color: EMERALD }}>Tout-en-Un</span>
              <br />
              pour les Pros
            </motion.h1>

            <motion.p variants={fadeUp} className="max-w-xl text-base leading-relaxed sm:text-lg" style={{ color: EMERALD }}>
              Gérez votre inventaire, suivez vos réparations, facturez vos clients et pilotez votre activité
              — le tout depuis une seule plateforme pensée pour les ateliers en Tunisie et en France.
            </motion.p>

            {/* Waitlist CTA */}
            <motion.div variants={fadeUp} id="waitlist" className="max-w-md pt-1">
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3 sm:flex-row">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "rgba(13,122,95,0.5)" }} />
                  <Input
                    type="email"
                    placeholder="votre@email.com"
                    value={waitlistEmail}
                    onChange={e => setWaitlistEmail(e.target.value)}
                    className="h-12 rounded-lg border-2 bg-white pl-10 text-sm shadow-sm focus-visible:ring-0"
                    style={{ borderColor: "rgba(6,78,59,0.12)", color: EMERALD_DEEP }}
                    onFocus={e => (e.currentTarget.style.borderColor = GOLD)}
                    onBlur={e => (e.currentTarget.style.borderColor = "rgba(6,78,59,0.12)")}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={joinWaitlist.isPending}
                  className="h-12 shrink-0 rounded-lg px-7 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  style={{ background: GOLD, color: EMERALD_DEEP }}
                >
                  {joinWaitlist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Rejoindre <ArrowRight className="ml-1.5 h-4 w-4" /></>}
                </Button>
              </form>
              <p className="mt-3 text-xs font-medium" style={{ color: "rgba(13,122,95,0.65)" }}>
                Rejoignez la liste d'attente — soyez parmi les premiers alertés au lancement.
              </p>
            </motion.div>

            {/* Social proof */}
            <motion.div variants={fadeUp} className="flex items-center gap-4 pt-1">
              <div className="flex -space-x-2">
                <div className="h-8 w-8 rounded-full border-2" style={{ borderColor: CREAM, background: EMERALD }} />
                <div className="h-8 w-8 rounded-full border-2" style={{ borderColor: CREAM, background: GOLD }} />
                <div className="h-8 w-8 rounded-full border-2" style={{ borderColor: CREAM, background: EMERALD_DEEP }} />
              </div>
              <p className="text-sm" style={{ color: "rgba(6,78,59,0.6)" }}>Rejoignez +500 ateliers déjà actifs</p>
            </motion.div>
          </motion.div>

          {/* Product / proof side */}
          <motion.div className="relative" variants={scaleIn} initial="hidden" animate="visible">
            <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full blur-3xl" style={{ background: "rgba(13,122,95,0.1)" }} />
            <div className="absolute -bottom-12 -left-12 h-48 w-48 rounded-full blur-3xl" style={{ background: "rgba(201,168,76,0.15)" }} />

            <motion.div style={{ opacity: heroOpacity }} className="lp-dashboard-mockup relative overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3" style={{ background: EMERALD_DEEP }}>
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(245,240,224,0.2)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(245,240,224,0.2)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "rgba(245,240,224,0.2)" }} />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "rgba(245,240,224,0.45)" }}>RepairPro — Dashboard</span>
                <div className="w-8" />
              </div>

              <div className="space-y-6 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4" style={{ borderColor: "rgba(13,122,95,0.12)", background: "rgba(245,240,224,0.35)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "rgba(13,122,95,0.7)" }}>Réparations</p>
                    <p className="font-display text-2xl" style={{ color: EMERALD_DEEP }}>128</p>
                  </div>
                  <div className="rounded-xl border p-4" style={{ borderColor: "rgba(201,168,76,0.35)", background: "rgba(201,168,76,0.08)" }}>
                    <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "#a8862f" }}>Revenus</p>
                    <p className="font-display text-2xl" style={{ color: EMERALD_DEEP }}>12,450 DT</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-end justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider" style={{ color: EMERALD_DEEP }}>Activité Hebdomadaire</h4>
                    <span className="text-[10px] font-bold" style={{ color: EMERALD }}>+12% cette semaine</span>
                  </div>
                  <div className="flex h-32 items-end justify-between gap-2">
                    {[40, 65, 50, 90, 45, 100, 55].map((h, i) => (
                      <div key={i} className="w-full rounded-t-sm" style={{ height: `${h}%`, background: h === 100 ? GOLD : EMERALD, opacity: h === 100 ? 1 : 0.25 + (h / 100) * 0.6 }} />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl p-4" style={{ background: EMERALD_DEEP, color: CREAM }}>
                  <div className="mb-4 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Statuts de réparation</span>
                    <span className="rounded px-2 py-0.5 text-[10px]" style={{ background: "rgba(255,255,255,0.1)" }}>Filtres</span>
                  </div>
                  <div className="space-y-3">
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full" style={{ width: "70%", background: GOLD }} />
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.1)" }}>
                      <div className="h-full" style={{ width: "45%", background: "#34d399" }} />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ─── Stats ─── */}
      <section className="relative z-10 py-12" style={{ borderTop: "1px solid rgba(6,78,59,0.08)", borderBottom: "1px solid rgba(6,78,59,0.08)" }}>
        <motion.div className="mx-auto grid max-w-5xl grid-cols-2 gap-8 px-4 sm:grid-cols-4 sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}>
          {stats.map((s) => (
            <motion.div key={s.label} variants={fadeUp} className="text-center">
              <div className="font-display text-2xl sm:text-3xl lp-gradient-text-accent">{s.value}</div>
              <div className="mt-1 text-xs sm:text-sm" style={{ color: "rgba(6,78,59,0.6)" }}>{s.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ─── Features Bento Grid ─── */}
      <section id="features" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <motion.div className="mb-16 text-center" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <div className="mb-4 inline-flex items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold uppercase tracking-widest" style={{ background: "rgba(201,168,76,0.12)", color: "#a8862f" }}>
              <Zap className="h-3 w-3" /> Fonctionnalités
            </div>
            <h2 className="font-display text-3xl uppercase sm:text-4xl lg:text-5xl" style={{ color: EMERALD_DEEP, letterSpacing: "-0.02em" }}>
              Tout ce qu'il faut pour votre atelier
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: EMERALD }}>
              Des outils professionnels conçus pour simplifier votre quotidien.
            </p>
          </motion.div>

          <motion.div
            className="grid auto-rows-[minmax(180px,auto)] gap-4 sm:grid-cols-3"
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}
          >
            {features.map((f) => (
              <motion.div key={f.title} variants={scaleIn} className={`lp-glass-card lp-bento-card rounded-xl p-6 ${f.span}`}>
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "rgba(13,122,95,0.1)" }}>
                  <f.icon className="h-5 w-5" style={{ color: EMERALD }} />
                </div>
                <h3 className="mb-2 font-display text-base uppercase" style={{ color: EMERALD_DEEP }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(6,78,59,0.7)" }}>{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ─── Extra Value Props ─── */}
      <section className="relative z-10 py-16" style={{ borderTop: "1px solid rgba(6,78,59,0.08)", borderBottom: "1px solid rgba(6,78,59,0.08)" }}>
        <motion.div className="mx-auto max-w-5xl px-4 sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="grid gap-8 sm:grid-cols-3">
            {[
              { icon: Shield, title: "Sécurisé", desc: "Données chiffrées, accès par rôle et sauvegarde automatique." },
              { icon: Zap, title: "Ultra Rapide", desc: "Interface optimisée, chargement instantané et temps réel." },
              { icon: Smartphone, title: "Mobile First", desc: "Conçu pour fonctionner parfaitement sur téléphone et tablette." },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ background: "rgba(201,168,76,0.12)" }}>
                  <item.icon className="h-5 w-5" style={{ color: "#a8862f" }} />
                </div>
                <div>
                  <h3 className="font-display text-sm uppercase" style={{ color: EMERALD_DEEP }}>{item.title}</h3>
                  <p className="mt-1 text-sm" style={{ color: "rgba(6,78,59,0.7)" }}>{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ─── Pricing (Dynamic) ─── */}
      <section id="pricing" className="relative z-10 py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <motion.div className="mb-16 text-center" variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
            <h2 className="font-display text-3xl uppercase sm:text-4xl lg:text-5xl" style={{ color: EMERALD_DEEP, letterSpacing: "-0.02em" }}>
              Des tarifs simples et transparents
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: EMERALD }}>
              Commencez gratuitement, évoluez quand vous êtes prêt.
            </p>
          </motion.div>

          <motion.div className="grid gap-6 sm:grid-cols-3" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }}>
            {displayPlans.map((plan) => (
              <motion.div key={plan.id} variants={scaleIn}>
                <div className={`lp-glass-card flex h-full flex-col rounded-2xl p-6 sm:p-8 relative ${plan.highlight ? "lp-pricing-popular" : ""}`}>
                  {plan.highlight && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="inline-flex items-center gap-1 rounded-full px-4 py-1 text-xs font-bold shadow-lg" style={{ background: GOLD, color: EMERALD_DEEP }}>
                        <Zap className="h-3 w-3" /> Le plus populaire
                      </div>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="mb-1 font-display text-lg uppercase" style={{ color: EMERALD_DEEP }}>{plan.name}</h3>
                    <p className="text-sm" style={{ color: "rgba(6,78,59,0.6)" }}>{plan.description}</p>
                    <div className="mt-4">
                      <span className="font-display text-4xl" style={{ color: EMERALD_DEEP }}>
                        {plan.price === 0 ? "Gratuit" : `${plan.price} ${plan.currency}`}
                      </span>
                      {plan.period && <span className="ml-1 text-sm" style={{ color: "rgba(6,78,59,0.5)" }}>{plan.period}</span>}
                    </div>
                  </div>

                  <ul className="mb-8 flex-1 space-y-3">
                    {(Array.isArray(plan.features) ? plan.features : ((plan.features as any)?.display ?? [])).map((feat: string, i: number) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: "rgba(6,78,59,0.8)" }}>
                        <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: EMERALD }} />
                        {feat}
                      </li>
                    ))}
                  </ul>

                  <div>
                    {plan.price === 0 ? (
                      <Link to={ctaLink}>
                        <Button className="w-full rounded-full font-semibold transition-all hover:-translate-y-0.5" style={{ background: EMERALD_DEEP, color: CREAM }}>
                          Commencer gratuitement <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        onClick={() => handlePlanClick(plan.id)}
                        className="w-full rounded-full font-semibold transition-all hover:-translate-y-0.5"
                        style={plan.highlight
                          ? { background: GOLD, color: EMERALD_DEEP }
                          : { background: "transparent", color: EMERALD_DEEP, border: `1.5px solid ${EMERALD_DEEP}` }}
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

      {/* ─── CTA final (Waitlist) ─── */}
      <section className="relative z-10 py-20 sm:py-28">
        <motion.div className="mx-auto max-w-4xl px-4 sm:px-6" variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}>
          <div className="relative overflow-hidden rounded-3xl px-6 py-14 text-center sm:px-12" style={{ background: EMERALD_DEEP }}>
            <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(201,168,76,0.18)" }} />
            <div className="absolute -bottom-16 -left-16 h-56 w-56 rounded-full blur-3xl" style={{ background: "rgba(13,122,95,0.35)" }} />
            <motion.h2 variants={fadeUp} className="relative font-display text-3xl uppercase sm:text-4xl" style={{ color: CREAM, letterSpacing: "-0.02em" }}>
              Prêt à digitaliser votre atelier ?
            </motion.h2>
            <motion.p variants={fadeUp} className="relative mx-auto mt-4 max-w-xl text-sm sm:text-base" style={{ color: "rgba(245,240,224,0.8)" }}>
              Rejoignez des centaines d'ateliers qui utilisent RepairPro pour gérer leur activité au quotidien.
            </motion.p>
            <motion.div variants={fadeUp} className="relative mx-auto mt-8 max-w-md">
              <form onSubmit={handleWaitlistSubmit} className="flex flex-col gap-3 sm:flex-row">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={waitlistEmail}
                  onChange={e => setWaitlistEmail(e.target.value)}
                  className="h-12 flex-1 rounded-lg border-2 text-sm focus-visible:ring-0"
                  style={{ background: "rgba(245,240,224,0.1)", borderColor: "rgba(245,240,224,0.2)", color: CREAM }}
                  required
                />
                <Button
                  type="submit"
                  disabled={joinWaitlist.isPending}
                  size="lg"
                  className="h-12 shrink-0 rounded-lg px-8 text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={{ background: GOLD, color: EMERALD_DEEP }}
                >
                  {joinWaitlist.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Rejoindre la liste d'attente"}
                </Button>
              </form>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8" style={{ borderTop: "1px solid rgba(6,78,59,0.08)" }}>
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 text-center sm:flex-row sm:justify-between sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: EMERALD_DEEP }}>
              <div className="h-3.5 w-2.5 rounded-sm border-2" style={{ borderColor: GOLD }} />
            </div>
            <span className="font-display text-sm uppercase" style={{ color: EMERALD_DEEP }}>RepairPro</span>
          </div>
          <p className="text-xs" style={{ color: "rgba(6,78,59,0.5)" }}>
            © {new Date().getFullYear()} RepairPro. Tous droits réservés.
          </p>
        </div>
      </footer>
    </main>
  );
}
