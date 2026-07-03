import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, MessageCircle, UserCheck, Globe, ShieldAlert, BellRing, Send, BellOff, Smartphone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { usePushSubscription } from "@/hooks/usePushSubscription";
import { InstallAppButton } from "@/components/pwa/InstallAppButton";
import { OnboardingRemindersAdminCard } from "./OnboardingRemindersAdminCard";
import { VerificationRemindersAdminCard } from "./VerificationRemindersAdminCard";
import { WaitlistInvitationsAdminCard } from "./WaitlistInvitationsAdminCard";

export function AdminSettingsView() {
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [publicDomain, setPublicDomain] = useState("");
  const [safeMode, setSafeMode] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyEmailEnabled, setNotifyEmailEnabled] = useState(true);
  const [notifyBrowserEnabled, setNotifyBrowserEnabled] = useState(true);
  const push = usePushSubscription();
  const isIOS = typeof window !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const [loading, setLoading] = useState(true);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingAutoConfirm, setSavingAutoConfirm] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [savingSafeMode, setSavingSafeMode] = useState(false);
  const [savingNotifyEmail, setSavingNotifyEmail] = useState(false);
  const [savingNotifyEmailToggle, setSavingNotifyEmailToggle] = useState(false);
  const [savingNotifyBrowser, setSavingNotifyBrowser] = useState(false);
  const [testingAlert, setTestingAlert] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("key, value");
    
    if (data) {
      (data as any[]).forEach((row: any) => {
        if (row.key === "admin_whatsapp") setAdminWhatsapp(row.value || "");
        if (row.key === "auto_confirm_signups") setAutoConfirm(row.value === "true");
        if (row.key === "public_site_domain") setPublicDomain(row.value || "");
        if (row.key === "safe_mode_enabled") setSafeMode(row.value === "true");
        if (row.key === "admin_notify_email") setNotifyEmail(row.value || "");
        if (row.key === "admin_notify_email_enabled") setNotifyEmailEnabled(row.value !== "false");
        if (row.key === "admin_notify_browser_enabled") setNotifyBrowserEnabled(row.value !== "false");
      });
    }
    setLoading(false);
  };

  const sendTestAlert = async () => {
    setTestingAlert(true);
    try {
      // 1) Real Web Push (works in background, even if tab closed — when subscribed)
      let pushSent = 0;
      if (notifyBrowserEnabled && push.status === "subscribed") {
        const { data: pushData, error: pushErr } = await supabase.functions.invoke(
          "send-web-push",
          {
            body: {
              test: true,
              title: "🧪 Test RepairPro",
              body: "Notification push de test reçue. Tout fonctionne !",
              url: "/admin",
              tag: "signup-test",
            },
          }
        );
        if (pushErr) {
          console.warn("[sendTestAlert] push error:", pushErr);
        } else {
          pushSent = (pushData as any)?.sent ?? 0;
        }
      }

      // 2) Trigger edge function for test email + realtime event
      const { data, error } = await supabase.functions.invoke("notify-admin-signup", {
        body: {
          test: true,
          username: "test_alert",
          full_name: "🧪 Test d'alerte",
          email: notifyEmail || "test@example.com",
          phone: "+216 00 000 000",
          country: "TN",
        },
      });

      if (error) throw error;

      const messages: string[] = [];
      if (pushSent > 0) {
        messages.push(`Push envoyé à ${pushSent} appareil${pushSent > 1 ? "s" : ""}`);
      } else if (notifyBrowserEnabled && push.status !== "subscribed") {
        messages.push("Activez d'abord les notifications push ci-dessous");
      }
      if ((data as any)?.emailQueued) {
        messages.push(`E-mail envoyé à ${(data as any).emailRecipient}`);
      } else if (!notifyEmail) {
        messages.push("Configurez l'e-mail destinataire");
      } else if (!notifyEmailEnabled) {
        messages.push("E-mail désactivé");
      }
      toast.success(messages.join(" · ") || "Test envoyé");
    } catch (e: any) {
      console.error("[sendTestAlert]", e);
      toast.error("Échec du test : " + (e?.message ?? "inconnu"));
    } finally {
      setTestingAlert(false);
    }
  };

  const saveSetting = async (key: string, value: string, setSaving: (v: boolean) => void) => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .update({ value, updated_at: new Date().toISOString() } as any)
      .eq("key", key);
    
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Paramètre mis à jour");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-white">Paramètres de la plateforme</h2>

      <WaitlistInvitationsAdminCard />

      <VerificationRemindersAdminCard />

      <OnboardingRemindersAdminCard />

      <Card className="admin-glass-card border-cyan-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <BellRing className="h-5 w-5 text-cyan-400" />
            Alertes d'inscription
          </CardTitle>
          <CardDescription className="text-slate-400">
            Recevez une notification (e-mail et navigateur) à chaque nouvelle inscription d'une boutique.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <Label className="text-slate-300">E-mail destinataire des alertes</Label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={notifyEmail}
              onChange={(e) => setNotifyEmail(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
            <Button
              onClick={() => saveSetting("admin_notify_email", notifyEmail.trim(), setSavingNotifyEmail)}
              disabled={savingNotifyEmail}
              size="sm"
              className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
            >
              {savingNotifyEmail ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div>
              <p className="font-medium text-white">Notifications par e-mail</p>
              <p className="text-sm text-slate-400">Envoyer un e-mail à l'adresse ci-dessus à chaque inscription.</p>
            </div>
            <Switch
              checked={notifyEmailEnabled}
              onCheckedChange={(checked) => {
                setNotifyEmailEnabled(checked);
                saveSetting("admin_notify_email_enabled", checked ? "true" : "false", setSavingNotifyEmailToggle);
              }}
              disabled={savingNotifyEmailToggle}
            />
          </div>

          <div className="flex items-center justify-between border-t border-white/5 pt-4">
            <div className="pr-3">
              <p className="font-medium text-white">Notifications navigateur (push)</p>
              <p className="text-sm text-slate-400">
                {push.status === "subscribed"
                  ? "✅ Abonné — vous recevrez les alertes même si l'onglet est fermé (après installation)"
                  : push.status === "denied"
                  ? "❌ Bloquées — autorisez-les dans les paramètres du navigateur"
                  : push.status === "unsupported"
                  ? "Non supportées par ce navigateur"
                  : "Cliquez pour activer dans ce navigateur"}
              </p>
              {isIOS && (
                <p className="mt-2 text-xs text-amber-300/90 bg-amber-500/10 border border-amber-500/30 rounded-md px-2 py-1.5">
                  ⚠️ Sur iPhone (Safari), les notifications push nécessitent d'installer l'app via « Sur l'écran d'accueil » (iOS 16.4+).
                </p>
              )}
              <p className="mt-2 text-xs text-cyan-300/80 bg-cyan-500/5 border border-cyan-500/20 rounded-md px-2 py-1.5">
                💡 Pour recevoir les notifications quand l'app est <b>fermée</b> (Android), installez d'abord l'application avec le bouton ci-dessous.
              </p>
            </div>
            <Switch
              checked={notifyBrowserEnabled}
              onCheckedChange={(checked) => {
                setNotifyBrowserEnabled(checked);
                saveSetting("admin_notify_browser_enabled", checked ? "true" : "false", setSavingNotifyBrowser);
              }}
              disabled={savingNotifyBrowser}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
            {push.status !== "subscribed" && push.status !== "unsupported" && push.status !== "denied" && (
              <Button
                onClick={() => push.subscribe()}
                disabled={push.busy}
                variant="outline"
                size="sm"
                className="border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10"
              >
                {push.busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
                Activer dans ce navigateur
              </Button>
            )}
            {push.status === "subscribed" && (
              <Button
                onClick={() => push.unsubscribe()}
                disabled={push.busy}
                variant="outline"
                size="sm"
                className="border-slate-500/30 text-slate-300 hover:bg-slate-500/10"
              >
                {push.busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellOff className="h-4 w-4 mr-2" />}
                Désactiver
              </Button>
            )}
            <InstallAppButton
              variant="outline"
              className="border-violet-500/30 text-violet-300 hover:bg-violet-500/10"
            />
            <Button
              onClick={sendTestAlert}
              disabled={testingAlert}
              size="sm"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400"
            >
              {testingAlert ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Tester maintenant
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            WhatsApp Admin
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ce numéro sera affiché comme contact sur les pages de connexion et d'inscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Numéro WhatsApp</Label>
            <Input
              type="tel"
              placeholder="+216 XX XXX XXX"
              value={adminWhatsapp}
              onChange={(e) => setAdminWhatsapp(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => saveSetting("admin_whatsapp", adminWhatsapp.trim(), setSavingWhatsapp)}
            disabled={savingWhatsapp}
            className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
          >
            {savingWhatsapp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5 text-violet-400" />
            Domaine public du site
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ce domaine sera utilisé pour générer les QR codes de suivi des réparations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">URL du domaine</Label>
            <Input
              type="url"
              placeholder="https://www.getheavencoin.com"
              value={publicDomain}
              onChange={(e) => setPublicDomain(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => saveSetting("public_site_domain", publicDomain.trim().replace(/\/+$/, ""), setSavingDomain)}
            disabled={savingDomain}
            className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
          >
            {savingDomain ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-amber-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <ShieldAlert className="h-5 w-5 text-amber-400" />
            Mode Sécurisé : Suppression Automatique
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lorsque activé, le minuteur de suppression automatique de 48h est globalement pausé pour tous les utilisateurs. C'est votre "Frein d'urgence".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Mode Sécurisé (Frein d'urgence)</p>
              <p className="text-sm text-slate-400">
                {safeMode
                  ? "⏸️ Suppression automatique PAUSÉE — aucun compte ne sera suspendu"
                  : "⚠️ Suppression automatique ACTIVE — les comptes expirés seront suspendus"}
              </p>
            </div>
            <Switch
              checked={safeMode}
              onCheckedChange={(checked) => {
                setSafeMode(checked);
                saveSetting("safe_mode_enabled", checked ? "true" : "false", setSavingSafeMode);
              }}
              disabled={savingSafeMode}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserCheck className="h-5 w-5 text-[#00D4FF]" />
            Confirmation des inscriptions
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lorsque activé, les nouveaux comptes seront automatiquement approuvés sans validation manuelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Auto-confirmation</p>
              <p className="text-sm text-slate-400">
                {autoConfirm 
                  ? "Les nouveaux comptes sont automatiquement activés" 
                  : "Les nouveaux comptes nécessitent une approbation manuelle"}
              </p>
            </div>
            <Switch
              checked={autoConfirm}
              onCheckedChange={(checked) => {
                setAutoConfirm(checked);
                saveSetting("auto_confirm_signups", checked ? "true" : "false", setSavingAutoConfirm);
              }}
              disabled={savingAutoConfirm}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
