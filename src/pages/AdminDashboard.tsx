import { useState, useEffect, useCallback } from "react";
import { Menu, Search, Bell, ChevronLeft, ChevronRight, Megaphone } from "lucide-react";
import { QuickChangelogDialog } from "@/components/admin/QuickChangelogDialog";
import { useAdminData } from "@/hooks/useAdmin";
import { useAuth } from "@/contexts/AuthContext";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminShopsView } from "@/components/admin/AdminShopsView";
import { AdminAnnouncementsView } from "@/components/admin/AdminAnnouncementsView";
import { AdminFeedbackInbox } from "@/components/admin/AdminFeedbackInbox";
import { AdminResetRequests } from "@/components/admin/AdminResetRequests";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";
import { AdminEmployeesView } from "@/components/admin/AdminEmployeesView";
import { AdminPlansView } from "@/components/admin/AdminPlansView";
import { AdminPaymentGatewaysView } from "@/components/admin/AdminPaymentGatewaysView";
import { AdminFeatureFlagsView } from "@/components/admin/AdminFeatureFlagsView";
import { AdminWaitlistView } from "@/components/admin/AdminWaitlistView";
import { AdminSignupAttemptsView } from "@/components/admin/AdminSignupAttemptsView";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminOrdersView } from "@/components/admin/AdminOrdersView";
import { AdminCommunityView } from "@/components/admin/AdminCommunityView";
import { AdminReportsView } from "@/components/admin/AdminReportsView"; // NEW
import { AdminServicesView } from "@/components/admin/AdminServicesView";
import { AdminServiceRequestsView } from "@/components/admin/AdminServiceRequestsView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAdminSignupNotifier } from "@/hooks/useAdminSignupNotifier";
import { cn } from "@/lib/utils";

type AdminView =
  | "overview" | "shops" | "announcements" | "feedback" | "reset_requests"
  | "settings" | "employees" | "plans" | "gateways" | "feature_flags"
  | "waitlist" | "signup_attempts" | "orders" | "community" | "reports"
  | "services_catalog" | "services_requests";

const viewLabels: Record<AdminView, string> = {
  overview:        "Dashboard",
  shops:           "Boutiques",
  employees:       "Employes",
  waitlist:        "Liste d'attente",
  plans:           "Tarifs & Plans",
  gateways:        "Paiements",
  orders:          "Commandes",
  reset_requests:  "Demandes",
  announcements:   "Annonces",
  feedback:        "Feedback",
  community:       "Communaute",
  signup_attempts: "Tentatives de connexion",
  settings:        "Parametres",
  feature_flags:   "Feature Flags",
  reports:         "Rapports & Export",
  services_catalog:  "Catalogue services",
  services_requests: "Demandes services",
};

const AdminDashboard = () => {
  const { data: adminData } = useAdminData();
  const { user } = useAuth();
  const activeShopsCount = adminData?.stats?.active_now_count ?? adminData?.stats?.total_owners ?? 0;
  const userInitial = (
    (user?.user_metadata?.full_name as string) ||
    (user?.user_metadata?.username as string) ||
    user?.email ||
    "A"
  ).charAt(0).toUpperCase();
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [changelogOpen, setChangelogOpen] = useState(false);
  const isMobile = useIsMobile();
  useAdminSignupNotifier();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = useCallback((view: string) => {
    setActiveView(view as AdminView);
    if (isMobile) setSidebarOpen(false);
  }, [isMobile]);

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#080E1A] via-[#0B1120] to-[#080E1A] text-white overflow-hidden">

      {/* Mobile header */}
      {isMobile && (
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0 bg-[#0B1120]/95 backdrop-blur-sm">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              <span className="text-white font-bold text-xs">⚡</span>
            </div>
            <span className="font-semibold text-sm">Centre de Commande</span>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <button
              onClick={() => setChangelogOpen(true)}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              title="Publier un changelog"
            >
              <Megaphone className="h-4 w-4 text-[#00D4FF]" />
            </button>
            <button onClick={() => setCmdOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Search className="h-4 w-4 text-slate-400" />
            </button>
            <button className="relative p-2 rounded-lg hover:bg-white/10 transition-colors">
              <Bell className="h-4 w-4 text-slate-400" />
              <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500" />
            </button>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className={cn(
              "shrink-0 relative border-r border-white/[0.06] h-full bg-[#080E1A]/95",
              "transition-[width] duration-200 ease-in-out"
            )}
            style={{ width: sidebarCollapsed ? 64 : 240 }}
          >
            <AdminSidebar
              active={activeView}
              onNavigate={setActiveView}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(v => !v)}
            />
            <button
              onClick={() => setSidebarCollapsed(v => !v)}
              className="absolute -right-3 top-[22px] z-10 w-6 h-6 rounded-full bg-[#0D1526] border border-white/10 flex items-center justify-center hover:border-[#00D4FF]/30 hover:text-[#00D4FF] text-slate-500 transition-all"
            >
              {sidebarCollapsed
                ? <ChevronRight className="h-3 w-3" />
                : <ChevronLeft className="h-3 w-3" />}
            </button>
          </aside>
        )}

        {/* Mobile sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-[#080E1A] border-r border-white/[0.06]">
              <AdminSidebar
                active={activeView}
                onNavigate={setActiveView}
                onClose={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* Desktop top bar */}
          {!isMobile && (
            <div className="flex items-center gap-4 px-6 h-14 border-b border-white/[0.05] bg-[#0B1120]/95 backdrop-blur-sm shrink-0">
              <div className="flex-1">
                <h2 className="text-sm font-semibold text-white leading-tight">{viewLabels[activeView]}</h2>
                <p className="text-[10px] text-slate-600 mt-0.5">Ultra Admin · Centre de Commande</p>
              </div>

              {/* Live indicator */}
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/15">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
                </span>
                <span className="text-[11px] text-emerald-400 font-medium">{activeShopsCount} boutique{activeShopsCount > 1 ? "s" : ""} active{activeShopsCount > 1 ? "s" : ""}</span>
              </div>

              {/* Search / Cmd+K */}
              <button
                onClick={() => setCmdOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/5 hover:border-[#00D4FF]/20 transition-all group"
                style={{ background: "hsla(215,28%,10%,0.6)" }}
              >
                <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400" />
                <span className="text-xs text-slate-600 group-hover:text-slate-500">Rechercher...</span>
                <kbd className="ml-2 text-[10px] text-slate-700 border border-white/[0.06] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
              </button>

              {/* Quick changelog */}
              <button
                onClick={() => setChangelogOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#00D4FF]/20 bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 transition-all text-xs font-medium"
                title="Publier un changelog (visible par tous les owners + employés)"
              >
                <Megaphone className="h-3.5 w-3.5" />
                Changelog
              </button>

              {/* Notifications bell */}
              <button className="relative w-9 h-9 rounded-lg border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.06] flex items-center justify-center transition-all">
                <Bell className="h-4 w-4 text-slate-400" />
                <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-red-500 border-[1.5px] border-[#0B1120]" />
              </button>

              {/* Admin avatar */}
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF] to-[#6366F1] flex items-center justify-center text-xs font-bold cursor-pointer hover:shadow-[0_0_12px_rgba(0,212,255,0.3)] transition-shadow">
                {userInitial}
              </div>
            </div>
          )}

          {/* View content */}
          <div className="flex-1 overflow-auto p-4 sm:p-6">
            {activeView === "overview"        && <AdminOverview />}
            {activeView === "shops"           && <AdminShopsView />}
            {activeView === "reset_requests"  && <AdminResetRequests />}
            {activeView === "announcements"   && <AdminAnnouncementsView />}
            {activeView === "feedback"        && <AdminFeedbackInbox />}
            {activeView === "settings"        && <AdminSettingsView />}
            {activeView === "employees"       && <AdminEmployeesView />}
            {activeView === "plans"           && <AdminPlansView />}
            {activeView === "gateways"        && <AdminPaymentGatewaysView />}
            {activeView === "feature_flags"   && <AdminFeatureFlagsView />}
            {activeView === "waitlist"        && <AdminWaitlistView />}
            {activeView === "signup_attempts" && <AdminSignupAttemptsView />}
            {activeView === "orders"          && <AdminOrdersView />}
            {activeView === "community"       && <AdminCommunityView />}
            {activeView === "reports"          && <AdminReportsView />}
            {activeView === "services_catalog"  && <AdminServicesView />}
            {activeView === "services_requests" && <AdminServiceRequestsView />}
          </div>
        </main>
      </div>

      <AdminCommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={handleNavigate}
        onPublishChangelog={() => setChangelogOpen(true)}
      />

      <QuickChangelogDialog open={changelogOpen} onOpenChange={setChangelogOpen} />
    </div>
  );
};

export default AdminDashboard;
