import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Wrench, Lock, AtSign, Phone, Mail, MessageCircle, Store, UserCog, User, AlertCircle, CheckCircle, Globe, Ticket, Gift } from "lucide-react";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { SEO } from "@/components/seo/SEO";
import { BlueprintLoader, preloadBlueprint } from "@/components/auth/BlueprintLoader";
import repairProLogo from "@/assets/repairpro-logo.png";
import { saveReferralCode, getSavedReferralCode, clearReferralCode, computeFingerprint } from "@/lib/fingerprint";

const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "";
const REMEMBER_ME_KEY = "repairpro_remember_me";

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, user } = useAuth();
  const queryClient = useQueryClient();

  const [loginRole, setLoginRole] = useState<"owner" | "employee">("owner");
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [registerUsername, setRegisterUsername] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerFullName, setRegisterFullName] = useState("");
  const [registerCountry, setRegisterCountry] = useState("TN");
  const [registerCurrency, setRegisterCurrency] = useState("TND");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [registerPhone, setRegisterPhone] = useState("");
  const [useSameWhatsapp, setUseSameWhatsapp] = useState(true);
  const [registerWhatsapp, setRegisterWhatsapp] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPromo, setRegisterPromo] = useState("");
  const [trialOffer, setTrialOffer] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  // 3D "Digital Blueprint" login transition
  const [showLoader, setShowLoader] = useState(false);
  const [loaderLogo, setLoaderLogo] = useState<string | null>(null);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [signupCooldown, setSignupCooldown] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  // Warm the 3D "Digital Blueprint" bundle as soon as the login page mounts so
  // the holographic animation is ready on the FIRST owner login (not just the
  // second). Best-effort, never blocks the form.
  useEffect(() => {
    preloadBlueprint();
  }, []);

  // Restore remembered username
  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_ME_KEY);
      if (saved) {
        const { username } = JSON.parse(saved);
        if (username) {
          setLoginUsername(username);
          setRememberMe(true);
        }
      }
    } catch {}
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (signupCooldown <= 0) return;
    const timer = setInterval(() => {
      setSignupCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [signupCooldown]);

  useEffect(() => {
    supabase
      .from("platform_settings" as any)
      .select("value")
      .eq("key", "admin_whatsapp")
      .single()
      .then(({ data }) => {
        if (data && (data as any).value) setAdminWhatsapp((data as any).value);
      });
  }, []);

  // Pre-fill from query params (e.g. coming from the landing-page waitlist form)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const email = params.get("email");
    const username = params.get("username");
    if (tab === "register") {
      setAuthTab("register");
      setLoginRole("owner");
    }
    if (email) setRegisterEmail(email);
    if (username) setRegisterUsername(username);
    // Capture referral code from ?ref= and persist it for signup
    const ref = params.get("ref");
    if (ref) {
      saveReferralCode(ref);
      setAuthTab("register");
      setLoginRole("owner");
    }
    // Prefill promo code from ?promo=
    const promo = params.get("promo");
    if (promo) {
      setRegisterPromo(promo.toUpperCase());
      setAuthTab("register");
      setLoginRole("owner");
    }
    // First-visit 7-day trial offer: valid only if the countdown is still live
    const trial = params.get("trial");
    if (trial === "7") {
      const startRaw = localStorage.getItem("rp_trial_offer_start");
      const start = startRaw ? Number(startRaw) : NaN;
      const stillLive = Number.isFinite(start) && Date.now() - start < 24 * 60 * 60 * 1000;
      if (stillLive) {
        setTrialOffer(true);
        setAuthTab("register");
        setLoginRole("owner");
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // Redirect already-authenticated users — but NOT while the blueprint loader
  // is playing, so the owner login animation can finish before we navigate.
  // Done in an effect (not during render) to avoid the
  // "Cannot update a component while rendering" warning.
  useEffect(() => {
    if (!user || showLoader) return;
    const searchParams = new URLSearchParams(location.search);
    const redirect = searchParams.get("redirect");
    const from = redirect || (location.state as { from?: Location })?.from?.pathname || "/dashboard";
    navigate(from, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, showLoader]);

  const validateUsername = (username: string): string | null => {
    if (username.length < 3) return "Le nom d'utilisateur doit contenir au moins 3 caractères";
    if (username.length > 20) return "Le nom d'utilisateur ne peut pas dépasser 20 caractères";
    if (!/^[a-zA-Z0-9_]+$/.test(username)) return "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores";
    return null;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await signIn(loginUsername, loginPassword);

      if (error) {
        const msg = error.message || "";
        if (msg === "Invalid login credentials") {
          setError("Nom d'utilisateur ou mot de passe incorrect");
        } else if (msg.includes("banned") || msg.includes("User is banned")) {
          setError("Votre compte est en attente de validation par l'administrateur.");
        } else {
          setError(msg);
        }
        return;
      }

      // Remember me
      if (rememberMe) {
        localStorage.setItem(REMEMBER_ME_KEY, JSON.stringify({ username: loginUsername }));
      } else {
        localStorage.removeItem(REMEMBER_ME_KEY);
      }

      // Owner tab → paint the premium blueprint loader instantly (before any
      // network round-trips) so it appears the moment the button is pressed.
      const ownerLoaderStart = Date.now();
      if (loginRole === "owner") {
        setLoaderLogo(repairProLogo);
        setShowLoader(true);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      let isOwnerLogin = false;
      let userIdForLogo: string | null = null;
      if (sessionData.session?.user) {
        const userId = sessionData.session.user.id;

        // Role matching: a user can have multiple rows in user_roles
        // (e.g. platform_admin + super_admin), so fetch the full set rather
        // than assuming a single row (which breaks with .single()).
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", userId);

        const roleSet = new Set((roles ?? []).map((r) => r.role));
        const isPlatformAdmin = roleSet.has("platform_admin");

        // Team membership is the source of truth for employee accounts. Some
        // legacy employees may still carry stale role rows, so resolve the team
        // row before deciding whether this is an owner or employee login.
        const { data: teamRows, error: teamError } = await supabase
          .from("team_members")
          .select("id, status, role")
          .eq("member_user_id", userId)
          .order("created_at", { ascending: false });

        if (teamError) throw teamError;

        const activeTeamRow = (teamRows ?? []).find((row) => row.status === "active");
        const hasTeamHistory = (teamRows ?? []).length > 0;
        const hasTeamRole = roleSet.has("employee") || roleSet.has("manager") || roleSet.has("admin");
        const isEmployee = !!activeTeamRow;
        const isOwner = roleSet.has("super_admin") && !hasTeamRole && !hasTeamHistory;

        // Platform admins bypass the owner/employee tab guards entirely.
        if (!isPlatformAdmin) {
          if (!activeTeamRow && (hasTeamRole || hasTeamHistory)) {
            await supabase.auth.signOut();
            setShowLoader(false);
            setError("Ce compte employé n'est plus actif. Demandez au propriétaire de la boutique de le réactiver.");
            return;
          }

          if (loginRole === "employee" && isOwner) {
            await supabase.auth.signOut();
            setShowLoader(false);
            setError("Ce compte est un compte propriétaire. Veuillez utiliser l'onglet « Propriétaire ».");
            return;
          }

          if (loginRole === "owner" && isEmployee) {
            await supabase.auth.signOut();
            setShowLoader(false);
            setError("Ce compte est un compte employé. Veuillez utiliser l'onglet « Employé ».");
            return;
          }
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_locked")
          .eq("user_id", userId)
          .single();

        if (profile?.is_locked) {
          // Admin kill-switch: account explicitly locked by an admin
          await supabase.auth.signOut();
          setShowLoader(false);
          setError("Votre compte est verrouillé par l'administrateur. Veuillez le contacter.");
          return;
        }

        // Owner login → show the 3D "Digital Blueprint" transition.
        isOwnerLogin = !isEmployee;
        userIdForLogo = userId;
      }

      // Invalidate onboarding cache to force fresh fetch
      queryClient.invalidateQueries({ queryKey: ["onboarding-status"] });
      const searchParams = new URLSearchParams(location.search);
      const redirect = searchParams.get("redirect");
      const from = redirect || (location.state as { from?: Location })?.from?.pathname || "/dashboard";

      // Premium 3D loader for shop owners going to the dashboard.
      // The overlay is already visible (set optimistically above); here we just
      // refine the logo and hold a minimum display before navigating.
      if (isOwnerLogin && from === "/dashboard") {
        if (!showLoader) {
          setLoaderLogo(repairProLogo);
          setShowLoader(true);
        }

        // Fetch the shop logo (best-effort) so it appears in the blueprint.
        if (userIdForLogo) {
          try {
            const { data: shop } = await supabase
              .from("shop_settings")
              .select("logo_url")
              .eq("user_id", userIdForLogo)
              .maybeSingle();
            if (shop?.logo_url) setLoaderLogo(shop.logo_url);
          } catch {
            /* keep default logo */
          }
        }

        // Minimum display so the 3D animation has time to load and play out
        // before we navigate to the dashboard.
        const elapsed = Date.now() - ownerLoaderStart;
        const minDisplay = 3200;
        if (elapsed < minDisplay) {
          await new Promise((r) => setTimeout(r, minDisplay - elapsed));
        }
        setShowLoader(false);
        navigate(from, { replace: true });
        return;
      }

      // Non-owner / non-dashboard destinations: make sure the optimistic
      // loader is cleared before navigating.
      setShowLoader(false);
      navigate(from, { replace: true });
    } catch (err) {
      setShowLoader(false);
      setError(
        (err as Error)?.message ||
          "Connexion au serveur impossible. Vérifiez votre connexion et réessayez.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (signupCooldown > 0) {
      setError(`Veuillez patienter ${signupCooldown}s avant de réessayer.`);
      return;
    }

    const usernameError = validateUsername(registerUsername);
    if (usernameError) { setError(usernameError); return; }
    if (!registerPhone.trim()) { setError("Le numéro de téléphone est obligatoire"); return; }
    if (registerPassword !== confirmPassword) { setError("Les mots de passe ne correspondent pas"); return; }
    if (registerPassword.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères"); return; }

    setLoading(true);

    // Get captcha token if hCaptcha is configured
    let tokenForGuard = captchaToken;
    if (HCAPTCHA_SITE_KEY && !tokenForGuard) {
      try {
        const result = await captchaRef.current?.execute({ async: true });
        tokenForGuard = result?.response || null;
      } catch {
        setError("Vérification CAPTCHA échouée. Veuillez réessayer.");
        setLoading(false);
        return;
      }
    }

    // Server-side rate limiting + uniqueness pre-check
    try {
      const guardRes = await supabase.functions.invoke("signup-guard", {
        body: {
          username: registerUsername,
          phone: registerPhone.trim(),
          captchaToken: tokenForGuard,
        },
      });

      if (guardRes.error) {
        console.error("[Auth] signup-guard invocation error:", guardRes.error);
      } else if (guardRes.data && !guardRes.data.allowed) {
        const reason = guardRes.data.reason;
        if (reason === "rate_limited") {
          setError("Trop de tentatives d'inscription. Veuillez réessayer dans une heure.");
        } else if (reason === "username_taken") {
          setError("Ce nom d'utilisateur est déjà pris.");
        } else if (reason === "phone_taken") {
          setError("Ce numéro de téléphone est déjà utilisé.");
        } else if (reason === "captcha_failed" || reason === "captcha_required") {
          setError("Vérification CAPTCHA échouée. Veuillez réessayer.");
        } else {
          setError(reason || "Inscription refusée.");
        }
        setLoading(false);
        setSignupCooldown(30);
        return;
      }
    } catch (guardErr) {
      console.error("[Auth] signup-guard fetch error:", guardErr);
    }

    const whatsappPhone = useSameWhatsapp ? registerPhone.trim() : (registerWhatsapp.trim() || registerPhone.trim());

    const { error } = await signUp(
      registerUsername, registerPassword, registerFullName,
      registerCountry, registerCurrency,
      registerPhone.trim(), whatsappPhone,
      registerEmail.trim() || undefined
    );

    if (error) {
      if (error.message.includes("already registered")) {
        setError("Ce nom d'utilisateur est déjà pris");
      } else {
        setError(error.message);
      }
    } else {
      setSuccess("Votre compte a été créé avec succès ! Vous pouvez maintenant vous connecter.");

      // Referral capture + device fingerprint (best-effort, never blocks signup).
      // Runs while the just-created session is still active (before signOut).
      try {
        const fingerprint = await computeFingerprint();
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          // Store the new user's signup fingerprint for the anti-fraud radar
          await supabase
            .from("profiles")
            .update({ signup_fingerprint: fingerprint })
            .eq("user_id", newUser.id);

          const refCode = getSavedReferralCode();
          if (refCode) {
            const { data: referrer } = await supabase
              .from("profiles")
              .select("user_id")
              .eq("referral_code", refCode)
              .maybeSingle();
            if (referrer && (referrer as any).user_id && (referrer as any).user_id !== newUser.id) {
              await supabase.from("referrals").insert({
                referrer_id: (referrer as any).user_id,
                referred_id: newUser.id,
                referred_email: registerEmail.trim() || null,
                ip_fingerprint: fingerprint,
                status: "pending",
              });
            }
            clearReferralCode();
          }
        }
      } catch (refErr) {
        console.error("[Auth] referral capture error:", refErr);
      }

      // Promo code capture (best-effort). Store on the profile so it auto-applies
      // at checkout. Validation is server-side; invalid codes are silently skipped.
      try {
        const code = registerPromo.trim().toUpperCase();
        if (code) {
          const { data: res } = await supabase.rpc("validate_promo_code" as any, { _code: code });
          if (res && (res as any).valid) {
            const { data: { user: pu } } = await supabase.auth.getUser();
            if (pu) {
              await supabase
                .from("profiles")
                .update({ pending_promo_code: (res as any).code || code })
                .eq("user_id", pu.id);
            }
          }
        }
      } catch (promoErr) {
        console.error("[Auth] promo capture error:", promoErr);
      }

      // First-visit 7-day trial: grant while the just-created session is active.
      try {
        const startRaw = localStorage.getItem("rp_trial_offer_start");
        const start = startRaw ? Number(startRaw) : NaN;
        const stillLive = Number.isFinite(start) && Date.now() - start < 24 * 60 * 60 * 1000;
        if (trialOffer && stillLive) {
          const { data: { user: tu } } = await supabase.auth.getUser();
          if (tu) {
            // Pick the cheapest Pro plan (excluding Entreprise) for the trial
            const { data: proPlan } = await supabase
              .from("subscription_plans")
              .select("id")
              .ilike("name", "%Pro%")
              .not("name", "ilike", "%Entreprise%")
              .order("price", { ascending: true })
              .limit(1)
              .maybeSingle();
            if (proPlan?.id) {
              const now = new Date();
              const trialEnd = new Date(now);
              trialEnd.setDate(trialEnd.getDate() + 7);
              await supabase
                .from("shop_subscriptions")
                .update({ status: "canceled" })
                .eq("user_id", tu.id);
              await supabase.from("shop_subscriptions").insert({
                user_id: tu.id,
                plan_id: proPlan.id,
                status: "trialing",
                started_at: now.toISOString(),
                expires_at: trialEnd.toISOString(),
                trial_ends_at: trialEnd.toISOString(),
              });
              localStorage.removeItem("rp_trial_offer_start");
            }
          }
        }
      } catch (trialErr) {
        console.error("[Auth] trial grant error:", trialErr);
      }


      // Notify the platform admin (best-effort, never blocks)
      try {
        await supabase.functions.invoke("notify-admin-signup", {
          body: {
            username: registerUsername,
            full_name: registerFullName,
            email: registerEmail.trim() || null,
            phone: registerPhone.trim(),
            country: registerCountry,
          },
        });
      } catch (notifyErr) {
        console.error("[Auth] notify-admin-signup error:", notifyErr);
      }
      await supabase.auth.signOut();
      setRegisterUsername(""); setRegisterPassword(""); setRegisterFullName("");
      setRegisterCountry("TN"); setRegisterCurrency("TND"); setConfirmPassword("");
      setRegisterPhone(""); setUseSameWhatsapp(true); setRegisterWhatsapp(""); setRegisterEmail(""); setRegisterPromo("");
    }

    setLoading(false);
    setSignupCooldown(30);
    setCaptchaToken(null);
    captchaRef.current?.resetCaptcha();
  };

  // Force login tab when employee
  const effectiveTab = loginRole === "employee" ? "login" : authTab;

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950 p-4">
      <BlueprintLoader visible={showLoader} logoUrl={loaderLogo} />
      <SEO
        title="Connexion / Inscription — RepairPro"
        description="Connectez-vous à RepairPro ou créez votre compte d'atelier de réparation mobile."
        path="/auth"
      />
      {/* Subtle grid */}
      <div className="absolute inset-0 auth-grid-bg opacity-30" />
      {/* Blue radial glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsla(217,91%,50%,0.07)] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsla(217,91%,60%,0.04)] blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-fade-in">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3 auth-glow">
            <img src={repairProLogo} alt="RepairPro" className="w-16 h-16 rounded-2xl" width={64} height={64} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Connexion à votre atelier RepairPro</h1>
          <p className="text-zinc-500 mt-1 text-sm">Gestion d'atelier moderne</p>
        </div>

        {/* Role Selector - Segmented */}
        <div className="flex bg-white/5 rounded-xl border border-white/10 p-1 mb-5">
          <button
            type="button"
            onClick={() => setLoginRole("owner")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              loginRole === "owner"
                ? "bg-[hsla(217,91%,50%,0.15)] text-white shadow-sm border border-[hsla(217,91%,60%,0.3)]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <Store className="h-4 w-4" />
            Propriétaire
          </button>
          <button
            type="button"
            onClick={() => setLoginRole("employee")}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
              loginRole === "employee"
                ? "bg-[hsla(217,91%,50%,0.15)] text-white shadow-sm border border-[hsla(217,91%,60%,0.3)]"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            <UserCog className="h-4 w-4" />
            Employé
          </button>
        </div>

        {/* Auth Card */}
        <div className="auth-card rounded-2xl p-6">
          {/* Auth Type Tabs - Segmented */}
          {loginRole === "owner" && (
            <div className="flex bg-white/5 rounded-lg border border-white/8 p-0.5 mb-5">
              <button
                type="button"
                onClick={() => setAuthTab("login")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  effectiveTab === "login"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Connexion
              </button>
              <button
                type="button"
                onClick={() => setAuthTab("register")}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${
                  effectiveTab === "register"
                    ? "bg-white/10 text-white"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                Inscription
              </button>
            </div>
          )}

          {loginRole === "employee" && (
            <h2 className="text-lg font-semibold text-white mb-4">Connexion Employé</h2>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4 border-red-500/30 bg-red-500/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 border-emerald-500/30 bg-emerald-500/10">
              <CheckCircle className="h-4 w-4 text-emerald-400" />
              <AlertDescription className="text-emerald-300">{success}</AlertDescription>
            </Alert>
          )}

          {/* Login Form */}
          {effectiveTab === "login" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-username" className="text-zinc-400 text-sm">Nom d'utilisateur</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input
                    id="login-username"
                    type="text"
                    placeholder="ahmed123"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="pl-10 auth-input"
                    required
                    disabled={loading}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password" className="text-zinc-400 text-sm">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="pl-10 auth-input"
                    required
                    disabled={loading}
                    autoComplete="current-password"
                  />
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember-me"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(!!checked)}
                    disabled={loading}
                    className="border-zinc-600 data-[state=checked]:bg-[hsl(217,91%,50%)] data-[state=checked]:border-[hsl(217,91%,50%)]"
                  />
                  <Label htmlFor="remember-me" className="text-sm cursor-pointer text-zinc-400">
                    Se souvenir de moi
                  </Label>
                </div>
                <Link to="/reset-password" className="text-sm text-[hsl(217,91%,65%)] hover:text-[hsl(217,91%,75%)] transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-[0_0_20px_hsla(217,91%,50%,0.25)] hover:shadow-[0_0_30px_hsla(217,91%,50%,0.4)] transition-all h-11"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Connexion...</>
                ) : (
                  "Se connecter"
                )}
              </Button>
            </form>
          )}

          {/* Register Form */}
          {effectiveTab === "register" && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="register-username" className="text-zinc-400 text-sm">Nom d'utilisateur</Label>
                <div className="relative">
                  <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-username" type="text" placeholder="ahmed123" value={registerUsername}
                    onChange={(e) => setRegisterUsername(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                </div>
                <p className="text-xs text-zinc-600">3-20 caractères, lettres, chiffres et underscores</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-name" className="text-zinc-400 text-sm">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-name" type="text" placeholder="Ahmed Ben Ali" value={registerFullName}
                    onChange={(e) => setRegisterFullName(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="register-country" className="text-zinc-400 text-sm">Pays</Label>
                  <Select value={registerCountry} onValueChange={(val) => {
                    setRegisterCountry(val);
                    const curr = getCurrencyForCountry(val);
                    if (curr) setRegisterCurrency(curr.code);
                  }} disabled={loading}>
                    <SelectTrigger id="register-country" className="auth-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="register-currency" className="text-zinc-400 text-sm">Devise</Label>
                  <Select value={registerCurrency} onValueChange={setRegisterCurrency} disabled={loading}>
                    <SelectTrigger id="register-currency" className="auth-input">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.code}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-phone" className="text-zinc-400 text-sm">Numéro de téléphone *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-phone" type="tel" placeholder="+216 XX XXX XXX" value={registerPhone}
                    onChange={(e) => setRegisterPhone(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="same-whatsapp" checked={useSameWhatsapp}
                  onCheckedChange={(checked) => setUseSameWhatsapp(!!checked)} disabled={loading}
                  className="border-zinc-600 data-[state=checked]:bg-[hsl(217,91%,50%)] data-[state=checked]:border-[hsl(217,91%,50%)]" />
                <Label htmlFor="same-whatsapp" className="text-sm cursor-pointer text-zinc-400">
                  Utiliser ce numéro pour WhatsApp
                </Label>
              </div>

              {!useSameWhatsapp && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="register-whatsapp" className="text-zinc-400 text-sm">Numéro WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                    <Input id="register-whatsapp" type="tel" placeholder="+216 XX XXX XXX" value={registerWhatsapp}
                      onChange={(e) => setRegisterWhatsapp(e.target.value)} className="pl-10 auth-input" disabled={loading} />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="register-email" className="text-zinc-400 text-sm">Email (optionnel)</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-email" type="email" placeholder="exemple@email.com" value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)} className="pl-10 auth-input" disabled={loading} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password" className="text-zinc-400 text-sm">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-password" type="password" placeholder="••••••••" value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)} className="pl-10 auth-input" required minLength={8} disabled={loading} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password" className="text-zinc-400 text-sm">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="confirm-password" type="password" placeholder="••••••••" value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10 auth-input" required disabled={loading} />
                </div>
              </div>

              {trialOffer && (
                <div className="rounded-lg px-3 py-2.5 flex items-center gap-2 border border-emerald-500/30 bg-emerald-500/10">
                  <Gift className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-emerald-300">
                    Offre spéciale : 7 jours d'essai Pro offerts à la création de votre compte 🎉
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="register-promo" className="text-zinc-400 text-sm">Code promo (optionnel)</Label>
                <div className="relative">
                  <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                  <Input id="register-promo" type="text" placeholder="BIENVENUE20" value={registerPromo}
                    onChange={(e) => setRegisterPromo(e.target.value.toUpperCase())} className="pl-10 auth-input uppercase" disabled={loading} />
                </div>
              </div>

              {HCAPTCHA_SITE_KEY && (
                <div className="flex justify-center">
                  <HCaptcha
                    ref={captchaRef}
                    sitekey={HCAPTCHA_SITE_KEY}
                    size="invisible"
                    onVerify={(token) => setCaptchaToken(token)}
                    onExpire={() => setCaptchaToken(null)}
                  />
                </div>
              )}

              <Button type="submit"
                className="w-full bg-gradient-primary hover:opacity-90 text-white shadow-[0_0_20px_hsla(217,91%,50%,0.25)] hover:shadow-[0_0_30px_hsla(217,91%,50%,0.4)] transition-all h-11"
                disabled={loading || signupCooldown > 0}>
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Création...</>
                ) : signupCooldown > 0 ? (
                  `Patienter ${signupCooldown}s`
                ) : (
                  "Créer un compte"
                )}
              </Button>
            </form>
          )}
        </div>

        {/* WhatsApp Contact */}
        {adminWhatsapp && (
          <div className="mt-4">
            <a
              href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              Contacter l'admin via WhatsApp
            </a>
          </div>
        )}

        <p className="text-center text-sm text-zinc-600 mt-6">
          © 2024 RepairPro Tunisie. Tous droits réservés.
        </p>
      </div>
    </main>
  );
}
