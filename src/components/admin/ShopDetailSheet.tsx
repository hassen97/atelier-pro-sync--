import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useShopDetails } from "@/hooks/useAdmin";
import { Loader2, Store, Users, Package, ShoppingCart, Wrench, Receipt, Truck, Phone, MessageCircle, Mail, MapPin, CheckCircle, Ban, Clock, Zap, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getCountryByCode, getCurrencyByCode } from "@/data/countries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useAdminShopSubscriptions } from "@/hooks/useSubscription";
import { GodModeSubscriptionDialog } from "./GodModeSubscriptionDialog";

interface ShopDetailSheetProps {
  userId: string | null;
  onClose: () => void;
}

function getOnlineStatus(lastOnline: string | null) {
  if (!lastOnline) return "offline";
  const diff = Date.now() - new Date(lastOnline).getTime();
  if (diff < 5 * 60 * 1000) return "online";
  if (diff < 60 * 60 * 1000) return "away";
  return "offline";
}

const statusLabel: Record<string, string> = { online: "En ligne", away: "Absent", offline: "Hors ligne" };
const statusColor: Record<string, string> = { online: "bg-emerald-400", away: "bg-amber-400", offline: "bg-red-400" };

export function ShopDetailSheet({ userId, onClose }: ShopDetailSheetProps) {
  const { data, isLoading } = useShopDetails(userId);
  const { data: shopSubs } = useAdminShopSubscriptions();
  const [godModeOpen, setGodModeOpen] = useState(false);

  const sub = (shopSubs || []).find((s: any) => s.user_id === userId);

  const shopName = data?.shop?.shop_name && data.shop.shop_name !== "Mon Atelier"
    ? data.shop.shop_name
    : `⚠️ Setup Incomplet (@${data?.profile?.username || "?"})`;

  return (
    <Sheet open={!!userId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 bg-[#0B1120] border-l border-white/10 text-white">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
          </div>
        ) : data ? (
          <ScrollArea className="h-full">
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-start gap-4">
                {data.shop?.logo_url ? (
                  <img src={data.shop.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00D4FF]/20 to-[#00D4FF]/5 border border-[#00D4FF]/20 flex items-center justify-center">
                    <Store className="h-6 w-6 text-[#00D4FF]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h2 className="text-xl font-bold text-white truncate">{shopName}</h2>
                  <p className="text-sm text-slate-400">
                    {data.profile?.full_name || data.profile?.username} · @{data.profile?.username}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      {getCountryByCode(data.shop?.country || "TN")?.flag}{" "}
                      {getCountryByCode(data.shop?.country || "TN")?.name}
                    </span>
                    <span className="text-xs text-slate-600">·</span>
                    <span className="text-xs text-slate-500">{getCurrencyByCode(data.shop?.currency || "TND")?.code}</span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className={cn("w-2 h-2 rounded-full", statusColor[getOnlineStatus(data.profile?.last_online_at)])} />
                    <span className="text-xs text-slate-400">
                      {statusLabel[getOnlineStatus(data.profile?.last_online_at)]}
                      {data.profile?.last_online_at && getOnlineStatus(data.profile.last_online_at) !== "online" && (
                        <> · {formatDistanceToNow(new Date(data.profile.last_online_at), { addSuffix: true, locale: fr })}</>
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Verification block removed — verification gate is no longer used. */}

              <Separator className="bg-white/10" />

              {/* Subscription / Plan Override */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Abonnement</h3>
                {sub ? (
                  <div className="admin-glass-card rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge className="text-xs bg-[#00D4FF]/10 text-[#00D4FF] border border-[#00D4FF]/20">
                        {sub.plan?.name ?? "—"}
                      </Badge>
                      <span className="text-xs text-slate-500">{sub.status}</span>
                    </div>
                    {sub.expires_at && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Calendar className="h-3 w-3" />
                        Expire : {format(new Date(sub.expires_at), "dd MMM yyyy", { locale: fr })}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Aucun abonnement actif</p>
                )}
                <Button
                  size="sm"
                  className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30 h-8 text-xs w-full"
                  onClick={() => setGodModeOpen(true)}
                >
                  <Zap className="h-3.5 w-3.5 mr-1.5" /> God Mode — Gérer l'abonnement
                </Button>
              </div>

              <Separator className="bg-white/10" />

              {/* Contact Info with clickable links */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Contact</h3>
                <div className="space-y-2">
                  {[
                    {
                      icon: Phone,
                      value: data.profile?.phone || data.shop?.phone,
                      label: "Téléphone",
                      href: data.profile?.phone || data.shop?.phone ? `tel:${data.profile?.phone || data.shop?.phone}` : undefined,
                    },
                    {
                      icon: MessageCircle,
                      value: data.profile?.whatsapp_phone || data.shop?.whatsapp_phone,
                      label: "WhatsApp",
                      href: (data.profile?.whatsapp_phone || data.shop?.whatsapp_phone)
                        ? `https://wa.me/${(data.profile?.whatsapp_phone || data.shop?.whatsapp_phone || "").replace(/[^0-9]/g, "")}`
                        : undefined,
                      color: "text-emerald-400",
                    },
                    {
                      icon: Mail,
                      value: data.profile?.email || data.shop?.email,
                      label: "Email",
                      href: data.profile?.email || data.shop?.email ? `mailto:${data.profile?.email || data.shop?.email}` : undefined,
                    },
                    { icon: MapPin, value: data.shop?.address, label: "Adresse" },
                  ].map(({ icon: Icon, value, label, href, color }) => (
                    <div key={label} className="flex items-center gap-2 text-sm">
                      <Icon className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                      {href && value ? (
                        <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className={cn("hover:underline", color || "text-[#00D4FF]")}>
                          {value}
                        </a>
                      ) : (
                        <span className={value ? "text-slate-300" : "text-slate-600"}>{value || "—"}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Stats Grid */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Statistiques</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { icon: Package, label: "Produits", value: data.counts.products, color: "text-[#00D4FF]", bg: "bg-[#00D4FF]/10" },
                    { icon: Users, label: "Clients", value: data.counts.customers, color: "text-violet-400", bg: "bg-violet-500/10" },
                    { icon: ShoppingCart, label: "Ventes", value: data.counts.sales, color: "text-emerald-400", bg: "bg-emerald-500/10", sub: `${data.revenue.sales.toLocaleString()} ${data.shop?.currency || "TND"}` },
                    { icon: Wrench, label: "Réparations", value: data.counts.repairs, color: "text-amber-400", bg: "bg-amber-500/10", sub: `${data.revenue.repairs.toLocaleString()} ${data.shop?.currency || "TND"}` },
                    { icon: Receipt, label: "Dépenses", value: data.counts.expenses, color: "text-red-400", bg: "bg-red-500/10", sub: `${data.revenue.expenses.toLocaleString()} ${data.shop?.currency || "TND"}` },
                    { icon: Truck, label: "Fournisseurs", value: data.counts.suppliers, color: "text-sky-400", bg: "bg-sky-500/10" },
                  ].map(({ icon: Icon, label, value, color, bg, sub }) => (
                    <div key={label} className="admin-glass-card rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={cn("p-1.5 rounded-md", bg)}>
                          <Icon className={cn("h-3.5 w-3.5", color)} />
                        </div>
                        <span className="text-xs text-slate-400">{label}</span>
                      </div>
                      <p className={cn("text-lg font-bold font-mono-numbers", color)}>{value}</p>
                      {sub && <p className="text-[10px] text-slate-500 mt-0.5">{sub}</p>}
                    </div>
                  ))}
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Team Members */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Équipe ({data.counts.team_members})
                </h3>
                {data.team.length > 0 ? (
                  <div className="space-y-2">
                    {data.team.map((member) => {
                      const memberStatus = getOnlineStatus(member.last_online_at);
                      return (
                        <div key={member.id} className="flex items-center justify-between admin-glass-card rounded-lg p-3">
                          <div className="flex items-center gap-2">
                            <span className={cn("w-2 h-2 rounded-full", statusColor[memberStatus])} />
                            <div>
                              <p className="text-sm text-white">{member.full_name || member.username || "—"}</p>
                              {member.username && <p className="text-xs text-slate-500">@{member.username}</p>}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-slate-400">
                            {member.role}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">Aucun membre</p>
                )}
              </div>

              <Separator className="bg-white/10" />

              {/* Recent Activity */}
              <div>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Activité récente</h3>
                <div className="space-y-2">
                  {[...data.recent_sales.map((s) => ({
                    type: "sale" as const,
                    label: `Vente (${s.payment_method})`,
                    amount: s.total_amount,
                    date: s.created_at,
                    icon: ShoppingCart,
                    color: "text-emerald-400",
                  })),
                  ...data.recent_repairs.map((r) => ({
                    type: "repair" as const,
                    label: r.device_model,
                    amount: r.total_cost,
                    date: r.created_at,
                    icon: Wrench,
                    color: "text-amber-400",
                    status: r.status,
                  }))].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8).map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-sm admin-glass-card rounded-lg p-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} />
                        <span className="text-slate-300 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-mono-numbers text-white">
                          {Number(item.amount).toLocaleString()} {data.shop?.currency || "TND"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {formatDistanceToNow(new Date(item.date), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data.recent_sales.length === 0 && data.recent_repairs.length === 0 && (
                    <p className="text-sm text-slate-500">Aucune activité</p>
                  )}
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[10px] text-slate-600 pt-2">
                Inscription : {data.profile?.created_at ? format(new Date(data.profile.created_at), "dd MMM yyyy", { locale: fr }) : "—"}
              </div>
            </div>
          </ScrollArea>
        ) : null}
      </SheetContent>

      {/* God Mode Dialog */}
      {userId && godModeOpen && (
        <GodModeSubscriptionDialog
          open={godModeOpen}
          onOpenChange={setGodModeOpen}
          userId={userId}
          shopName={data?.shop?.shop_name || "Boutique"}
        />
      )}
    </Sheet>
  );
}
