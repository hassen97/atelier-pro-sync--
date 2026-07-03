import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Gift, Users, Send, CheckCircle2, MailCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type Stats = {
  total: number;
  pending: number;
  notified: number;
  signedUp: number;
};

export function WaitlistInvitationsAdminCard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    pending: 0,
    notified: 0,
    signedUp: 0,
  });
  const [sending, setSending] = useState(false);

  const loadStats = async (showToast = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-waitlist-detailed-stats" },
      });

      if (error) throw error;

      const next: Stats = {
        total: (data as any)?.total ?? 0,
        pending: (data as any)?.pending ?? 0,
        notified: (data as any)?.notified ?? 0,
        signedUp: (data as any)?.signedUp ?? 0,
      };
      setStats(next);

      if (showToast) {
        toast.success(`${next.total} inscrit${next.total > 1 ? "s" : ""} chargé${next.total > 1 ? "s" : ""}`);
      }
    } catch (e: any) {
      console.error("[WaitlistInvitations] loadStats:", e);
      toast.error(e?.message ?? "Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const sendInvitations = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("notify-waitlist", {
        body: {},
      });
      if (error) throw error;
      const queued = (data as any)?.queued ?? 0;
      const skipped = (data as any)?.skipped ?? 0;
      toast.success(
        `${queued} invitation${queued > 1 ? "s" : ""} en file d'attente${skipped > 0 ? ` · ${skipped} ignorée${skipped > 1 ? "s" : ""}` : ""}`
      );
      await loadStats();
    } catch (e: any) {
      console.error("[WaitlistInvitations] send:", e);
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="admin-glass-card border-cyan-500/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Gift className="h-5 w-5 text-cyan-400" />
          Invitations liste d'attente
        </CardTitle>
        <CardDescription className="text-slate-400">
          Notifier les inscrits sur la liste d'attente que la plateforme est ouverte.
          Chaque inscrit reçoit un email avec un cadeau de bienvenue : <b className="text-cyan-300">3 jours d'essai du plan Pro</b> activés automatiquement à la création du compte.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" /> Inscrits
            </div>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "—" : stats.total}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Send className="h-3.5 w-3.5" /> En attente
            </div>
            <p className="mt-1 text-2xl font-semibold text-cyan-300">
              {loading ? "—" : stats.pending}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MailCheck className="h-3.5 w-3.5" /> Notifiés
            </div>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "—" : stats.notified}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> Inscrits sur RepairPro
            </div>
            <p className="mt-1 text-2xl font-semibold text-emerald-300">
              {loading ? "—" : stats.signedUp}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadStats(true)}
            disabled={loading}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Rafraîchir
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={sending || stats.pending === 0}
                className="bg-gradient-to-r from-cyan-500 to-violet-500 text-white hover:from-cyan-400 hover:to-violet-400"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Gift className="h-4 w-4 mr-2" />
                )}
                Envoyer l'invitation à {stats.pending} personne{stats.pending > 1 ? "s" : ""}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Envoyer les invitations ?</AlertDialogTitle>
                <AlertDialogDescription>
                  <b>{stats.pending}</b> personne{stats.pending > 1 ? "s" : ""} de la liste d'attente
                  vont recevoir un email leur annonçant le lancement et leur cadeau
                  de <b>3 jours d'essai Pro</b>. Chaque adresse n'est notifiée qu'une seule fois.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={sendInvitations}>
                  Envoyer maintenant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
