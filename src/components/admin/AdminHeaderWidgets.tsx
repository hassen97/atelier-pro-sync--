import { useState } from "react";
import { Bell, LogOut, UserPlus } from "lucide-react";
import { useSignupEvents, useMarkEventsSeen } from "@/hooks/useAdminSecurity";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

const panelClasses = "bg-[#0D1526] border-white/10 text-slate-200 shadow-xl";

/**
 * Admin header notification bell. Feed = admin_signup_events (same source as
 * the Security center): unread rows have seen_at = null. Opening the panel
 * shows the latest events; closing it marks them as seen.
 */
export function AdminNotificationsBell({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { data: events } = useSignupEvents();
  const markSeen = useMarkEventsSeen();

  const list = events ?? [];
  const unreadIds = list.filter((e) => !e.seen_at).map((e) => e.id);
  const unreadCount = unreadIds.length;

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        // Mark events seen once the admin has had a look (on close).
        if (!next && unreadIds.length > 0) markSeen.mutate(unreadIds);
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={cn(
            "relative w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center transition-all",
            className
          )}
          title="Notifications"
          aria-label="Notifications"
        >
          <Bell className="h-4 w-4 text-slate-400" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 border-[1.5px] border-[#0B1120]" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className={cn("w-80 p-0", panelClasses)}>
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-white/[0.06]">
          <span className="text-xs font-semibold text-white">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#00D4FF]/15 text-[#00D4FF] font-medium">
              {unreadCount} non lue{unreadCount > 1 ? "s" : ""}
            </span>
          )}
        </div>
        <div className="max-h-72 overflow-auto py-1">
          {list.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-6">Aucune notification</p>
          ) : (
            list.slice(0, 8).map((e) => (
              <div key={e.id} className="flex items-start gap-2.5 px-3 py-2 hover:bg-white/[0.03]">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <UserPlus className="h-3 w-3 text-emerald-400" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-200 truncate">
                    Nouvelle inscription :{" "}
                    <span className="font-medium text-white">
                      {e.username || e.full_name || e.email || "inconnu"}
                    </span>
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {timeAgo(e.created_at)}
                    {e.country ? ` · ${e.country}` : ""}
                  </p>
                </div>
                {!e.seen_at && <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[#00D4FF] shrink-0" />}
              </div>
            ))
          )}
        </div>
        <div className="px-3 py-2 border-t border-white/[0.06]">
          <p className="text-[10px] text-slate-600">
            Centre de Sécurité : fil complet + tentative par IP
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Admin header user menu: identity + logout (same signOut as the sidebar footer).
 */
export function AdminUserMenu() {
  const { user, signOut } = useAuth();
  const name =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.username as string) ||
    user?.email ||
    "Admin";
  const initial = name.charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6366F1] flex items-center justify-center text-xs font-bold text-white hover:shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-shadow"
          aria-label="Menu utilisateur"
        >
          {initial}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className={cn("w-56", panelClasses)}>
        <DropdownMenuLabel className="flex items-center gap-2 font-normal">
          <span className="w-7 h-7 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6366F1] flex items-center justify-center text-[10px] font-bold text-white shrink-0">
            {initial}
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-semibold text-white truncate">{name}</span>
            <span className="block text-[10px] text-slate-500">Administrateur de la plateforme</span>
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-white/[0.06]" />
        <DropdownMenuItem
          onClick={() => signOut()}
          className="text-red-400/80 focus:text-red-400 focus:bg-red-500/10 cursor-pointer"
        >
          <LogOut className="h-4 w-4 mr-2" /> Déconnexion
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
