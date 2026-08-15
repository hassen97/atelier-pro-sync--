import { useEffect, useState } from "react";
import {
  ShieldCheck, ShieldAlert, Flame, Globe2, Eye, RefreshCw, Trash2,
  Mail, BellRing, BellOff, AlertTriangle, CheckCheck, Ban, Fingerprint,
  UserPlus, ArrowRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useSecurityOverview } from "@/hooks/useAdminSecurity";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AdminSecurityViewProps {
  onNavigate: (view: string) => void;
}

/* ── KPI card ─────────────────────────────────────────────────────── */
interface KpiProps {
  label: string;
  value: number;
  icon: React.ElementType;
  tone: "cyan" | "green" | "amber" | "red" | "violet";
  hint?: string;
}

const kpiTones = {
  cyan:    { border: "border-[#00D4FF]/15",   iconBg: "bg-[#00D4FF]/10",  iconText: "text-[#00D4FF]",  value: "from-[#00D4FF] to-[#00B4E0]" },
  green:   { border: "border-emerald-500/15", iconBg: "bg-emerald-500/10", iconText: "text-emerald-400", value: "from-emerald-400 to-emerald-300" },
  amber:   { border: "border-amber-500/15",   iconBg: "bg-amber-500/10",   iconText: "text-amber-400",   value: "from-amber-400 to-yellow-300" },
  red:     { border: "border-red-500/15",     iconBg: "bg-red-500/10",     iconText: "text-red-400",     value: "from-red-400 to-rose-300" },
  violet:  { border: "border-violet-500/15",  iconBg: "bg-violet-500/10",  iconText: "text-violet-400",  value: "from-violet-400 to-purple-300" },
};

function Kpi({ label, value, icon: Icon, tone, hint }: KpiProps) {
  const t = kpiTones[tone];
  return (
    <div className={cn("relative rounded-xl border p-4 bg-[#101827] overflow-hidden", t.border)}>
      <div className="flex items-start justify-between mb-2">
        <div className={cn("p-2 rounded-lg", t.iconBg)}>
          <Icon className={cn("h-4 w-4", t.iconText)} />
        </div>
      </div>
      <p className={cn("text-2xl font-bold tabular-nums bg-gradient-to-r bg-clip-text text-transparent", t.value)}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-slate-600 mt-0.5">{hint}</p>}
    </div>
  );
}

/* ── Main view ────────────────────────────────────────────────────── */
export function AdminSecurityView({ onNavigate }: AdminSecurityViewProps) {
  const s = useSecurityOverview();
  const [testEmail, setTestEmail] = useState("");
  const [testing, setTesting] = useState(false);
  const [purgeOpen, setPurgeOpen] = useState(false);

  useEffect(() => {
    if (s.settings?.email) setTestEmail(s.settings.email);
  }, [s.settings?.email]);

  const sendTestAlert = async () => {
    setTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-admin-signup", {
        body: {
          test: true,
          username: "securite_test",
          full_name: "Test Centre de Sécurité",
          email: s.settings?.email || "test@example.com",
          phone: "+216 00 000 000",
          country: "TN",
        },
      });
      if (error) throw error;
      const parts: string[] = [];
      if ((data as any)?.emailQueued) parts.push(`E-mail envoyé à ${(data as any).emailRecipient}`);
      else if (!s.settings?.email) parts.push("Configurez d'abord l'e-mail destinataire");
      else if (!s.settings?.emailEnabled) parts.push("E-mail désactivé");
      if (!s.settings?.browserEnabled) parts.push("Notifications navigateur désactivées");
      toast.success(parts.join(" · ") || "Alerte de test déclenchée");
    } catch (e: any) {
      toast.error(e?.message ?? "Échec du test");
    } finally {
      setTesting(false);
    }
  };

  const handlePurge = async () => {
    setPurgeOpen(true);
    try {
      await s.purge.mutateAsync(24);
    } catch {
      // error already surfaced by the mutation's onError toast
    } finally {
      setPurgeOpen(false);
    }
  };


  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-emerald-500/20 border border-[#00D4FF]/20 flex items-center justify-center">
            <ShieldCheck className="h-4.5 w-4.5 text-[#00D4FF]" style={{ width: 18, height: 18 }} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Centre de Sécurité</h2>
            <p className="text-xs text-slate-500">Surveillance des inscriptions, tentatives et notifications d'alerte</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {s.floodDetected ? (
            <Badge variant="outline" className="border-red-500/40 bg-red-500/10 text-red-300">
              <Flame className="h-3 w-3 mr-1" /> Activité anormale
            </Badge>
          ) : (
            <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
              <span className="relative flex h-1.5 w-1.5 mr-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              Protection active
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            onClick={() => s.attempts.refetch()}
          >
            <RefreshCw className={cn("h-3.5 w-3.5 mr-1.5", s.attempts.isFetching && "animate-spin")} />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Flood alert banner */}
      {s.floodDetected && (
        <div className="relative rounded-xl border border-red-500/25 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent p-4 overflow-hidden">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-red-500/15 border border-red-500/25 shrink-0">
              <ShieldAlert className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-300">Détection de rafale d'inscriptions</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {s.last24h} tentatives en 24h et un pic de {s.maxBurst} par IP. Vérifiez la liste des IPs suspectes ci-dessous
                — une charge de test ou une attaque automatisée est probable. Vous pouvez couper les alertes e-mail temporairement
                dans le panneau Notifications.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Kpi label="Tentatives (24h)" value={s.last24h} icon={Fingerprint} tone={s.last24h >= 50 ? "red" : "cyan"} />
        <Kpi label="IPs suspectes" value={s.suspiciousIps.length} icon={Ban} tone={s.suspiciousIps.length ? "amber" : "green"} hint="≥ 3 tentatives" />
        <Kpi label="Inscriptions (24h)" value={s.last24hEvents} icon={UserPlus} tone="violet" />
        <Kpi label="Pic tentatives / IP" value={s.maxBurst} icon={Flame} tone={s.maxBurst >= 10 ? "red" : "amber"} />
        <Kpi label="Événements non lus" value={s.unreadEvents.length} icon={Eye} tone="green" hint="à examiner" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Suspicious IPs */}
        <div className="rounded-xl border border-white/5 bg-[#101827] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="h-4 w-4 text-amber-400" />
            <h3 className="font-semibold text-white text-sm">IPs suspectes</h3>
            <span className="ml-auto text-[10px] text-slate-600">classées par fréquence</span>
          </div>

          {s.attempts.isLoading ? (
            <div className="h-24 rounded-lg bg-white/5 animate-pulse" />
          ) : s.suspiciousIps.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500">Aucune IP suspecte détectée</p>
              <p className="text-[10px] text-slate-600 mt-1">Seuil : {3} tentatives ou plus</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {s.suspiciousIps.slice(0, 10).map((g) => (
                <button
                  key={g.ip}
                  onClick={() => onNavigate("signup_attempts")}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2 bg-white/[0.03] border border-white/5 hover:border-amber-500/30 hover:bg-amber-500/5 transition-colors text-left"
                >
                  <span
                    className={cn(
                      "shrink-0 px-2 py-0.5 rounded-md text-xs font-mono font-semibold",
                      g.count >= 10 ? "bg-red-500/15 text-red-300" : g.count >= 5 ? "bg-amber-500/15 text-amber-300" : "bg-orange-500/15 text-orange-300"
                    )}
                  >
                    {g.count}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block font-mono text-xs text-white truncate">{g.ip}</span>
                    <span className="block text-[10px] text-slate-600">dernière activité {new Date(g.lastSeen).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-slate-600" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Live signup events */}
        <div className="rounded-xl border border-white/5 bg-[#101827] p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe2 className="h-4 w-4 text-[#00D4FF]" />
            <h3 className="font-semibold text-white text-sm">Dernières inscriptions</h3>
            {s.unreadEvents.length > 0 && (
              <Badge variant="outline" className="border-[#00D4FF]/30 bg-[#00D4FF]/10 text-[#00D4FF] text-[10px]">
                {s.unreadEvents.length} non lu{s.unreadEvents.length > 1 ? "s" : ""}
              </Badge>
            )}
            {s.unreadEvents.length > 0 && (
              <button
                onClick={() => s.markSeen.mutateAsync((s.events.data ?? []).map((e) => e.id))}
                className="ml-auto flex items-center gap-1 text-[11px] text-slate-500 hover:text-[#00D4FF] transition-colors"
              >
                <CheckCheck className="h-3 w-3" /> Tout marquer lu
              </button>
            )}
          </div>

          {s.events.isLoading ? (
            <div className="h-24 rounded-lg bg-white/5 animate-pulse" />
          ) : (s.events.data ?? []).length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-xs text-slate-500">Aucune inscription récente</p>
            </div>
          ) : (
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {(s.events.data ?? []).slice(0, 8).map((e) => (
                <div
                  key={e.id}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 border transition-colors",
                    e.seen_at ? "bg-transparent border-white/5" : "bg-[#00D4FF]/5 border-[#00D4FF]/15"
                  )}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-[#00D4FF]">
                      {(e.full_name || e.username || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white truncate">{e.full_name || e.username || "Inscription"}</p>
                    <p className="text-[10px] text-slate-600 truncate">
                      @{e.username || "—"} {e.country ? `· ${e.country}` : ""} ·{" "}
                      {new Date(e.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  {!e.seen_at && <span className="w-2 h-2 rounded-full bg-[#00D4FF] shrink-0" />}
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => onNavigate("signup_events")}
            className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs text-slate-400 hover:text-[#00D4FF] hover:bg-[#00D4FF]/5 border border-white/5 transition-colors"
          >
            Voir tous les événements <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Notification controls */}
      <div className="rounded-xl border border-white/5 bg-[#101827] p-4">
        <div className="flex items-center gap-2 mb-3">
          <BellRing className="h-4 w-4 text-cyan-400" />
          <h3 className="font-semibold text-white text-sm">Alertes d'inscription</h3>
          <span className="text-[10px] text-slate-600">coupez-les temporairement en cas de rafale</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-slate-300 text-xs">E-mail destinataire</Label>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="admin@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
              />
              <Button
                size="sm"
                variant="outline"
                className="border-[#00D4FF]/25 text-[#00D4FF] hover:bg-[#00D4FF]/10 shrink-0"
                onClick={() => s.updateNotify({ email: testEmail.trim() })}
              >
                <Mail className="h-3.5 w-3.5 mr-1.5" /> Enregistrer
              </Button>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-3">
            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <p className="text-xs font-medium text-white">Notifications e-mail</p>
                  <p className="text-[10px] text-slate-600">un e-mail à chaque inscription</p>
                </div>
              </div>
              <Switch
                checked={s.settings?.emailEnabled ?? true}
                disabled={s.settingsLoading}
                onCheckedChange={(v) => s.updateNotify({ emailEnabled: v })}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5">
              <div className="flex items-center gap-2">
                <BellOff className="h-3.5 w-3.5 text-slate-400" />
                <div>
                  <p className="text-xs font-medium text-white">Notifications navigateur</p>
                  <p className="text-[10px] text-slate-600">toast + push dans l'admin</p>
                </div>
              </div>
              <Switch
                checked={s.settings?.browserEnabled ?? true}
                disabled={s.settingsLoading}
                onCheckedChange={(v) => s.updateNotify({ browserEnabled: v })}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-white/5">
          <Button
            size="sm"
            className="bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/25 hover:bg-[#00D4FF]/20"
            onClick={sendTestAlert}
            disabled={testing}
          >
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <AlertTriangle className="h-3.5 w-3.5 mr-1.5" />}
            Envoyer une alerte de test
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="border-white/10 text-slate-300 hover:bg-white/5"
            onClick={handlePurge}
            disabled={s.purge.isPending}
          >
            {purgeOpen ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5 mr-1.5" />}
            Nettoyer les tentatives (+24h)
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400"
            onClick={() => onNavigate("signup_attempts")}
          >
            Voir les tentatives <ArrowRight className="h-3 w-3 ml-1.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
