import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Loader2, CheckCircle2, ArrowLeft, Lock, Eye, EyeOff, AlertTriangle, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";

export default function UpdatePassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionError, setSessionError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    const parseHashParams = () => {
      const hash = window.location.hash.startsWith("#") ? window.location.hash.substring(1) : window.location.hash;
      const params = new URLSearchParams(hash);
      return {
        error: params.get("error"),
        errorCode: params.get("error_code"),
        errorDescription: params.get("error_description"),
        type: params.get("type"),
        accessToken: params.get("access_token"),
      };
    };

    const initRecovery = async () => {
      // 1. Check for error params in hash or query
      const hashParams = parseHashParams();
      const queryError = searchParams.get("error") || hashParams.error;
      const queryErrorCode = searchParams.get("error_code") || hashParams.errorCode;
      const queryErrorDesc = searchParams.get("error_description") || hashParams.errorDescription;

      if (queryError || queryErrorCode) {
        let msg = "Le lien de réinitialisation est invalide ou a expiré. Veuillez refaire une demande.";
        if (queryErrorCode === "otp_expired" || queryErrorDesc?.includes("expired")) {
          msg = "Ce lien de réinitialisation a expiré (validité 1 heure). Veuillez demander un nouveau lien.";
        } else if (queryErrorDesc) {
          msg = decodeURIComponent(queryErrorDesc.replace(/\+/g, " "));
        }
        if (mounted) {
          setSessionError(msg);
          setChecking(false);
        }
        return;
      }

      // 2. Check for PKCE code in query
      const code = searchParams.get("code");
      if (code) {
        try {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("[UpdatePassword] Code exchange error:", exchangeError);
            if (mounted) {
              setSessionError("Le code de récupération est invalide ou a déjà été utilisé. Veuillez refaire une demande.");
              setChecking(false);
            }
            return;
          }
          if (data?.session && mounted) {
            setHasSession(true);
            setChecking(false);
            return;
          }
        } catch (e) {
          console.error("[UpdatePassword] Exchange exception:", e);
        }
      }

      // 3. Check existing active session / recovery event
      const { data: { session } } = await supabase.auth.getSession();
      if (session && mounted) {
        setHasSession(true);
        setChecking(false);
        return;
      }

      // 4. Timeout fallback for hash token processing
      const fallbackTimer = setTimeout(async () => {
        if (!mounted) return;
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session) {
          setHasSession(true);
        } else {
          setSessionError("Aucune session de récupération active trouvée. Veuillez faire une nouvelle demande de réinitialisation.");
        }
        setChecking(false);
      }, 1200);

      return () => clearTimeout(fallbackTimer);
    };

    // Listen for auth events (e.g. PASSWORD_RECOVERY or SIGNED_IN)
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (session && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "INITIAL_SESSION"))) {
        setHasSession(true);
        setChecking(false);
      }
    });

    initRecovery();

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas");
      return;
    }
    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          navigate("/auth", { replace: true });
        }, 2500);
      }
    } catch (err: any) {
      setError(err?.message ?? "Une erreur est survenue lors de la mise à jour");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted/30 to-background p-4">
      <SEO
        title="Nouveau mot de passe — RepairPro"
        description="Choisissez un nouveau mot de passe pour votre compte RepairPro."
        path="/update-password"
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-primary mb-4">
            <KeyRound className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Nouveau mot de passe</h1>
          <p className="text-muted-foreground mt-1">Définissez vos nouveaux identifiants sécurisés</p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-primary" /> Choisir un mot de passe
            </CardTitle>
            <CardDescription>
              Saisissez un nouveau mot de passe pour accéder à votre espace.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {checking ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Vérification du lien de sécurité...</p>
              </div>
            ) : success ? (
              <div className="space-y-4">
                <Alert className="border-emerald-500/30 bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <AlertDescription className="text-emerald-600 dark:text-emerald-400 font-medium">
                    Votre mot de passe a été mis à jour avec succès !
                  </AlertDescription>
                </Alert>
                <p className="text-xs text-muted-foreground text-center">
                  Redirection automatique vers la page de connexion...
                </p>
                <Button
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={() => navigate("/auth", { replace: true })}
                >
                  Se connecter maintenant
                </Button>
              </div>
            ) : sessionError || !hasSession ? (
              <div className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {sessionError || "Lien de réinitialisation invalide ou expiré. Veuillez refaire une demande."}
                  </AlertDescription>
                </Alert>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/reset-password")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Demander un nouveau lien
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="new-pass">Nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="new-pass"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      placeholder="Minimum 6 caractères"
                      className="pr-10"
                      autoFocus
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-pass">Confirmer le nouveau mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="confirm-pass"
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      placeholder="Retapez votre mot de passe"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {password && (
                  <div className="text-xs space-y-1 rounded-lg border border-border/50 p-2.5 bg-muted/20">
                    <div className="flex items-center gap-1.5">
                      <span className={password.length >= 6 ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                        {password.length >= 6 ? "✓" : "○"} Au moins 6 caractères
                      </span>
                    </div>
                    {confirm && (
                      <div className="flex items-center gap-1.5">
                        <span className={password === confirm ? "text-emerald-500 font-medium" : "text-destructive"}>
                          {password === confirm ? "✓ Les mots de passe correspondent" : "✕ Les mots de passe ne correspondent pas"}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <Button
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={loading || password.length < 6 || password !== confirm}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Mise à jour en cours...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="mr-2 h-4 w-4" />
                      Enregistrer le mot de passe
                    </>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate("/auth")}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Retour à la connexion
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
