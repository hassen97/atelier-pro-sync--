import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Store, Megaphone, MessageSquare, LogOut, KeyRound,
  Settings, Users, CreditCard, Tags, ClipboardList, Shield,
  ChevronLeft, ChevronRight, Users2, BarChart3, ListChecks, Flag, Cloud, Inbox,
} from "lucide-react";
import { usePendingServiceRequestCount } from "@/hooks/useAdminServiceRequests";
import { useAuth } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AdminView =
  | "overview" | "shops" | "announcements" | "feedback" | "reset_requests"
  | "settings" | "employees" | "plans" | "gateways" | "feature_flags"
  | "waitlist" | "signup_attempts" | "orders" | "community" | "reports"
  | "services_catalog" | "services_requests";

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type NavItem = {
  id: AdminView;
  label: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  badge?: string;
  showPendingDot?: boolean;
};

const navSections: { label: string; items: NavItem[] }[] = [
  {
    label: "Plateforme",
    items: [
      { id: "overview",  label: "Dashboard",  icon: LayoutDashboard },
      { id: "shops",     label: "Boutiques",  icon: Store },
      { id: "employees", label: "Employés",   icon: Users },
      { id: "reports",   label: "Rapports",   icon: BarChart3, badge: "Nouveau" },
    ],
  },
  {
    label: "Commercial",
    items: [
      { id: "plans",    label: "Tarifs & Plans", icon: Tags },
      { id: "orders",   label: "Commandes",      icon: ClipboardList },
      { id: "gateways", label: "Paiements",      icon: CreditCard },
    ],
  },
  {
    label: "Services & Outils",
    items: [
      { id: "services_catalog",  label: "Catalogue services", icon: Cloud },
      { id: "services_requests", label: "Demandes entrantes", icon: Inbox, showPendingDot: true },
    ],
  },
  {
    label: "Opérations",
    items: [
      { id: "waitlist",       label: "Liste d'attente", icon: ListChecks },
      { id: "reset_requests", label: "Demandes",        icon: KeyRound },
      { id: "announcements",  label: "Annonces",        icon: Megaphone },
      { id: "feedback",       label: "Feedback",        icon: MessageSquare },
      { id: "community",      label: "Communauté",      icon: Users2 },
    ],
  },
  {
    label: "Système",
    items: [
      { id: "signup_attempts", label: "Tentatives",     icon: Shield },
      { id: "feature_flags",   label: "Feature Flags",  icon: Flag },
      { id: "settings",        label: "Paramètres",     icon: Settings },
    ],
  },
];

export function AdminSidebar({ active, onNavigate, onClose, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const { data: pendingCount = 0 } = usePendingServiceRequestCount();

  const handleNavigate = (view: AdminView) => {
    onNavigate(view);
    onClose?.();
  };

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.username as string) ||
    user?.email ||
    "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="flex flex-col h-full"
        style={{ width: collapsed ? 64 : 256, transition: "width 200ms ease" }}
      >
        {/* Header */}
        <div className={cn("flex items-center border-b border-white/10 shrink-0", collapsed ? "p-3 justify-center" : "p-4 justify-between")}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.3)]">
                <span className="text-white font-bold text-sm">⚡</span>
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white text-xs tracking-wide truncate">Centre de Commande</h1>
                <p className="text-[10px] text-slate-500 tracking-wider uppercase">Ultra Admin</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center">
              <span className="text-white font-bold text-sm">⚡</span>
            </div>
          )}
          {onToggleCollapse && !onClose && (
            <button
              onClick={onToggleCollapse}
              className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-colors shrink-0"
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-4 overflow-y-auto overflow-x-hidden px-2">
          {navSections.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold px-2 mb-1.5">
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = active === item.id;
                  const Icon = item.icon;
                  const showDot = item.showPendingDot && pendingCount > 0;
                  const btn = (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-150 relative",
                        collapsed ? "px-0 py-2 justify-center" : "px-2.5 py-2",
                        isActive
                          ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent",
                      )}
                    >
                      <span className="relative shrink-0">
                        <Icon style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }} />
                        {showDot && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-1 ring-[#080E1A]" />
                        )}
                      </span>
                      {!collapsed && (
                        <>
                          <span className="truncate overflow-hidden whitespace-nowrap flex-1 text-left">
                            {item.label}
                          </span>
                          {showDot && (
                            <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30">
                              {pendingCount}
                            </span>
                          )}
                          {item.badge && !showDot && (
                            <span className="text-[9px] font-bold uppercase tracking-wider rounded-full px-1.5 py-0.5 bg-[#00D4FF]/15 text-[#00D4FF]">
                              {item.badge}
                            </span>
                          )}
                        </>
                      )}
                    </button>
                  );
                  if (collapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-white text-xs">
                          {item.label}{item.badge ? ` · ${item.badge}` : ""}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Profile card */}
        {!collapsed && (
          <div className="px-2 pb-2 shrink-0">
            <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.03] p-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6366F1] flex items-center justify-center text-xs font-bold text-white shrink-0">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-semibold text-white truncate">{displayName}</div>
                <div className="text-[10px] text-slate-500">Super Admin</div>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            </div>
          </div>
        )}

        {/* Footer / sign out */}
        <div className="p-2 border-t border-white/10 shrink-0">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-red-400 text-xs">
                Déconnexion
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <span className="truncate">Déconnexion</span>
            </button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
