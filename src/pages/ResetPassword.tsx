import { useEffect, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  RotateCcw,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { OtpInput } from "@/components/auth/OtpInput";
import { toast } from "sonner";
import repairProLogo from "@/assets/repairpro-logo.png";

type Step = "request" | "code" | "password" | "done";

const RESEND_COOLDOWN = 60;

const STEP_META: Record<Step, { title: string; description: string }> = {
  request: {
    title: "Mot de passe oublié",
    description: "Saisissez votre nom d'utilisateur, votre e-mail ou votre numéro de téléphone.",
  },
  code: {
    title: "Code de vérification",
    description: "Entrez le code à 6 chiffres envoyé à l'e-mail enregistré sur votre compte.",
  },
  password: {
    title: "Nouveau mot de passe",
    description: "Choisissez un mot de passe solide pour sécuriser votre atelier.",
  },
  done: {
    title: "Mot de passe modifié",
    description: "Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.",
  },
};

const variants = {
  enter: { opacity: 0, y: 12 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

/** Read the real error message returned by an edge function. */
async function readFunctionError(error: unknown, fallback: string): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body.error === "string" && body.error.trim()) return body.error;
    } catch {
      /* non-JSON body — use the fallback */
    }
    return fallback;
  }
  if (error instanceof Error && error.message) return fallback;
  return fallback;
}


export default function ResetPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("request");
  const [identifier, setIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // The short-lived token issued by verify-reset-code. It is the ONLY way to
  // reach the password step, and the server re-validates it on update.
  const [resetToken, setResetToken] = useState<string | null>(null);

  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(RESEND_COOLDOWN);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          timerRef.current = null;
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const sendCode = async (silent = false) => {
    const id = identifier.trim().toLowerCase();
    const mail = email.trim().toLowerCase();
    if (!id && !mail) {
      toast.error("Saisissez votre nom d'utilisateur, votre e-mail ou votre téléphone.");
      return false;
    }
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke("request-reset-code", {
        body: {
          identifier: id || mail,
          username: id && !id.includes("@") ? id : undefined,
          email: mail || undefined,
          phone: phone.trim() || undefined,
        },
      });
      if (error) throw error;
      startCooldown();
      if (!silent) {
        toast.success("Si ce compte existe, un code vient d'être envoyé par e-mail.");
      } else {
        toast.success("Nouveau code envoyé.");
      }
      return true;
    } catch (err) {
      console.error("[reset] request-reset-code failed", err);
      toast.error("Impossible d'envoyer le code pour le moment. Réessayez dans un instant.");
      return false;
    } finally {
      setSending(false);
    }
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await sendCode();
    if (ok) {
      setCode("");
      setStep("code");
    }
  };

  const handleVerify = async (submittedCode?: string) => {
    const value = (submittedCode ?? code).trim();
    if (!/^\d{6}$/.test(value)) {
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke("verify-reset-code", {
        body: {
          identifier: identifier.trim().toLowerCase() || email.trim().toLowerCase(),
          code: value,
        },
      });
      const token = (data as { token?: string } | null)?.token;
      if (error || !token) {
        throw new Error(
          await readFunctionError(error, "Code invalide ou expiré. Demandez un nouveau code."),
        );
      }
      setResetToken(token);
      setPassword("");
      setConfirm("");
      setStep("password");
      toast.success("Code vérifié. Choisissez votre nouveau mot de passe.");
    } catch (err) {
      console.error("[reset] verify-reset-code failed", err);
      setCode("");
      toast.error(err instanceof Error ? err.message : "Code invalide ou expiré.");
    } finally {
      setVerifying(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) {
      toast.error("Session de vérification expirée. Recommencez la procédure.");
      setStep("request");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      toast.error("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-password-with-token", {
        body: { password },
        headers: { Authorization: `Bearer ${resetToken}` },
      });
      if (error || !(data as { ok?: boolean } | null)?.ok) {
        throw new Error(
          await readFunctionError(
            error,
            "Impossible de mettre à jour le mot de passe. Demandez un nouveau code.",
          ),
        );
      }
      setResetToken(null);
      setPassword("");
      setConfirm("");
      setStep("done");
      toast.success("Mot de passe mis à jour.");
    } catch (err) {
      console.error("[reset] update-password-with-token failed", err);
      toast.error(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally {
      setSaving(false);
    }
  };

  const meta = STEP_META[step];

  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-950 p-4">
      <SEO
        title="Réinitialisation du mot de passe — RepairPro"
        description="Réinitialisez le mot de passe de votre atelier RepairPro avec un code de vérification sécurisé."
        path="/reset-password"
      />
      <div className="absolute inset-0 auth-grid-bg opacity-30" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-[hsla(217,91%,50%,0.07)] blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full bg-[hsla(217,91%,60%,0.04)] blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3 auth-glow">
            <img src={repairProLogo} alt="RepairPro" className="w-14 h-14 rounded-2xl" width={56} height={56} />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{meta.title}</h1>
          <p className="text-zinc-500 mt-1 text-sm">{meta.description}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {(["request", "code", "password"] as Step[]).map((s, index) => {
            const order: Step[] = ["request", "code", "password", "done"];
            const currentIndex = order.indexOf(step);
            const active = currentIndex >= index;
            return (
              <div
                key={s}
                className={`h-1.5 w-12 rounded-full transition-colors duration-300 ${
                  active ? "bg-[hsla(217,91%,60%,0.8)]" : "bg-white/10"
                }`}
              />
            );
          })}
        </div>

        <div className="auth-card rounded-2xl p-6">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              {step === "request" && (
                <form onSubmit={handleRequest} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-zinc-400 text-sm">
                      Nom d'utilisateur, e-mail ou téléphone
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                      <Input
                        id="identifier"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="ahmed123, vous@exemple.com ou 20 123 456"
                        disabled={sending}
                        className="pl-10 auth-input"
                        autoComplete="username"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/8 bg-white/[0.03] p-4 space-y-3">
                    <p className="text-xs text-zinc-500 leading-relaxed">
                      Aucun e-mail encore enregistré sur votre compte ? Saisissez le vôtre et confirmez votre
                      identité avec le numéro de téléphone de la boutique.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-zinc-400 text-sm">
                        Adresse e-mail (facultatif)
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="vous@exemple.com"
                          disabled={sending}
                          className="pl-10 auth-input"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-zinc-400 text-sm">
                        Téléphone (facultatif)
                      </Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                        <Input
                          id="phone"
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="20 123 456"
                          disabled={sending}
                          className="pl-10 auth-input"
                          autoComplete="tel"
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Envoi du code...
                      </>
                    ) : (
                      <>
                        Recevoir mon code
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full text-zinc-400 hover:text-white"
                    onClick={() => navigate("/auth")}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Retour à la connexion
                  </Button>
                </form>
              )}

              {step === "code" && (
                <div className="space-y-5">
                  <OtpInput
                    value={code}
                    onChange={setCode}
                    onComplete={(value) => handleVerify(value)}
                    disabled={verifying}
                    autoFocus
                  />
                  <p className="text-center text-xs text-zinc-500">
                    Le code expire dans 10 minutes. 5 tentatives maximum.
                  </p>
                  <Button
                    type="button"
                    className="w-full"
                    disabled={verifying || code.length !== 6}
                    onClick={() => handleVerify()}
                  >
                    {verifying ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Vérification...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Vérifier le code
                      </>
                    )}
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1 border-white/10 bg-white/[0.03] text-zinc-300 hover:text-white"
                      disabled={cooldown > 0 || sending}
                      onClick={() => sendCode(true)}
                    >
                      {cooldown > 0 ? (
                        `Renvoyer dans ${cooldown}s`
                      ) : (
                        <>
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Renvoyer
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="flex-1 text-zinc-400 hover:text-white"
                      onClick={() => {
                        setCode("");
                        setStep("request");
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Modifier
                    </Button>
                  </div>
                </div>
              )}

              {step === "password" && (
                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-password" className="text-zinc-400 text-sm">
                      Nouveau mot de passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                      <Input
                        id="new-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={saving}
                        className="pl-10 pr-10 auth-input"
                        autoComplete="new-password"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm-password" className="text-zinc-400 text-sm">
                      Confirmer le mot de passe
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
                      <Input
                        id="confirm-password"
                        type={showPassword ? "text" : "password"}
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
                        placeholder="••••••••"
                        disabled={saving}
                        className="pl-10 auth-input"
                        autoComplete="new-password"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">Minimum 6 caractères. Évitez un mot de passe déjà utilisé.</p>
                  <Button type="submit" className="w-full" disabled={saving}>
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Enregistrement...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="mr-2 h-4 w-4" />
                        Enregistrer le mot de passe
                      </>
                    )}
                  </Button>
                </form>
              )}

              {step === "done" && (
                <div className="space-y-5 text-center">
                  <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                    <CheckCircle2 className="h-7 w-7 text-emerald-400" />
                  </div>
                  <p className="text-sm text-zinc-400">
                    Votre mot de passe a été mis à jour. Connectez-vous avec vos nouveaux identifiants.
                  </p>
                  <Button className="w-full" onClick={() => navigate("/auth")}>
                    Aller à la connexion
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="text-center text-xs text-zinc-600 mt-5">
          Pour votre sécurité, nous n'envoyons jamais de mot de passe par e-mail.
        </p>
      </div>
    </main>
  );
}
