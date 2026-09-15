import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, ArrowLeft, Send, AtSign, Loader2, Mail, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { SEO } from "@/components/seo/SEO";
import { toast } from "sonner";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);


  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedUsername = username.trim().toLowerCase();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedUsername && !trimmedEmail) {
      setError("Veuillez saisir votre nom d'utilisateur ou votre adresse e-mail");
      return;
    }
    setLoading(true);
    try {
      await supabase.functions.invoke("request-reset-code", {
        body: { username: trimmedUsername || undefined, identifier: trimmedUsername || trimmedEmail, email: trimmedEmail || undefined, phone: phone.trim() || undefined },
      });
      setStep('verify');
      setResendCooldown(60);
      const timer = setInterval(() => { setResendCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; }); }, 1000);
      toast.success("Code envoyé à votre adresse e-mail");
    } catch { setStep('verify'); toast.success("Si ce compte existe, un code a été envoyé"); } finally { setLoading(false); }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) { setError("Le code doit contenir 6 chiffres"); return; }
    setVerifying(true);
    try {
      const { data, error: verifyError } = await supabase.functions.invoke("verify-reset-code", { body: { identifier: username.trim().toLowerCase() || email.trim().toLowerCase(), code: code.trim() } });
      if (verifyError || !data?.token) throw new Error(verifyError?.message || "Code invalide");
      sessionStorage.setItem('reset_token', data.token);
      navigate('/update-password');
    } catch (err: any) { setError(err.message || "Code invalide ou expiré"); } finally { setVerifying(false); }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError(null);
    setCode("");
    setResendCooldown(60);
    const timer = setInterval(() => { setResendCooldown(prev => { if (prev <= 1) { clearInterval(timer); return 0; } return prev - 1; }); }, 1000);
    try {
      await supabase.functions.invoke("request-reset-code", { body: { identifier: username.trim().toLowerCase() || email.trim().toLowerCase(), email: email.trim().toLowerCase() || undefined, phone: phone.trim() || undefined } });
      toast.success("Nouveau code envoyé");
    } catch { toast.info("Un nouveau code a été envoyé si le compte existe"); }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <SEO title="Réinitialisation du mot de passe" description="Réinitialisez votre mot de passe RepairPro" />
      <div className="w-full max-w-md">
        <Card className="border-none shadow-2xl">
          <CardHeader className="space-y-3 pb-6">
            <div className="mx-auto w-14 h-14 rounded-full bg-gradient-primary flex items-center justify-center shadow-lg">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-primary bg-clip-text text-transparent">
              {step === 'request' ? 'Mot de passe oublié' : 'Vérification'}
            </CardTitle>
            <CardDescription className="text-center text-base">
              {step === 'request' ? "Entrez votre identifiant pour recevoir un code de vérification" : "Entrez le code à 6 chiffres envoyé à votre e-mail"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            {step === 'request' ? (
              <form onSubmit={handleRequestCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nom d'utilisateur</Label>
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="username" type="text" placeholder="votre_nom_utilisateur" value={username} onChange={(e) => setUsername(e.target.value)} disabled={loading} className="pl-10" />
                  </div>
                </div>
                <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div><div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou</span></div></div>
                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail (facultatif)</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="email" type="email" placeholder="vous@exemple.com" value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} className="pl-10" />
                  </div>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={loading}>
                  {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Envoi en cours...</> : <><Send className="mr-2 h-4 w-4" />Envoyer le code</>}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/auth")}><ArrowLeft className="h-4 w-4 mr-2" />Retour à la connexion</Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code de vérification</Label>
                  <Input id="code" type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} disabled={verifying} className="text-center text-2xl tracking-widest font-mono" autoFocus />
                  <p className="text-xs text-muted-foreground text-center">Le code expire dans 10 minutes</p>
                </div>
                <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={verifying || code.length !== 6}>
                  {verifying ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Vérification...</> : <><Lock className="mr-2 h-4 w-4" />Vérifier le code</>}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={handleResend} disabled={resendCooldown > 0}>
                  {resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : <><Send className="h-4 w-4 mr-2" />Renvoyer le code</>}
                </Button>
                <Button type="button" variant="ghost" className="w-full" onClick={() => { setStep('request'); setCode(""); setError(null); }}>
                  <ArrowLeft className="h-4 w-4 mr-2" />Modifier l'identifiant
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

