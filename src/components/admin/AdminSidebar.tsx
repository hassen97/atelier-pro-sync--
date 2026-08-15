import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Store, Users, BarChart3, Tags, Ticket, ClipboardList, CreditCard,
  Rocket, Cloud, Inbox, Megaphone, MessageSquare, Users2, ListChecks, KeyRound,
  Shield, ShieldAlert, Fingerprint, Globe2, HeartPulse, Flag, Mail, Settings,
  LogOut, ChevronLeft, ChevronRight, ChevronDown, Search, Zap,
} from "lucide-react";
import { usePendingServiceRequestCount } from "@/hooks/useAdminServiceRequests";
import { useAuth } from "@/contexts/AuthContext";
import { useSignupAttempts, groupAttemptsByIp } from "@/hooks/useAdminSecurity";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export type AdminView =
  | "overview" | "shops" | "announcements" | "feedback" | "reset_requests"
  | "settings" | "employees" | "plans" | "promo_codes" | "gateways" | "feature_flags"
  | "waitlist" | "signup_attempts" | "orders" | "community" | "reports"
  | "services_catalog" | "services_requests" | "system_health" | "growth_engine"
  | "email_templates" | "security" | "signup_events";

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>;

interface SubItem {
  id: AdminView;
  label: string;
  icon: IconType;
  badge?: string;
  showPendingDot?: boolean;
}

interface Category {
  id: string;
  label: string;
  icon: IconType;
  landing?: AdminView;
  items: SubItem[];
}

const singleItem: SubItem = { id: "overview", label: "Dashboard", icon: LayoutDashboard };

const categories: Category[] = [
  {
    id: "platform",
    label: "Plateforme",
    icon: Store,
    items: [
      { id: "shops",     label: "Boutiques",  icon: Store },
      { id: "employees", label: "Employés",   icon: Users },
      { id: "reports",   label: "Rapports",   icon: BarChart3, badge: "Nouveau" },
    ],
  },
  {
    id: "growth",
    label: "Croissance",
    icon: Rocket,
    items: [
      { id: "plans",         label: "Plans & Tarifs", icon: Tags },
      { id: "promo_codes",   label: "Codes promo",    icon: Ticket },
      { id: "orders",        label: "Commandes",      icon: ClipboardList },
      { id: "gateways",      label: "Paiements",      icon: CreditCard },
      { id: "growth_engine", label: "Growth Engine",  icon: Rocket, badge: "Nouveau" },
    ],
  },
  {
    id: "services",
    label: "Services",
    icon: Cloud,
    items: [
      { id: "services_catalog",  label: "Catalogue services", icon: Cloud },
      { id: "services_requests", label: "Demandes entrantes", icon: Inbox, showPendingDot: true },
    ],
  },
  {
    id: "engagement",
    label: "Engagement",
    icon: Megaphone,
    items: [
      { id: "announcements",  label: "Annonces",        icon: Megaphone },
      { id: "feedback",       label: "Feedback",        icon: MessageSquare },
      { id: "community",      label: "Communauté",      icon: Users2 },
      { id: "waitlist",       label: "Liste d'attente", icon: ListChecks },
      { id: "reset_requests", label: "Demandes",        icon: KeyRound },
    ],
  },
  {
    id: "security",
    label: "Sécurité",
    icon: Shield,
    landing: "security",
    items: [
      { id: "security",         label: "Centre de Sécurité", icon: ShieldAlert },
      { id: "signup_attempts",  label: "Tentatives & IPs",   icon: Fingerprint },
      { id: "signup_events",    label: "Événements",         icon: Globe2 },
      { id: "system_health",    label: "Santé Système",      icon: HeartPulse, badge: "Nouveau" },
    ],
  },
  {
    id: "system",
    label: "Système",
    icon: Settings,
    items: [
      { id: "feature_flags",   label: "Feature Flags",   icon: Flag },
      { id: "email_templates", label: "Modèles d'e-mails", icon: Mail },
      { id: "settings",        label: "Paramètres",      icon: Settings },
    ],
  },
];

export function AdminSidebar({ active, onNavigate, onClose, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const { user, signOut } = useAuth();
  const { data: pendingCount = 0 } = usePendingServiceRequestCount();
  const { data: attempts } = useSignupAttempts();

  const suspiciousIps = useMemo(
    () => groupAttemptsByIp(attempts ?? []).filter((g) => g.count >= 3).length,
    [attempts]
  );

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    for (const c of categories) {
      init[c.id] = c.items.some((i) => i.id === active);
    }
    return init;
  });

  const handleNavigate = (view: AdminView) => {
    onNavigate(view);
    onClose?.();
    // Keep the active category open.
    setExpanded((prev) => {
      const cat = categories.find((c) => c.items.some((i) => i.id === view));
      if (!cat) return prev;
      return { ...prev, [cat.id]: true };
    });
  };

  const handleCategoryClick = (cat: Category) => {
    // Rail mode: no sub-items visible, clicking a category navigates.
    if (collapsed) {
      onNavigate(cat.landing ?? cat.items[0].id);
      onClose?.();
      return;
    }
    const isOpen = expanded[cat.id];
    if (isOpen) {
      // Clicking an open category collapses it.
      setExpanded((prev) => ({ ...prev, [cat.id]: false }));
      return;
    }
    // Clicking a closed category expands it (and opens its landing page, if any).
    setExpanded((prev) => ({ ...prev, [cat.id]: true }));
    if (cat.landing) {
      onNavigate(cat.landing);
      onClose?.();
    }
  };

  const displayName =
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.username as string) ||
    user?.email ||
    "Admin";
  const initial = displayName.charAt(0).toUpperCase();

  const matchesQuery = (item: SubItem) =>
    !query.trim() || item.label.toLowerCase().includes(query.trim().toLowerCase());

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className="flex flex-col h-full"
        style={{ width: collapsed ? 64 : 264, transition: "width 200ms ease" }}
      >
        {/* Header */}
        <div className={cn("flex items-center border-b border-white/10 shrink-0", collapsed ? "p-3 justify-center" : "p-4 justify-between")}>
          {!collapsed ? (
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.3)]">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white text-xs tracking-wide truncate">Centre de Commande</h1>
                <p className="text-[10px] text-slate-500 tracking-wider uppercase">Ultra Admin</p>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
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

        {/* Search */}
        {!collapsed && (
          <div className="px-3 pt-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-600" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Filtrer la navigation..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#00D4FF]/30 focus:bg-[#00D4FF]/[0.03] transition-colors"
              />
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden px-2">
          {/* Dashboard (single) */}
          <SingleNavItem
            item={singleItem}
            active={active}
            collapsed={collapsed}
            onClick={() => handleNavigate(singleItem.id)}
          />

          <div className={cn("h-px bg-white/5 my-2", collapsed && "mx-1")} />

          {/* Categories */}
          {categories.map((cat) => {
            const isOpen = (expanded[cat.id] || !!query.trim()) && !collapsed;
            const showItems = isOpen;
            const anyChildActive = cat.items.some((i) => i.id === active);
            const catHasSecurity = cat.id === "security" && suspiciousIps > 0;

            const header = (
              <button
                onClick={() => handleCategoryClick(cat)}
                className={cn(
                  "w-full flex items-center gap-2.5 rounded-lg text-xs font-semibold transition-colors duration-150 relative",
                  collapsed ? "px-0 py-2.5 justify-center" : "px-2.5 py-2",
                  anyChildActive
                    ? "text-[#00D4FF] bg-[#00D4FF]/[0.06]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                <span className="relative shrink-0">
                  <cat.icon style={{ width: collapsed ? 18 : 15, height: collapsed ? 18 : 15 }} />
                  {catHasSecurity && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-500 ring-2 ring-[#080E1A]" />
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span className="truncate overflow-hidden whitespace-nowrap flex-1 text-left">{cat.label}</span>
                    {catHasSecurity && (
                      <span className="text-[10px] font-bold rounded-full px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30">
                        {suspiciousIps}
                      </span>
                    )}
                    <ChevronDown
                      className={cn("h-3.5 w-3.5 text-slate-600 transition-transform duration-200", isOpen && "rotate-180")}
                    />
                  </>
                )}
              </button>
            );

            return (
              <div key={cat.id}>
                {collapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>{header}</TooltipTrigger>
                    <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-white text-xs">
                      {cat.label}{catHasSecurity ? ` · ${suspiciousIps} IP suspecte(s)` : ""}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  header
                )}

                <AnimatePresence initial={false}>
                  {showItems && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <div className="ml-4 pl-2 border-l border-white/[0.06] space-y-0.5 mt-0.5">
                        {cat.items.filter(matchesQuery).map((item) => {
                          const isActive = active === item.id;
                          const Icon = item.icon;
                          const showDot = item.showPendingDot && pendingCount > 0;
                          return (
                            <button
                              key={item.id}
                              onClick={() => handleNavigate(item.id)}
                              className={cn(
                                "w-full flex items-center gap-2.5 rounded-lg text-[13px] font-medium transition-colors duration-150 relative",
                                "px-2.5 py-1.5",
                                isActive
                                  ? "bg-gradient-to-r from-[#00D4FF]/15 to-transparent text-[#00D4FF] border border-[#00D4FF]/20"
                                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                              )}
                            >
                              <span className="relative shrink-0">
                                <Icon className="h-3.5 w-3.5" style={{ width: 15, height: 15 }} />
                                {showDot && (
                                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-red-500 ring-1 ring-[#080E1A]" />
                                )}
                              </span>
                              <span className="truncate overflow-hidden whitespace-nowrap flex-1 text-left">{item.label}</span>
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
                            </button>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}

          {!collapsed && query && (
            <p className="text-[10px] text-slate-600 px-2 pt-2">
              Résultats filtrés par « {query} »
            </p>
          )}
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

/* ── Single (non-expandable) nav item ─────────────────────────────── */
function SingleNavItem({ item, active, collapsed, onClick }: { item: SubItem; active: AdminView; collapsed: boolean; onClick: () => void }) {
  const isActive = active === item.id;
  const Icon = item.icon;
  const btn = (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-colors duration-150",
        collapsed ? "px-0 py-2 justify-center" : "px-2.5 py-2",
        isActive
          ? "bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20"
          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
      )}
    >
      <Icon style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }} className="shrink-0" />
      {!collapsed && <span className="truncate overflow-hidden whitespace-nowrap flex-1 text-left">{item.label}</span>}
    </button>
  );
  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{btn}</TooltipTrigger>
        <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-white text-xs">
          {item.label}
        </TooltipContent>
      </Tooltip>
    );
  }
  return btn;
}