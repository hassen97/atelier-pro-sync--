import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Wrench,
  Users,
  Truck,
  Receipt,
  TrendingUp,
  Settings,
  CreditCard,
  FileText,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Smartphone,
  MessageSquareWarning,
  Shield,
  Users2,
  MessageCircle,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FeedbackDialog } from "@/components/feedback/FeedbackDialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useAllowedPages } from "@/hooks/useTeam";
import { useI18n } from "@/contexts/I18nContext";
import { useUnreadMessageCount } from "@/hooks/useCommunity";

const navigation = [
  { nameKey: "nav.dashboard" as const, href: "/dashboard", icon: LayoutDashboard },
  { nameKey: "nav.pos" as const, href: "/pos", icon: ShoppingCart },
  { nameKey: "nav.repairs" as const, href: "/repairs", icon: Wrench },
  { nameKey: "nav.inventory" as const, href: "/inventory", icon: Package },
  { nameKey: "nav.customers" as const, href: "/customers", icon: Users },
  { nameKey: "nav.suppliers" as const, href: "/suppliers", icon: Truck },
  { nameKey: "nav.expenses" as const, href: "/expenses", icon: Receipt },
  { nameKey: "nav.debts" as const, href: "/customer-debts", icon: CreditCard },
  { nameKey: "nav.invoices" as const, href: "/invoices", icon: FileText },
  { nameKey: "nav.statistics" as const, href: "/statistics", icon: BarChart3 },
  { nameKey: "nav.profit" as const, href: "/profit", icon: TrendingUp },
  { nameKey: "nav.warranty" as const, href: "/warranty", icon: Shield },
  { nameKey: "nav.team" as const, href: "/team", icon: Users2 },
  { nameKey: "nav.community" as const, href: "/communaute", icon: Users2 },
  { nameKey: "nav.services" as const, href: "/services", icon: Cloud },
  { nameKey: "nav.messages" as const, href: "/messages", icon: MessageCircle },
];

const bottomNav = [
  { nameKey: "nav.settings" as const, href: "/settings", icon: Settings },
];

interface AppSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isMobile?: boolean;
  onMobileClose?: () => void;
}

export function AppSidebar({ collapsed, onToggle, isMobile, onMobileClose }: AppSidebarProps) {
  const location = useLocation();
  const { settings } = useShopSettingsContext();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const { allowedPages } = useAllowedPages();
  const { t } = useI18n();
  const { data: unreadCount = 0 } = useUnreadMessageCount();

  // Filter navigation based on allowed pages
  const filteredNavigation = allowedPages
    ? navigation.filter((item) => allowedPages.includes(item.href))
    : navigation;

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  const NavItem = ({ item }: { item: { nameKey: string; href: string; icon: any } }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    const name = t(item.nameKey as any);
    const hasUnread = item.href === "/messages" && unreadCount > 0;

    const linkContent = (
      <NavLink
        to={item.href}
        onClick={isMobile ? onMobileClose : undefined}
        className={cn(
          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
          "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          active && "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft",
          !active && "text-sidebar-foreground/80",
          collapsed && !isMobile && "justify-center px-2"
        )}
      >
        <span className="relative shrink-0">
          <Icon className={cn("h-5 w-5", active && "text-sidebar-primary-foreground")} />
          {hasUnread && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-destructive" />
          )}
        </span>
        {(!collapsed || isMobile) && (
          <span className="truncate">{name}</span>
        )}
      </NavLink>
    );

    if (collapsed && !isMobile) {
      return (
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {name}
          </TooltipContent>
        </Tooltip>
      );
    }

    return linkContent;
  };

  const logoUrl = settings.logo_url;

  return (
    <aside
      className={cn(
        "flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300",
        collapsed && !isMobile ? "w-16" : "w-64",
        isMobile && "w-64"
      )}
    >
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border shrink-0",
        collapsed && !isMobile ? "justify-center" : "justify-between"
      )}>
        {(!collapsed || isMobile) && (
          <div className="flex items-center gap-2">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={settings.shop_name}
                className="w-9 h-9 rounded-lg object-cover"
              />
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
                <Smartphone className="h-5 w-5 text-primary-foreground" />
              </div>
            )}
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground text-sm truncate max-w-[140px]">{settings.shop_name}</span>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          logoUrl ? (
            <img
              src={logoUrl}
              alt={settings.shop_name}
              className="w-9 h-9 rounded-lg object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-gradient-primary">
              <Smartphone className="h-5 w-5 text-primary-foreground" />
            </div>
          )
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              "h-8 w-8 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
              collapsed && "hidden"
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="flex flex-col gap-1">
          {filteredNavigation.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* Bottom Navigation */}
      <div className="px-3 py-3 border-t border-sidebar-border space-y-1">
        {/* Feedback Button */}
        <button
          onClick={() => setFeedbackOpen(true)}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all w-full",
            "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
            collapsed && !isMobile && "justify-center px-2"
          )}
        >
          <MessageSquareWarning className="h-5 w-5 shrink-0" />
          {(!collapsed || isMobile) && <span className="truncate">{t("nav.feedback")}</span>}
        </button>
        {bottomNav.map((item) => (
          <NavItem key={item.href} item={item} />
        ))}
      </div>

      {/* Expand Button (when collapsed) */}
      {collapsed && !isMobile && (
        <div className="px-3 pb-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className="w-full h-9 text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </aside>
  );
}
