import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { Menu, Search, User, Moon, Sun, LogOut, Settings, MessageCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useImpersonation } from "@/contexts/ImpersonationContext";
import { AppSidebar } from "./AppSidebar";
import { NotificationsDropdown } from "./NotificationsDropdown";
import { ReadOnlyBanner } from "./ReadOnlyBanner";
import { WhatsNewModal } from "@/components/announcements/WhatsNewModal";
import { TrialBanner } from "@/components/dashboard/TrialBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUnreadMessageCount } from "@/hooks/useCommunity";

export function MainLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: unreadCount = 0 } = useUnreadMessageCount();

  const handleSignOut = async () => {
    await signOut();
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <AppSidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      )}

      {/* Mobile Sidebar Overlay */}
      {isMobile && mobileMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 animate-slide-in-right">
            <AppSidebar
              collapsed={false}
              onToggle={() => {}}
              isMobile={true}
              onMobileClose={() => setMobileMenuOpen(false)}
            />
          </div>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Read-only impersonation banner */}
        <ReadOnlyBanner />
        {/* Trial countdown banner */}
        <TrialBanner />
        {/* Header */}
        <header className="h-16 shrink-0 border-b border-border bg-card/50 backdrop-blur-sm flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {isMobile && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden"
              >
                <Menu className="h-5 w-5" />
              </Button>
            )}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="w-64 pl-9 h-9 bg-muted/50 border-transparent focus:border-border"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-9 w-9"
            >
              {darkMode ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            {/* Messages button with unread badge */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/messages")}
              className="h-9 w-9 relative"
            >
              <MessageCircle className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive" />
              )}
            </Button>

            <NotificationsDropdown />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
                  <div className="w-7 h-7 rounded-full bg-gradient-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">Mon Compte</p>
                    <p className="text-xs leading-none text-muted-foreground truncate">
                      {user?.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>
                  <Settings className="mr-2 h-4 w-4" />
                  Paramètres
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive cursor-pointer"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>

      {/* What's New Modal */}
      <WhatsNewModal />
    </div>
  );
}
