import { useState, useMemo } from "react";
import { useAdminData, useDeleteOwner, useLockOwner } from "@/hooks/useAdmin";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useCreateAnnouncement } from "@/hooks/useAnnouncements";
import { CreateOwnerDialog } from "./CreateOwnerDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { EditOwnerSettingsDialog } from "./EditOwnerSettingsDialog";
import { GodModeSubscriptionDialog } from "./GodModeSubscriptionDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, KeyRound, Lock, Unlock, Trash2, Settings2, Search, ArrowUp, ArrowDown, Phone, MessageCircle, CheckCircle, Megaphone, LogIn, Download, ArrowRightLeft, UserCog, Zap, CreditCard, Clock, Ban, ShieldCheck, AlertTriangle } from "lucide-react";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { ShopDetailSheet } from "./ShopDetailSheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getCountryByCode, getCurrencyByCode } from "@/data/countries";
import { useAdminShopSubscriptions } from "@/hooks/useSubscription";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function ShopAnnouncementDialog({
  open,
  onOpenChange,
  userId,
  shopName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  shopName: string;
}) {
  const createAnnouncement = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [newFeatures, setNewFeatures] = useState("");
  const [changesFixes, setChangesFixes] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    createAnnouncement.mutate(
      { title, new_features: newFeatures, changes_fixes: changesFixes, target_user_id: userId },
      { onSuccess: () => { onOpenChange(false); setTitle(""); setNewFeatures(""); setChangesFixes(""); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-violet-400" />
            Annonce pour <span className="text-violet-300">{shopName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Message important" className="bg-white/5 border-white/10 text-white" />
          </div>
          <div>
            <Label className="text-slate-300">Nouvelles fonctionnalités</Label>
            <Textarea value={newFeatures} onChange={(e) => setNewFeatures(e.target.value)} placeholder="- Nouveau module" className="bg-white/5 border-white/10 text-white min-h-[90px]" />
          </div>
          <div>
            <Label className="text-slate-300">Message / Notes</Label>
            <Textarea value={changesFixes} onChange={(e) => setChangesFixes(e.target.value)} placeholder="- Info spécifique" className="bg-white/5 border-white/10 text-white min-h-[90px]" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">Annuler</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createAnnouncement.isPending} className="bg-violet-600 hover:bg-violet-700 text-white">
            <Megaphone className="h-3.5 w-3.5 mr-2" /> Envoyer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FilterType = "all" | "online" | "verified" | "trialing" | "pro" | "setup_incomplete";
type SortKey = "name" | "status" | "created_at" | null;

const ONLINE_THRESHOLD_MS = 10 * 60 * 1000; // matches header / employees view

function isOwnerOnline(lastOnline: string | null) {
  if (!lastOnline) return false;
  return Date.now() - new Date(lastOnline).getTime() < ONLINE_THRESHOLD_MS;
}

function getOnlineStatus(lastOnline: string | null) {
  if (!lastOnline) return "offline";
  const diff = Date.now() - new Date(lastOnline).getTime();
  if (diff < 5 * 60 * 1000) return "online";
  if (diff < 60 * 60 * 1000) return "away";
  return "offline";
}

const statusDot: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-red-400",
};

function getUnifiedStatus(owner: any, sub: any): { key: string; label: string; color: string; icon: any } {
  // Verification gate removed — every owner is treated as verified.
  if (sub) {
    const isExpired = sub.expires_at && new Date(sub.expires_at) < new Date();
    if (!isExpired && sub.status === "trialing") {
      return { key: "trialing", label: "Essai", color: "border-violet-500/30 text-violet-400 bg-violet-500/10", icon: Clock };
    }
    if (!isExpired && sub.status === "active") {
      return { key: "pro", label: "Pro", color: "border-amber-400/30 text-amber-300 bg-amber-400/10", icon: CreditCard };
    }
  }
  return { key: "verified", label: "Vérifié", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10", icon: CheckCircle };
}

function getDisplayName(owner: any): { name: string; isIncomplete: boolean } {
  const shopName = owner.shop_name;
  if (!shopName || shopName === "Mon Atelier") {
    return { name: `⚠️ Setup Incomplet (@${owner.username || "?"})`, isIncomplete: true };
  }
  return { name: shopName, isIncomplete: false };
}

function useBulkAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, userIds }: { action: string; userIds: string[] }) => {
      const CHUNK_SIZE = 80;
      let totalCount = 0;
      for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
        const chunk = userIds.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase.functions.invoke("admin-manage-users", {
          body: { action, userIds: chunk },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        totalCount += data?.count || chunk.length;
      }
      return { count: totalCount };
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-verification-data"] });
      const count = data?.count || variables.userIds.length;
      const labels: Record<string, string> = {
        "bulk-verify": `${count} vérifié(s)`,
        "bulk-suspend": `${count} suspendu(s)`,
        "bulk-delete": `${count} supprimé(s)`,
        "bulk-revert-to-pending": `${count} remis en attente`,
      };
      toast.success(labels[variables.action] || "Action effectuée");
    },
    onError: (err: any) => toast.error(err.message),
  });
}



export function AdminShopsView() {
  const { data } = useAdminData();
  const deleteOwner = useDeleteOwner();
  const lockOwner = useLockOwner();
  const bulkAction = useBulkAction();
  const { data: shopSubs } = useAdminShopSubscriptions();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ userId: string; name: string; country: string; currency: string } | null>(null);
  const [announcementTarget, setAnnouncementTarget] = useState<{ userId: string; shopName: string } | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [transferSource, setTransferSource] = useState<string | null>(null);
  const [godModeTarget, setGodModeTarget] = useState<{ userId: string; shopName: string } | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const owners = data?.owners || [];

  // Build subscription map
  const subMap = useMemo(() => {
    const m = new Map<string, any>();
    (shopSubs || []).forEach((s: any) => m.set(s.user_id, s));
    return m;
  }, [shopSubs]);

  const filteredOwners = useMemo(() => {
    let result = owners.map((owner: any) => ({
      ...owner,
      _status: getUnifiedStatus(owner, subMap.get(owner.user_id)),
      _display: getDisplayName(owner),
    }));

    // Filter
    if (filter !== "all") {
      if (filter === "setup_incomplete") {
        result = result.filter((o: any) => o._display.isIncomplete);
      } else if (filter === "online") {
        result = result.filter((o: any) => isOwnerOnline(o.last_online_at));
      } else {
        result = result.filter((o: any) => o._status.key === filter);
      }
    }

    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o: any) =>
        (o.shop_name || "").toLowerCase().includes(q) ||
        (o.full_name || "").toLowerCase().includes(q) ||
        (o.username || "").toLowerCase().includes(q) ||
        (o.phone || "").toLowerCase().includes(q) ||
        (o.whatsapp_phone || "").toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      result = [...result].sort((a: any, b: any) => {
        let cmp = 0;
        if (sortKey === "name") cmp = (a._display.name).localeCompare(b._display.name);
        else if (sortKey === "created_at") cmp = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [owners, filter, search, sortKey, sortDir, subMap]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("asc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const counts = useMemo(() => {
    const all = owners.map((o: any) => ({ ...o, _status: getUnifiedStatus(o, subMap.get(o.user_id)), _display: getDisplayName(o) }));
    return {
      all: all.length,
      online: all.filter((o: any) => isOwnerOnline(o.last_online_at)).length,
      verified: all.filter((o: any) => o._status.key === "verified").length,
      trialing: all.filter((o: any) => o._status.key === "trialing").length,
      pro: all.filter((o: any) => o._status.key === "pro").length,
      setup_incomplete: all.filter((o: any) => o._display.isIncomplete).length,
    };
  }, [owners, subMap]);

  const filters: { key: FilterType; label: string; color?: string }[] = [
    { key: "all", label: `Tous (${counts.all})` },
    { key: "online", label: `En ligne (${counts.online})`, color: "text-emerald-400" },
    { key: "verified", label: `Vérifiés (${counts.verified})`, color: "text-emerald-400" },
    { key: "trialing", label: `Essai (${counts.trialing})`, color: "text-violet-400" },
    { key: "pro", label: `Pro (${counts.pro})`, color: "text-amber-300" },
    { key: "setup_incomplete", label: `Setup ⚠️ (${counts.setup_incomplete})` },
  ];

  // Selection
  const allFilteredIds = filteredOwners.map((o: any) => o.user_id);
  const allSelected = filteredOwners.length > 0 && filteredOwners.every((o: any) => selectedIds.has(o.user_id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(allFilteredIds));
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkConfirm = () => {
    if (!confirmAction || selectedIds.size === 0) return;
    bulkAction.mutate(
      { action: confirmAction, userIds: Array.from(selectedIds) },
      { onSuccess: () => { setSelectedIds(new Set()); setConfirmAction(null); }, onSettled: () => setConfirmAction(null) }
    );
  };

  const confirmLabels: Record<string, { title: string; desc: string; btn: string; destructive?: boolean }> = {
    "bulk-verify": { title: "Vérifier en masse", desc: `Vérifier ${selectedIds.size} propriétaire(s) ?`, btn: "Vérifier tout" },
    "bulk-suspend": { title: "Suspendre en masse", desc: `Suspendre ${selectedIds.size} propriétaire(s) ?`, btn: "Suspendre tout", destructive: true },
    "bulk-delete": { title: "Supprimer en masse", desc: `Supprimer ${selectedIds.size} propriétaire(s) ? Irréversible.`, btn: "Supprimer tout", destructive: true },
    "bulk-revert-to-pending": { title: "Remettre en attente", desc: `Remettre ${selectedIds.size} propriétaire(s) en attente ?`, btn: "Remettre en attente" },
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#00D4FF]" />
          Gestion des boutiques
        </h2>
        <Button onClick={() => setCreateOpen(true)} className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30">
          <Plus className="h-4 w-4 mr-2" /> Nouveau propriétaire
        </Button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs",
              filter === f.key
                ? "bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30"
                : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => { setFilter(f.key); setSelectedIds(new Set()); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Rechercher par boutique, nom, username, téléphone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#00D4FF]/30"
        />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-2 flex-wrap bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-300 mr-1">{selectedIds.size} sélectionné(s)</span>
          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 text-xs" onClick={() => setConfirmAction("bulk-delete")} disabled={bulkAction.isPending}>
            <Trash2 className="h-3 w-3 mr-1" /> Supprimer
          </Button>
          <Button size="sm" variant="ghost" className="text-slate-400 hover:bg-white/5 h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
            Désélectionner
          </Button>
        </div>
      )}

      {/* Unified Table */}
      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="border-slate-600 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                />
              </TableHead>
              <TableHead className="text-slate-400 text-xs cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                Boutique <SortIcon col="name" />
              </TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Propriétaire</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("created_at")}>
                Inscription <SortIcon col="created_at" />
              </TableHead>
              <TableHead className="text-slate-400 text-xs">Statut</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">Contact</TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Activité</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOwners.map((owner: any) => {
              const status = getOnlineStatus(owner.last_online_at);
              const unified = owner._status;
              const display = owner._display;
              const StatusIcon = unified.icon;
              const isSelected = selectedIds.has(owner.user_id);

              return (
                <TableRow
                  key={owner.user_id}
                  className={cn(
                    "border-white/5 cursor-pointer hover:bg-white/5 transition-colors",
                    owner.is_locked && "opacity-60",
                    isSelected && "bg-[#00D4FF]/5"
                  )}
                  onClick={() => setSelectedShopId(owner.user_id)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(owner.user_id)}
                      className="border-slate-600 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className={cn("text-sm font-medium", display.isIncomplete ? "text-amber-400" : "text-white")}>
                            {display.name}
                          </span>
                          {owner.verification_status === "verified" && !display.isIncomplete && <VerifiedBadge />}
                        </div>
                        <span className="text-xs text-slate-500">
                          {getCountryByCode(owner.country || "TN")?.flag} {getCurrencyByCode(owner.currency || "TND")?.code}
                        </span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div>
                      <span className="text-white text-sm">{owner.full_name || owner.username}</span>
                      <p className="text-xs text-slate-500">@{owner.username}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">
                    {format(new Date(owner.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", unified.color)}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {unified.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      {(owner.whatsapp_phone || owner.phone) ? (
                        <a
                          href={`https://wa.me/${(owner.whatsapp_phone || owner.phone || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MessageCircle className="h-3 w-3" />
                        </a>
                      ) : null}
                      {owner.phone ? (
                        <a href={`tel:${owner.phone}`} className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Phone className="h-3 w-3" />
                        </a>
                      ) : null}
                      {!owner.phone && !owner.whatsapp_phone && <span className="text-xs text-slate-600">—</span>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", statusDot[status])} />
                      <div>
                        <span className="text-sm text-white font-mono-numbers">{owner.repair_count}</span>
                        <span className="text-xs text-slate-500 ml-1">rép.</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="text-[#00D4FF]" onClick={() => setGodModeTarget({ userId: owner.user_id, shopName: display.name })}>
                          <Zap className="h-4 w-4 mr-2" /> God Mode — Abonnement
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setEditTarget({ userId: owner.user_id, name: owner.full_name || owner.username || "", country: owner.country || "TN", currency: owner.currency || "TND" })}>
                          <Settings2 className="h-4 w-4 mr-2" /> Modifier pays/devise
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetTarget({ userId: owner.user_id, name: owner.full_name || owner.username || "" })}>
                          <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnnouncementTarget({ userId: owner.user_id, shopName: owner.shop_name })}>
                          <Megaphone className="h-4 w-4 mr-2" /> Envoyer une annonce
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          const newRole = prompt("Nouveau rôle (super_admin ou employee) :", "employee");
                          if (!newRole || !["super_admin", "employee"].includes(newRole)) return;
                          const { error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "change-role", userId: owner.user_id, newRole } });
                          if (error) toast.error("Erreur"); else toast.success("Rôle modifié");
                        }}>
                          <UserCog className="h-4 w-4 mr-2" /> Changer le rôle
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setTransferSource(owner.user_id)}>
                          <ArrowRightLeft className="h-4 w-4 mr-2" /> Transférer les données
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={async () => {
                          toast.info("Export en cours...");
                          const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "export-shop-data", userId: owner.user_id } });
                          if (error) { toast.error("Erreur d'export"); return; }
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement("a"); a.href = url; a.download = `backup-${owner.shop_name}-${new Date().toISOString().slice(0,10)}.json`; a.click(); URL.revokeObjectURL(url);
                          toast.success("Export téléchargé");
                        }}>
                          <Download className="h-4 w-4 mr-2" /> Sauvegarder (JSON)
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => { window.location.href = `/?impersonate=${owner.user_id}&mode=readonly`; }}>
                          <LogIn className="h-4 w-4 mr-2" /> Accéder à la boutique
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-red-400" onClick={() => { if (confirm(`Supprimer ${owner.full_name || owner.username} ?`)) deleteOwner.mutate(owner.user_id); }}>
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOwners.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  Aucune boutique trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bulk confirm dialog */}
      {confirmAction && confirmLabels[confirmAction] && (
        <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
          <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmLabels[confirmAction].title}</AlertDialogTitle>
              <AlertDialogDescription className="text-slate-400">{confirmLabels[confirmAction].desc}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-white/5 border-white/10 text-slate-300">Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleBulkConfirm}
                className={confirmLabels[confirmAction].destructive ? "bg-red-600 hover:bg-red-700" : "bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"}
              >
                {confirmLabels[confirmAction].btn}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}

      {/* Dialogs */}
      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} />
      {announcementTarget && (
        <ShopAnnouncementDialog open={!!announcementTarget} onOpenChange={() => setAnnouncementTarget(null)} userId={announcementTarget.userId} shopName={announcementTarget.shopName} />
      )}
      {resetTarget && (
        <ResetPasswordDialog open={!!resetTarget} onOpenChange={() => setResetTarget(null)} userId={resetTarget.userId} userName={resetTarget.name} />
      )}
      {editTarget && (
        <EditOwnerSettingsDialog open={!!editTarget} onOpenChange={() => setEditTarget(null)} userId={editTarget.userId} userName={editTarget.name} currentCountry={editTarget.country} currentCurrency={editTarget.currency} />
      )}
      <ShopDetailSheet userId={selectedShopId} onClose={() => setSelectedShopId(null)} />
      {godModeTarget && (
        <GodModeSubscriptionDialog open={!!godModeTarget} onOpenChange={(v) => !v && setGodModeTarget(null)} userId={godModeTarget.userId} shopName={godModeTarget.shopName} />
      )}
      {transferSource && (
        <Dialog open={!!transferSource} onOpenChange={() => setTransferSource(null)}>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ArrowRightLeft className="h-4 w-4 text-[#00D4FF]" />
                Transférer les données
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-slate-400">Cloner produits, clients et catégories vers une autre boutique.</p>
              <div className="space-y-2">
                <Label className="text-slate-300">Boutique cible</Label>
                <select className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm" id="transfer-target">
                  {owners.filter((o: any) => o.user_id !== transferSource).map((o: any) => (
                    <option key={o.user_id} value={o.user_id} className="bg-slate-900">{o.shop_name} (@{o.username})</option>
                  ))}
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setTransferSource(null)} className="text-slate-400">Annuler</Button>
              <Button
                className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
                onClick={async () => {
                  const target = (document.getElementById("transfer-target") as HTMLSelectElement)?.value;
                  if (!target) return;
                  toast.info("Transfert en cours...");
                  const { data, error } = await supabase.functions.invoke("admin-manage-users", { body: { action: "transfer-data", userId: transferSource, targetUserId: target } });
                  if (error) toast.error("Erreur"); else toast.success(`Transféré : ${data?.cloned?.products || 0} produits, ${data?.cloned?.customers || 0} clients`);
                  setTransferSource(null);
                }}
              >
                <ArrowRightLeft className="h-4 w-4 mr-2" /> Transférer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
