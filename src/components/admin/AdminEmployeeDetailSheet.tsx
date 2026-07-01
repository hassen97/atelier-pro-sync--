import { Sheet, SheetContent } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  KeyRound, Store, UserCog, Lock, Unlock, Trash2, Phone, Clock, Calendar,
  Wifi, WifiOff, ShieldCheck, LayoutGrid, UserX,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { EmployeeRecord } from "@/hooks/useAdmin";

const roleConfig: Record<string, { label: string; color: string }> = {
  employee: { label: "Employé", color: "border-slate-500/30 text-slate-300 bg-slate-500/10" },
  manager: { label: "Manager", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  admin: { label: "Admin", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  super_admin: { label: "Propriétaire", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
};

const pageLabels: Record<string, string> = {
  pos: "Caisse (POS)",
  inventory: "Inventaire",
  repairs: "Réparations",
  customers: "Clients",
  suppliers: "Fournisseurs",
  expenses: "Dépenses",
  dashboard: "Tableau de bord",
  profit: "Bénéfices",
  settings: "Paramètres",
  returns: "Retours",
  accounts: "Comptes",
  reports: "Rapports",
};

function EmployeeAvatar({ name, username, size = 56 }: { name: string | null; username: string | null; size?: number }) {
  const display = name || username || "?";
  const initials = display.slice(0, 2).toUpperCase();
  const hue = (display.charCodeAt(0) * 37 + display.charCodeAt(1 < display.length ? 1 : 0) * 17) % 360;
  return (
    <div
      className="rounded-xl flex items-center justify-center font-bold text-white shrink-0"
      style={{ background: `hsl(${hue}, 60%, 40%)`, width: size, height: size, fontSize: size / 2.8 }}
    >
      {initials}
    </div>
  );
}

interface Props {
  employee: EmployeeRecord | null;
  onClose: () => void;
  onCredentials: (emp: EmployeeRecord) => void;
  onReassign: (emp: EmployeeRecord) => void;
  onRoleToggle: (emp: EmployeeRecord) => void;
  onLockToggle: (emp: EmployeeRecord) => void;
  onDelete: (emp: EmployeeRecord) => void;
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="flex items-center gap-2 text-xs text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <span className="text-sm text-slate-200 font-medium text-right">{value}</span>
    </div>
  );
}

export function AdminEmployeeDetailSheet({
  employee, onClose, onCredentials, onReassign, onRoleToggle, onLockToggle, onDelete,
}: Props) {
  const emp = employee;
  const rc = emp ? (roleConfig[emp.role] || roleConfig.employee) : roleConfig.employee;
  const isOnline = emp?.last_online_at && new Date(emp.last_online_at) > new Date(Date.now() - 10 * 60 * 1000);
  const isRemoved = emp?.status === "removed";

  return (
    <Sheet open={!!emp} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-[#0B1120] border-l border-white/10 text-white">
        {emp && (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                <div className="relative">
                  <EmployeeAvatar name={emp.full_name} username={emp.username} />
                  <span className={cn(
                    "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-[#0B1120]",
                    isOnline ? "bg-emerald-400" : "bg-slate-600"
                  )} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-white leading-tight truncate">
                    {emp.full_name || `@${emp.username}`}
                  </h3>
                  {emp.username && <p className="text-sm text-slate-500">@{emp.username}</p>}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", rc.color)}>{rc.label}</Badge>
                    {isRemoved ? (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-slate-600/40 text-slate-400 bg-slate-600/10">
                        <UserX className="h-3 w-3 mr-1" /> Retiré
                      </Badge>
                    ) : emp.is_locked ? (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-red-500/30 text-red-400 bg-red-500/10">
                        <WifiOff className="h-3 w-3 mr-1" /> Suspendu
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-emerald-500/30 text-emerald-400 bg-emerald-500/10">
                        <Wifi className="h-3 w-3 mr-1" /> Actif
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Shop assignment */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <Store className="h-3 w-3" /> Boutique assignée
                </p>
                <p className="text-white font-semibold">{emp.shop_name}</p>
                <p className="text-xs text-slate-500">
                  Propriétaire : {emp.owner_full_name || "—"} {emp.owner_username && `(@${emp.owner_username})`}
                </p>
              </div>

              {/* Coordinates & activity */}
              <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 divide-y divide-white/5">
                <InfoRow icon={Phone} label="Téléphone" value={emp.phone || "—"} />
                <InfoRow icon={ShieldCheck} label="Vérification" value={emp.verification_status === "verified" ? "Vérifié" : (emp.verification_status || "—")} />
                <InfoRow
                  icon={Clock}
                  label="Dernière activité"
                  value={emp.last_online_at ? formatDistanceToNow(new Date(emp.last_online_at), { addSuffix: true, locale: fr }) : "Jamais"}
                />
                <InfoRow icon={Calendar} label="Membre depuis" value={format(new Date(emp.created_at), "dd MMM yyyy", { locale: fr })} />
              </div>

              {/* Permissions */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
                  <LayoutGrid className="h-3 w-3" /> Pages autorisées ({emp.allowed_pages?.length || 0})
                </p>
                {emp.allowed_pages && emp.allowed_pages.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {emp.allowed_pages.map((p) => (
                      <Badge key={p} variant="outline" className="text-[10px] px-2 py-0.5 border-[#00D4FF]/25 text-[#00D4FF] bg-[#00D4FF]/5">
                        {pageLabels[p] || p}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">Aucune page spécifique — accès complet hérité du propriétaire.</p>
                )}
              </div>

              <Separator className="bg-white/10" />

              {/* Actions */}
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Actions</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" className="justify-start gap-2 border-white/10 text-slate-200" onClick={() => onCredentials(emp)}>
                    <KeyRound className="h-4 w-4 text-[#00D4FF]" /> Mot de passe
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start gap-2 border-white/10 text-slate-200" onClick={() => onReassign(emp)}>
                    <Store className="h-4 w-4 text-violet-400" /> Réassigner
                  </Button>
                  <Button variant="outline" size="sm" className="justify-start gap-2 border-white/10 text-slate-200" onClick={() => onRoleToggle(emp)}>
                    <UserCog className="h-4 w-4 text-amber-400" />
                    {emp.role === "employee" ? "Promouvoir" : "Rétrograder"}
                  </Button>
                  {emp.is_locked ? (
                    <Button variant="outline" size="sm" className="justify-start gap-2 border-white/10 text-slate-200" onClick={() => onLockToggle(emp)}>
                      <Unlock className="h-4 w-4 text-emerald-500" /> Activer
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" className="justify-start gap-2 border-white/10 text-slate-200" onClick={() => onLockToggle(emp)}>
                      <Lock className="h-4 w-4 text-orange-500" /> Suspendre
                    </Button>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-2 border-red-500/20 text-red-400 hover:bg-red-500/10 hover:text-red-400"
                  onClick={() => onDelete(emp)}
                >
                  <Trash2 className="h-4 w-4" /> Wipe employé (suppression totale)
                </Button>
              </div>
            </div>
          </ScrollArea>
        )}
      </SheetContent>
    </Sheet>
  );
}
