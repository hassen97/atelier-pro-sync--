import { useMemo, useState } from "react";
import { Copy, Check, Share2, Send, Users, Store, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SEO } from "@/components/seo/SEO";
import { useMyReferrals } from "@/hooks/useReferrals";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function Referrals() {
  const { data, isLoading } = useMyReferrals();
  const { settings } = useShopSettingsContext();
  const [copied, setCopied] = useState(false);

  const link = data?.link ?? "";

  const whatsappMessage = useMemo(() => {
    const shop = settings.shop_name || "ma boutique";
    return (
      `🚀 Salut ! J'utilise *RepairPro* pour gérer ${shop} (réparations, caisse, stock, clients) et ça m'a changé la vie.\n\n` +
      `Je te l'offre en test : crée ton atelier en 2 minutes avec mon lien et on gagne tous les deux un mois gratuit 👇\n\n` +
      `${link}`
    );
  }, [settings.shop_name, link]);

  const handleCopy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Impossible de copier le lien.");
    }
  };

  const handleWhatsApp = () => {
    if (!link) return;
    window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank", "noopener,noreferrer");
  };

  const handleNativeShare = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "RepairPro", text: whatsappMessage });
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopy();
    }
  };

  const stats = [
    { label: "Invitations envoyées", value: data?.invitesSent ?? 0, icon: Send, accent: "from-blue-500/20 to-blue-500/5", text: "text-blue-500" },
    { label: "Boutiques inscrites", value: data?.shopsOnboarded ?? 0, icon: Store, accent: "from-emerald-500/20 to-emerald-500/5", text: "text-emerald-500" },
    { label: "Mois gratuits gagnés", value: data?.freeMonthsEarned ?? 0, icon: Gift, accent: "from-violet-500/20 to-violet-500/5", text: "text-violet-500" },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <SEO
        title="Parrainage — Invitez et gagnez des mois gratuits | RepairPro"
        description="Invitez d'autres ateliers de réparation et gagnez des mois d'abonnement gratuits."
        path="/referrals"
      />

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-background to-background p-6 sm:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Programme de parrainage
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Parrainez un atelier, gagnez un mois gratuit
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg">
            Partagez votre lien unique. Chaque boutique qui s'inscrit et démarre avec RepairPro vous rapporte
            <span className="font-semibold text-foreground"> 30 jours offerts</span>.
          </p>

          {/* Link box */}
          <div className="mt-6 flex flex-col sm:flex-row items-stretch gap-3">
            <div className="flex-1 flex items-center rounded-xl border border-border bg-card px-4 py-3 font-mono text-sm overflow-hidden">
              <span className="truncate text-muted-foreground">
                {isLoading ? "Chargement…" : link || "Lien indisponible"}
              </span>
            </div>
            <Button
              onClick={handleCopy}
              disabled={!link}
              size="lg"
              className="shrink-0 bg-gradient-to-r from-primary to-blue-500 hover:from-primary hover:to-blue-600 text-primary-foreground font-semibold shadow-lg shadow-primary/20"
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copié !" : "Copier mon lien unique"}
            </Button>
          </div>

          {/* Share buttons */}
          <div className="mt-3 flex flex-wrap gap-3">
            <Button
              onClick={handleWhatsApp}
              disabled={!link}
              variant="outline"
              className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 dark:text-emerald-400"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.477-.999zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.71.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
              </svg>
              Partager sur WhatsApp
            </Button>
            <Button onClick={handleNativeShare} disabled={!link} variant="outline">
              <Share2 className="h-4 w-4" />
              Partager
            </Button>
          </div>
        </div>
      </div>

      {/* Bento stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="relative overflow-hidden">
              <div className={cn("absolute inset-0 bg-gradient-to-br opacity-60", s.accent)} />
              <CardContent className="relative p-5">
                <div className={cn("inline-flex items-center justify-center w-10 h-10 rounded-lg bg-background/60 mb-3", s.text)}>
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-3xl font-bold tracking-tight font-mono-numbers">{s.value}</p>
                <p className="text-sm text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Referral list */}
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-border">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h2 className="font-semibold">Mes parrainages</h2>
          </div>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Chargement…</div>
          ) : !data?.referrals.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">
              Aucun parrainage pour l'instant. Partagez votre lien pour commencer ! 🚀
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {data.referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.referred_email || "Nouvelle boutique"}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: "pending" | "joined" | "rewarded" }) {
  const map = {
    pending: { label: "En attente", cls: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
    joined: { label: "Inscrit", cls: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
    rewarded: { label: "Récompensé", cls: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  } as const;
  const m = map[status];
  return <span className={cn("text-xs font-medium rounded-full px-2.5 py-1 shrink-0", m.cls)}>{m.label}</span>;
}
