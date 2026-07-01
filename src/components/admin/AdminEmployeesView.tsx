import { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MoreHorizontal, KeyRound, Trash2, Users, Search, Lock, Unlock,
  ShieldCheck, Copy, Check, RefreshCw, Store, UserCog, ChevronLeft, ChevronRight,
  Wifi, WifiOff, Clock, Calendar, UserX, UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { EmployeeRecord } from "@/hooks/useAdmin";
import { AdminEmployeeDetailSheet } from "./AdminEmployeeDetailSheet";


const PAGE_SIZE = 50;

const roleConfig: Record<string, { label: string; color: string }> = {
  employee: { label: "Employé", color: "border-slate-500/30 text-slate-400 bg-slate-500/10" },
  manager: { label: "Manager", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  admin: { label: "Admin", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  super_admin: { label: "Propriétaire", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
};

function generateSecurePassword(length = 12): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr).map((b) => chars[b % chars.length]).join("");
}

function Avatar({ name, username }: { name: string | null; username: string | null }) {
  const display = name || username || "?";
  const initials = display.slice(0, 2).toUpperCase();
  const hue = (display.charCodeAt(0) * 37 + display.charCodeAt(1 < display.length ? 1 : 0) * 17) % 360;
  return (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
      style={{ background: `hsl(${hue}, 60%, 40%)` }}
    >
      {initials}
    </div>
  );
}

// ── Generate & Copy Password Modal ──
interface CredentialsModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  userName: string;
  username: string | null;
}

function GenerateCredentialsModal({ open, onOpenChange, userId, userName, username }: CredentialsModalProps) {
  const [password, setPassword] = useState(() => generateSecurePassword());
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleGenerate = () => {
    setPassword(generateSecurePassword());
    setCopied(false);
  };

  const handleApply = async () => {
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reset-password", userId, newPassword: password },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Mot de passe mis à jour avec succès");
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    const text = `Utilisateur: ${username || userName}\nMot de passe: ${password}`;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#00D4FF]" />
            Nouveau mot de passe — {userName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10">
            <p className="text-xs text-slate-500 mb-1">Mot de passe généré</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-sm font-mono text-emerald-400 break-all">{password}</code>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-slate-400 hover:text-white"
                onClick={handleGenerate}
                title="Régénérer"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full gap-2 border-[#00D4FF]/30 text-[#00D4FF] hover:bg-[#00D4FF]/10"
            onClick={handleCopy}
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copié !" : "Copier les identifiants"}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleApply} disabled={isSaving}>
            {isSaving ? "Application..." : "Appliquer ce mot de passe"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Re-assign Shop Modal ──
interface ReassignShopModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: EmployeeRecord;
  shops: Array<{ user_id: string; shop_name: string; username: string | null }>;
  onSuccess: () => void;
}

function ReassignShopModal({ open, onOpenChange, employee, shops, onSuccess }: ReassignShopModalProps) {
  const [selectedOwner, setSelectedOwner] = useState<string>(employee.owner_id);
  const [shopSearch, setShopSearch] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const filteredShops = shops.filter((s) => {
    const q = shopSearch.toLowerCase();
    return (
      s.shop_name.toLowerCase().includes(q) ||
      (s.username || "").toLowerCase().includes(q)
    );
  });

  const handleSave = async () => {
    if (selectedOwner === employee.owner_id) { onOpenChange(false); return; }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reassign-employee", memberId: employee.id, newOwnerId: selectedOwner },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      toast.success("Employé réassigné avec succès");
      onSuccess();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de la réassignation");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-4 w-4 text-[#00D4FF]" />
            Réassigner {employee.full_name || employee.username} à une boutique
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            placeholder="Rechercher une boutique..."
            value={shopSearch}
            onChange={(e) => setShopSearch(e.target.value)}
            className="bg-white/5 border-white/10 text-white placeholder:text-slate-600"
          />
          <div className="max-h-52 overflow-y-auto space-y-1 rounded-lg border border-white/10 p-1">
            {filteredShops.map((s) => (
              <button
                key={s.user_id}
                onClick={() => setSelectedOwner(s.user_id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-all",
                  selectedOwner === s.user_id
                    ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                    : "text-slate-300 hover:bg-white/5"
                )}
              >
                <span className="font-medium">{s.shop_name}</span>
                <span className="text-xs text-slate-500">@{s.username || "—"}</span>
              </button>
            ))}
            {filteredShops.length === 0 && (
              <p className="text-center text-xs text-slate-600 py-4">Aucune boutique trouvée</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSave} disabled={isSaving || selectedOwner === employee.owner_id}>
            {isSaving ? "Réassignation..." : "Confirmer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ──
type FilterType = "all" | "active" | "online" | "suspended" | "removed";

function isOnline(lastOnline: string | null, now: number) {
  return !!lastOnline && new Date(lastOnline).getTime() > now - 10 * 60 * 1000;
}

export function AdminEmployeesView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [now, setNow] = useState(() => Date.now());
  const [filter, setFilter] = useState<FilterType>("all");
  const [credentialsTarget, setCredentialsTarget] = useState<EmployeeRecord | null>(null);
  const [reassignTarget, setReassignTarget] = useState<EmployeeRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);
  const [roleToggleTarget, setRoleToggleTarget] = useState<EmployeeRecord | null>(null);
  const [detailTarget, setDetailTarget] = useState<EmployeeRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-employees" },
      });
      if (error) throw error;
      return data as { employees: EmployeeRecord[] };
    },
    enabled: !!user,
    refetchInterval: 60_000,
  });

  // Tick `now` every 30 s so "last seen" labels update without full refetch
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch all shops for re-assignment
  const { data: shopsData } = useQuery({
    queryKey: ["admin-all-shops"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return (data?.owners || []) as Array<{ user_id: string; shop_name: string; username: string | null }>;
    },
    enabled: !!user,
  });

  const deleteEmployee = useMutation({
    mutationFn: async ({ employeeUserId }: { memberId: string; employeeUserId: string }) => {
      const { data, error } = await supabase.functions.invoke("wipe-employee", {
        body: { employeeUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Employé complètement effacé — aucune trace restante");
      setDeleteTarget(null);
      setDetailTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  const lockUnlockEmployee = useMutation({
    mutationFn: async ({ userId, lock }: { userId: string; lock: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: lock ? "lock" : "unlock", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      toast.success(variables.lock ? "Compte suspendu" : "Compte activé");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "change-role", userId, newRole },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Rôle modifié avec succès");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors du changement de rôle"),
  });

  const employees = data?.employees || [];
  const shops = shopsData || [];

  // ── Stats ──
  const stats = useMemo(() => {
    const removed = employees.filter((e) => e.status === "removed");
    const activeMembers = employees.filter((e) => e.status !== "removed");
    return {
      total: employees.length,
      active: activeMembers.filter((e) => !e.is_locked).length,
      online: activeMembers.filter((e) => isOnline(e.last_online_at, now)).length,
      suspended: activeMembers.filter((e) => e.is_locked).length,
      removed: removed.length,
    };
  }, [employees, now]);

  const filters: { key: FilterType; label: string; count: number }[] = [
    { key: "all", label: "Tous", count: stats.total },
    { key: "active", label: "Actifs", count: stats.active },
    { key: "online", label: "En ligne", count: stats.online },
    { key: "suspended", label: "Suspendus", count: stats.suspended },
    { key: "removed", label: "Retirés", count: stats.removed },
  ];

  const filtered = useMemo(() => {
    let result = employees;
    if (filter === "active") result = result.filter((e) => e.status !== "removed" && !e.is_locked);
    else if (filter === "online") result = result.filter((e) => e.status !== "removed" && isOnline(e.last_online_at, now));
    else if (filter === "suspended") result = result.filter((e) => e.status !== "removed" && e.is_locked);
    else if (filter === "removed") result = result.filter((e) => e.status === "removed");

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((e) =>
        (e.username || "").toLowerCase().includes(q) ||
        (e.full_name || "").toLowerCase().includes(q) ||
        (e.shop_name || "").toLowerCase().includes(q) ||
        (e.owner_username || "").toLowerCase().includes(q) ||
        (e.phone || "").includes(q)
      );
    }
    return result;
  }, [employees, search, filter, now]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearch = (v: string) => {
    setSearch(v);
    setPage(1);
  };

  const handleFilter = (f: FilterType) => {
    setFilter(f);
    setPage(1);
  };

  // ── Shared action menu items ──
  const renderActionItems = (emp: EmployeeRecord) => (
    <>
      <DropdownMenuItem onClick={() => setDetailTarget(emp)}>
        <UserCheck className="h-4 w-4 mr-2 text-slate-300" />
        Voir le profil
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onClick={() => setCredentialsTarget(emp)}>
        <KeyRound className="h-4 w-4 mr-2 text-[#00D4FF]" />
        Générer nouveau mot de passe
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setReassignTarget(emp)}>
        <Store className="h-4 w-4 mr-2 text-violet-400" />
        Réassigner à une boutique
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setRoleToggleTarget(emp)}>
        <UserCog className="h-4 w-4 mr-2 text-amber-400" />
        {emp.role === "employee" ? "Promouvoir → Propriétaire" : "Rétrograder → Employé"}
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      {emp.is_locked ? (
        <DropdownMenuItem onClick={() => lockUnlockEmployee.mutate({ userId: emp.member_user_id, lock: false })}>
          <Unlock className="h-4 w-4 mr-2 text-emerald-500" /> Activer le compte
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem onClick={() => lockUnlockEmployee.mutate({ userId: emp.member_user_id, lock: true })}>
          <Lock className="h-4 w-4 mr-2 text-orange-500" /> Suspendre le compte
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
        onClick={() => setDeleteTarget(emp)}
      >
        <Trash2 className="h-4 w-4 mr-2" /> Wipe employé (suppression totale)
      </DropdownMenuItem>
    </>
  );

  const statusBadge = (emp: EmployeeRecord) => {
    if (emp.status === "removed") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
          <UserX className="h-3 w-3" /> Retiré
        </span>
      );
    }
    if (emp.is_locked) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] text-red-400 font-medium">
          <WifiOff className="h-3 w-3" /> Suspendu
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-medium">
        <Wifi className="h-3 w-3" /> Actif
      </span>
    );
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-[#00D4FF]/20 flex items-center justify-center border border-violet-500/20 shrink-0">
          <Users className="h-5 w-5 text-violet-400" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-white">Global Employee Hub</h2>
          <p className="text-xs text-slate-500">Centre de commandement des comptes employés — God Mode</p>
        </div>
      </div>

      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: "Total", value: stats.total, color: "text-white", ring: "border-white/8" },
          { label: "Actifs", value: stats.active, color: "text-emerald-400", ring: "border-emerald-500/20" },
          { label: "En ligne", value: stats.online, color: "text-[#00D4FF]", ring: "border-[#00D4FF]/20" },
          { label: "Suspendus", value: stats.suspended, color: "text-red-400", ring: "border-red-500/20" },
          { label: "Retirés", value: stats.removed, color: "text-slate-400", ring: "border-white/8" },
        ].map((s) => (
          <div key={s.label} className={cn("rounded-xl border bg-white/[0.02] px-4 py-3", s.ring)}>
            <p className={cn("text-2xl font-bold", s.color)}>{isLoading ? "—" : s.value}</p>
            <p className="text-[11px] text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Filter tabs (horizontal scroll on mobile) ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        {filters.map((f) => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => handleFilter(f.key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                active
                  ? "bg-white text-[#0F172A]"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
              )}
            >
              {f.label} <span className={cn("text-xs", active ? "text-slate-500" : "text-slate-600")}>({f.count})</span>
            </button>
          );
        })}
      </div>

      {/* ── Omni-Search ── */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Rechercher par nom, @username, boutique, téléphone..."
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-violet-500/50 h-10"
        />
        {search && (
          <button
            onClick={() => handleSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Mobile card grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:hidden">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5 flex-1"><Skeleton className="h-3.5 w-28" /><Skeleton className="h-2.5 w-20" /></div>
              </div>
              <Skeleton className="h-3 w-full" />
            </div>
          ))
        ) : paginated.length === 0 ? (
          <div className="col-span-full text-center py-12 text-sm text-slate-500">
            {search || filter !== "all" ? "Aucun employé ne correspond" : "Aucun employé enregistré"}
          </div>
        ) : paginated.map((emp) => {
          const rc = roleConfig[emp.role] || roleConfig.employee;
          const online = isOnline(emp.last_online_at, now);
          return (
            <div
              key={emp.id}
              onClick={() => setDetailTarget(emp)}
              className="rounded-xl border border-white/8 bg-white/[0.02] p-4 space-y-3 active:bg-white/[0.04] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative">
                    <Avatar name={emp.full_name} username={emp.username} />
                    <span className={cn(
                      "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A]",
                      online ? "bg-emerald-400" : "bg-slate-600"
                    )} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium leading-tight truncate">{emp.full_name || `@${emp.username}`}</p>
                    {emp.username && <p className="text-xs text-slate-500 truncate">@{emp.username}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56" onClick={(e) => e.stopPropagation()}>
                    {renderActionItems(emp)}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-slate-300 truncate">{emp.shop_name}</p>
                  <p className="text-[10px] text-slate-600 truncate">@{emp.owner_username || "—"}</p>
                </div>
                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 shrink-0", rc.color)}>{rc.label}</Badge>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-white/5">
                {statusBadge(emp)}
                <span className="inline-flex items-center gap-1 text-[10px] text-slate-500">
                  <Clock className="h-3 w-3" />
                  {emp.last_online_at ? formatDistanceToNow(new Date(emp.last_online_at), { addSuffix: true, locale: fr }) : "Jamais"}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Desktop table ── */}
      <div className="rounded-xl overflow-hidden border border-white/8 bg-white/[0.02] hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="border-white/8 hover:bg-transparent">
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold py-3">Employé</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold hidden sm:table-cell">Boutique</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold hidden md:table-cell">Rôle</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold hidden lg:table-cell">Statut</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold hidden xl:table-cell">Activité</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider font-semibold hidden xl:table-cell">Inscrit le</TableHead>
              <TableHead className="text-slate-500 text-[11px] uppercase tracking-wider text-right font-semibold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-white/5">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="space-y-1.5">
                        <Skeleton className="h-3.5 w-28" />
                        <Skeleton className="h-2.5 w-20" />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell"><Skeleton className="h-3.5 w-24" /></TableCell>
                  <TableCell className="hidden md:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden lg:table-cell"><Skeleton className="h-5 w-16 rounded-full" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-3 w-20" /></TableCell>
                  <TableCell className="hidden xl:table-cell"><Skeleton className="h-3 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded-md ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center">
                      <Users className="h-5 w-5 text-slate-600" />
                    </div>
                    <p className="text-slate-500 text-sm">
                      {search || filter !== "all" ? "Aucun employé ne correspond" : "Aucun employé enregistré"}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : paginated.map((emp) => {
              const rc = roleConfig[emp.role] || roleConfig.employee;
              const online = isOnline(emp.last_online_at, now);

              return (
                <TableRow
                  key={emp.id}
                  className="border-white/5 hover:bg-white/[0.025] transition-colors group cursor-pointer"
                  onClick={() => setDetailTarget(emp)}
                >
                  {/* User Info */}
                  <TableCell className="py-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar name={emp.full_name} username={emp.username} />
                        <span className={cn(
                          "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[#0F172A]",
                          online ? "bg-emerald-400" : "bg-slate-600"
                        )} />
                      </div>
                      <div>
                        <p className="text-white text-sm font-medium leading-tight">
                          {emp.full_name || `@${emp.username}`}
                        </p>
                        {emp.username && (
                          <p className="text-xs text-slate-500 mt-0.5">@{emp.username}</p>
                        )}
                        {emp.phone && (
                          <p className="text-[10px] text-[#00D4FF] mt-0.5">{emp.phone}</p>
                        )}
                      </div>
                    </div>
                  </TableCell>

                  {/* Shop */}
                  <TableCell className="hidden sm:table-cell py-3">
                    <div>
                      <p className="text-sm text-slate-300 font-medium">{emp.shop_name}</p>
                      <p className="text-xs text-slate-600">@{emp.owner_username || "—"}</p>
                    </div>
                  </TableCell>

                  {/* Role */}
                  <TableCell className="hidden md:table-cell py-3">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", rc.color)}>
                      {rc.label}
                    </Badge>
                  </TableCell>

                  {/* Status */}
                  <TableCell className="hidden lg:table-cell py-3">
                    {statusBadge(emp)}
                  </TableCell>

                  {/* Last seen */}
                  <TableCell className="hidden xl:table-cell py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Clock className="h-3 w-3" />
                      {emp.last_online_at
                        ? formatDistanceToNow(new Date(emp.last_online_at), { addSuffix: true, locale: fr })
                        : "Jamais"}
                    </div>
                  </TableCell>

                  {/* Account age */}
                  <TableCell className="hidden xl:table-cell py-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(emp.created_at), "dd MMM yyyy", { locale: fr })}
                    </div>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right py-3" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        {renderActionItems(emp)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── Pagination ── */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} · Page {page}/{totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="h-8 w-8 p-0 border-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = page <= 3 ? i + 1 : page - 2 + i;
              if (pg < 1 || pg > totalPages) return null;
              return (
                <Button
                  key={pg}
                  variant={pg === page ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pg)}
                  className={cn("h-8 w-8 p-0 text-xs", pg !== page && "border-white/10 text-slate-400")}
                >
                  {pg}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="h-8 w-8 p-0 border-white/10"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── Detail Sheet ── */}
      <AdminEmployeeDetailSheet
        employee={detailTarget}
        onClose={() => setDetailTarget(null)}
        onCredentials={(e) => setCredentialsTarget(e)}
        onReassign={(e) => setReassignTarget(e)}
        onRoleToggle={(e) => setRoleToggleTarget(e)}
        onLockToggle={(e) => lockUnlockEmployee.mutate({ userId: e.member_user_id, lock: !e.is_locked })}
        onDelete={(e) => setDeleteTarget(e)}
      />

      {/* ── Modals ── */}
      {credentialsTarget && (
        <GenerateCredentialsModal
          open={!!credentialsTarget}
          onOpenChange={(v) => !v && setCredentialsTarget(null)}
          userId={credentialsTarget.member_user_id}
          userName={credentialsTarget.full_name || credentialsTarget.username || "Employé"}
          username={credentialsTarget.username}
        />
      )}

      {reassignTarget && (
        <ReassignShopModal
          open={!!reassignTarget}
          onOpenChange={(v) => !v && setReassignTarget(null)}
          employee={reassignTarget}
          shops={shops}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["admin-employees"] })}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe total de cet employé ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action <strong>efface complètement</strong> le compte de{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.username}</strong> : identifiants de connexion,
              rôles, appartenances d'équipe, transactions, préférences et notifications. Aucune trace ne subsistera.
              Il perdra tout accès à la boutique <strong>{deleteTarget?.shop_name}</strong>. Irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteEmployee.mutate({
                    memberId: deleteTarget.id,
                    employeeUserId: deleteTarget.member_user_id,
                  });
                }
              }}
            >
              {deleteEmployee.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role Toggle confirmation */}
      <AlertDialog open={!!roleToggleTarget} onOpenChange={(o) => !o && setRoleToggleTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5 text-amber-400" />
              {roleToggleTarget?.role === "employee" ? "Promouvoir en Propriétaire ?" : "Rétrograder en Employé ?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-1">
              {roleToggleTarget?.role === "employee" ? (
                <span>
                  Vous êtes sur le point de promouvoir{" "}
                  <strong>{roleToggleTarget?.full_name || roleToggleTarget?.username}</strong> au rôle de{" "}
                  <strong>Propriétaire</strong>.{" "}
                  Ce compte aura accès complet à la gestion d'une boutique (équipe, paramètres, données).
                </span>
              ) : (
                <span>
                  Vous êtes sur le point de rétrograder{" "}
                  <strong>{roleToggleTarget?.full_name || roleToggleTarget?.username}</strong> au rôle d'<strong>Employé</strong>.{" "}
                  Ses permissions seront limitées aux pages autorisées par son propriétaire.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className={roleToggleTarget?.role === "employee"
                ? "bg-amber-500 text-white hover:bg-amber-600"
                : "bg-orange-500 text-white hover:bg-orange-600"}
              onClick={() => {
                if (roleToggleTarget) {
                  changeRole.mutate({
                    userId: roleToggleTarget.member_user_id,
                    newRole: roleToggleTarget.role === "employee" ? "super_admin" : "employee",
                  });
                  setRoleToggleTarget(null);
                }
              }}
            >
              {roleToggleTarget?.role === "employee" ? "Confirmer la promotion" : "Confirmer la rétrogradation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
