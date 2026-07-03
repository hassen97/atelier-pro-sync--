import { useState } from "react";
import { useAdminOrders, useAdminReviewOrder } from "@/hooks/useSubscription";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  CheckCircle, XCircle, AlertCircle, Loader2, Eye, ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  approved: { label: "Approuvé", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20", icon: CheckCircle },
  rejected: { label: "Rejeté", color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle },
  pending: { label: "En attente", color: "text-amber-400 bg-amber-400/10 border-amber-400/20", icon: AlertCircle },
};

function UserCell({ order }: { order: any }) {
  const p = order.profile;
  const primary =
    (p?.username && `@${p.username}`) ||
    p?.full_name ||
    p?.email ||
    `${order.user_id.slice(0, 8)}…`;
  const secondary =
    p?.username && p?.full_name ? p.full_name :
    p?.username && p?.email ? p.email :
    p?.full_name && p?.email ? p.email :
    null;
  return (
    <div className="flex flex-col leading-tight">
      <span className="text-xs text-white font-medium">{primary}</span>
      {secondary && <span className="text-[10px] text-slate-500 font-mono truncate max-w-[180px]">{secondary}</span>}
    </div>
  );
}

export function AdminOrdersView() {
  const { data: orders, isLoading } = useAdminOrders();
  const reviewOrder = useAdminReviewOrder();
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [proofUrl, setProofUrl] = useState<string | null>(null);

  const handleReview = (status: "approved" | "rejected") => {
    if (!reviewTarget) return;

    // Safety net: block if critical IDs are missing
    if (!reviewTarget.plan_id || !reviewTarget.user_id) {
      toast.error("Erreur : Données de plan manquantes pour cette commande.");
      return;
    }

    reviewOrder.mutate(
      {
        orderId: reviewTarget.id,
        status,
        adminNote,
        userId: reviewTarget.user_id,
        planId: reviewTarget.plan_id,
      },
      {
        onSuccess: () => {
          toast.success(status === "approved" ? "Commande approuvée — abonnement activé" : "Commande rejetée");
          setReviewTarget(null);
          setAdminNote("");
        },
        onError: (e: any) => toast.error(e.message),
      }
    );
  };

  const openProof = async (path: string) => {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(path, 120);
    if (data?.signedUrl) setProofUrl(data.signedUrl);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  const pending = orders?.filter((o) => o.status === "pending") ?? [];
  const reviewed = orders?.filter((o) => o.status !== "pending") ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Commandes d'abonnement</h2>
        {pending.length > 0 && (
          <Badge className="bg-amber-400/10 text-amber-400 border border-amber-400/20">
            {pending.length} en attente
          </Badge>
        )}
      </div>

      {/* Pending */}
      {pending.length > 0 && (
        <div className="admin-glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-medium text-amber-400">⚡ À traiter</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs">Utilisateur</TableHead>
                <TableHead className="text-slate-400 text-xs">Plan</TableHead>
                <TableHead className="text-slate-400 text-xs">Montant</TableHead>
                <TableHead className="text-slate-400 text-xs">Méthode</TableHead>
                <TableHead className="text-slate-400 text-xs">Date</TableHead>
                <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pending.map((order: any) => (
                <TableRow key={order.id} className="border-white/5 hover:bg-white/[0.02]">
                  <TableCell><UserCell order={order} /></TableCell>
                  <TableCell className="text-sm text-white font-medium">{order.plan?.name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-[#00D4FF] font-mono-numbers">
                    {order.amount} {order.currency}
                  </TableCell>
                  <TableCell className="text-xs text-slate-400 capitalize">{order.gateway_key}</TableCell>
                  <TableCell className="text-xs text-slate-500">
                    {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {order.proof_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-slate-400 hover:text-white"
                          onClick={() => openProof(order.proof_url)}
                        >
                          <Eye className="h-3.5 w-3.5 mr-1" /> Preuve
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="h-7 px-3 text-xs bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
                        onClick={() => { setReviewTarget(order); setAdminNote(""); }}
                      >
                        Traiter
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Reviewed */}
      {reviewed.length > 0 && (
        <div className="admin-glass-card rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-white/5">
            <h3 className="text-sm font-medium text-slate-400">Historique</h3>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-white/5 hover:bg-transparent">
                <TableHead className="text-slate-400 text-xs">Utilisateur</TableHead>
                <TableHead className="text-slate-400 text-xs">Plan</TableHead>
                <TableHead className="text-slate-400 text-xs">Montant</TableHead>
                <TableHead className="text-slate-400 text-xs">Date</TableHead>
                <TableHead className="text-slate-400 text-xs">Statut</TableHead>
                <TableHead className="text-slate-400 text-xs">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reviewed.map((order: any) => {
                const s = statusConfig[order.status] ?? statusConfig.pending;
                const Icon = s.icon;
                return (
                  <TableRow key={order.id} className="border-white/5 hover:bg-white/[0.02]">
                    <TableCell><UserCell order={order} /></TableCell>
                    <TableCell className="text-sm text-white">{order.plan?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono-numbers text-slate-300">
                      {order.amount} {order.currency}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {format(new Date(order.created_at), "dd MMM yyyy", { locale: fr })}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] border ${s.color}`}>
                        <Icon className="h-3 w-3 mr-1" /> {s.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[160px] truncate">
                      {order.admin_note ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => setReviewTarget(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Traiter la commande</DialogTitle>
          </DialogHeader>
          {reviewTarget && (
            <div className="space-y-4">
              <div className="rounded-lg bg-white/5 p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Plan</span>
                  <span className="text-white font-medium">{reviewTarget.plan?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Montant</span>
                  <span className="text-[#00D4FF] font-mono-numbers">{reviewTarget.amount} {reviewTarget.currency}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Méthode</span>
                  <span className="text-white capitalize">{reviewTarget.gateway_key}</span>
                </div>
              </div>
              {reviewTarget.proof_url && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 border-white/10 text-slate-300"
                  onClick={() => openProof(reviewTarget.proof_url)}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Voir la preuve de paiement
                </Button>
              )}
              <div>
                <Label className="text-slate-300">Note administrative (optionnelle)</Label>
                <Textarea
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                  placeholder="Ex: Paiement vérifié, reçu confirmé..."
                  className="bg-white/5 border-white/10 text-white mt-1.5"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => setReviewTarget(null)}
              className="text-slate-400"
            >
              Annuler
            </Button>
            <Button
              onClick={() => handleReview("rejected")}
              disabled={reviewOrder.isPending}
              className="bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
            >
              <XCircle className="h-4 w-4 mr-2" /> Rejeter
            </Button>
            <Button
              onClick={() => handleReview("approved")}
              disabled={reviewOrder.isPending}
              className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30"
            >
              {reviewOrder.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Approuver & Activer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Proof Preview Dialog */}
      <Dialog open={!!proofUrl} onOpenChange={() => setProofUrl(null)}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">Preuve de paiement</DialogTitle>
          </DialogHeader>
          {proofUrl && (
            <img src={proofUrl} alt="Preuve de paiement" className="w-full rounded-lg object-contain max-h-[60vh]" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
