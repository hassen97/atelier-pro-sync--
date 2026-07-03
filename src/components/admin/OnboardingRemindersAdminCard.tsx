import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Users, Send, MailX, MailCheck } from "lucide-react";
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
  totalIncomplete: number;
  withEmail: number;
  withoutEmail: number;
  reachableRemindersLeft: number;
};

export function OnboardingRemindersAdminCard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    totalIncomplete: 0,
    withEmail: 0,
    withoutEmail: 0,
    reachableRemindersLeft: 0,
  });
  const [sending, setSending] = useState(false);

  const loadStats = async (showToast = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-onboarding-stats" },
      });
      if (error) throw error;
      const next: Stats = {
        totalIncomplete: (data as any)?.totalIncomplete ?? 0,
        withEmail: (data as any)?.withEmail ?? 0,
        withoutEmail: (data as any)?.withoutEmail ?? 0,
        reachableRemindersLeft: (data as any)?.reachableRemindersLeft ?? 0,
      };
      setStats(next);
      if (showToast) {
        toast.success(
          `${next.totalIncomplete} propriétaire${next.totalIncomplete > 1 ? "s" : ""} avec configuration incomplète`
        );
      }
    } catch (e: any) {
      console.error("[OnboardingReminders] loadStats:", e);
      toast.error(e?.message ?? "Impossible de charger les statistiques");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const sendReminders = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-onboarding-reminder",
        { body: { mode: "manual" } }
      );
      if (error) throw error;
      const queued = (data as any)?.queued ?? 0;
      const skipped = (data as any)?.skipped ?? 0;
      toast.success(
        `${queued} email${queued > 1 ? "s" : ""} en file d'attente${skipped > 0 ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""}` : ""}`
      );
      await loadStats();
    } catch (e: any) {
      console.error("[OnboardingReminders] send:", e);
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  const reachable = stats.reachableRemindersLeft;

  return (
    <Card className="admin-glass-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Mail className="h-5 w-5 text-violet-400" />
          Rappels de configuration boutique
        </CardTitle>
        <CardDescription className="text-slate-400">
          Suivez les propriétaires qui n'ont pas terminé la configuration de leur atelier.
          Une relance email automatique tourne chaque jour (J+2 et J+7 après inscription,
          max 2 rappels par compte).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" /> Configuration non terminée
            </div>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "—" : stats.totalIncomplete}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MailCheck className="h-3.5 w-3.5" /> Email lié
            </div>
            <p className="mt-1 text-2xl font-semibold text-violet-300">
              {loading ? "—" : stats.withEmail}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <MailX className="h-3.5 w-3.5" /> Sans email
            </div>
            <p className="mt-1 text-2xl font-semibold text-amber-300">
              {loading ? "—" : stats.withoutEmail}
            </p>
          </div>
        </div>

        {!loading && stats.withoutEmail > 0 && (
          <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90">
            <b>{stats.withoutEmail}</b> propriétaire{stats.withoutEmail > 1 ? "s n'ont" : " n'a"}{" "}
            pas d'adresse email liée à leur compte (inscription via username uniquement).
            Ces comptes ne peuvent pas recevoir de rappel email — il faudra les contacter
            par WhatsApp ou téléphone.
          </div>
        )}

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
                disabled={sending || reachable === 0}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer email à {reachable} propriétaire{reachable > 1 ? "s" : ""}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'envoi des rappels</AlertDialogTitle>
                <AlertDialogDescription>
                  Un email de rappel va être envoyé à <b>{reachable}</b> propriétaire
                  {reachable > 1 ? "s" : ""} dont la boutique n'est pas configurée
                  et qui ont une adresse email valide. Les comptes ayant déjà reçu un rappel
                  dans les 3 derniers jours, ou qui ont atteint la limite de 2 rappels,
                  seront automatiquement ignorés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={sendReminders}>
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
