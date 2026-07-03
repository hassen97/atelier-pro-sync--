import { useState } from "react";
import { usePaymentGateways, useToggleGateway, useUpdateGatewayConfig, PaymentGateway } from "@/hooks/usePaymentGateways";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CreditCard, Landmark, Smartphone, Globe, Bitcoin, Settings, Save, Eye, CheckCircle, XCircle, Clock } from "lucide-react";
import { useAdminOrders, useUpdateOrder } from "@/hooks/useAdminOrders";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const gatewayIcons: Record<string, any> = {
  stripe: CreditCard,
  konnect: Globe,
  flouci: Smartphone,
  bank_transfer: Landmark,
  d17: Smartphone,
  usdt: Bitcoin,
  binance_pay: Bitcoin,
};

const configFieldsByGateway: Record<string, { key: string; label: string; placeholder: string }[]> = {
  bank_transfer: [
    { key: "bank_name", label: "Nom de la banque", placeholder: "ex: Attijari Bank" },
    { key: "account_name", label: "Titulaire du compte", placeholder: "ex: John Doe" },
    { key: "rib", label: "RIB", placeholder: "ex: 04 018 0100..." },
    { key: "iban", label: "IBAN", placeholder: "ex: TN59..." },
  ],
  d17: [
    { key: "phone_number", label: "Numéro D17", placeholder: "ex: +216 XX XXX XXX" },
    { key: "d17_name", label: "Nom du titulaire", placeholder: "ex: John Doe" },
  ],
  usdt: [
    { key: "wallet_address", label: "Adresse wallet USDT", placeholder: "ex: TXyz..." },
    { key: "network", label: "Réseau (TRC20/ERC20)", placeholder: "ex: TRC20" },
  ],
  binance_pay: [
    { key: "binance_id", label: "Binance Pay ID", placeholder: "ex: 123456789" },
    { key: "binance_username", label: "Nom d'utilisateur Binance", placeholder: "ex: user123" },
    { key: "merchant_id", label: "Merchant ID (optionnel)", placeholder: "ex: MERCH_001" },
  ],
  flouci: [
    { key: "phone_number", label: "Numéro Flouci", placeholder: "ex: +216 XX XXX XXX" },
  ],
  konnect: [
    { key: "merchant_id", label: "Konnect Wallet ID", placeholder: "ex: ..." },
  ],
  stripe: [
    { key: "merchant_id", label: "Stripe Account ID", placeholder: "ex: acct_..." },
  ],
};

export function AdminPaymentGatewaysView() {
  const { data, isLoading } = usePaymentGateways();
  const toggleGateway = useToggleGateway();
  const updateConfig = useUpdateGatewayConfig();
  const [editGateway, setEditGateway] = useState<(PaymentGateway & { config?: Record<string, string> }) | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});

  const handleEditConfig = (gw: any) => {
    setEditGateway(gw);
    setConfigValues(gw.config || {});
  };

  const handleSaveConfig = () => {
    if (!editGateway) return;
    updateConfig.mutate({ gatewayId: editGateway.id, config: configValues }, {
      onSuccess: () => setEditGateway(null),
    });
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const gateways = data?.gateways || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <Tabs defaultValue="gateways" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 mb-4">
          <TabsTrigger value="gateways" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Passerelles
          </TabsTrigger>
          <TabsTrigger value="orders" className="data-[state=active]:bg-white/10 data-[state=active]:text-white text-slate-400">
            Commandes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gateways">
          <h2 className="text-lg font-semibold text-white mb-4">Passerelles de Paiement</h2>
          <div className="space-y-3">
            {gateways.map((gw: any) => {
              const Icon = gatewayIcons[gw.gateway_key] || CreditCard;
              const hasConfig = gw.config && Object.values(gw.config).some((v: any) => v);
              return (
                <div key={gw.id} className="admin-glass-card rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                      <Icon className="h-5 w-5 text-[#00D4FF]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-white font-medium text-sm">{gw.gateway_name}</h3>
                        {hasConfig && (
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-0 text-[10px]">Configuré</Badge>
                        )}
                      </div>
                      <p className="text-slate-500 text-xs">{gw.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => handleEditConfig(gw)}>
                      <Settings className="h-3.5 w-3.5 mr-1" /> Config
                    </Button>
                    <Switch
                      checked={gw.is_enabled}
                      onCheckedChange={(checked) => toggleGateway.mutate({ gatewayId: gw.id, enabled: checked })}
                      disabled={toggleGateway.isPending}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <AdminOrdersList />
        </TabsContent>
      </Tabs>

      {/* Config Dialog */}
      <Dialog open={!!editGateway} onOpenChange={() => setEditGateway(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Configurer : {editGateway?.gateway_name}</DialogTitle>
          </DialogHeader>
          {editGateway && (
            <div className="space-y-4">
              <p className="text-sm text-slate-400">
                Ces informations seront affichées aux utilisateurs lors du paiement.
              </p>
              {(configFieldsByGateway[editGateway.gateway_key] || []).map((field) => (
                <div key={field.key}>
                  <Label className="text-slate-300">{field.label}</Label>
                  <Input
                    value={configValues[field.key] || ""}
                    onChange={e => setConfigValues({ ...configValues, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="bg-white/5 border-white/10 text-white"
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEditGateway(null)} className="text-slate-400">Annuler</Button>
            <Button onClick={handleSaveConfig} disabled={updateConfig.isPending} className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30">
              {updateConfig.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AdminOrdersList() {
  const { data, isLoading } = useAdminOrders();
  const updateOrder = useUpdateOrder();
  const [viewProof, setViewProof] = useState<string | null>(null);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const orders = data?.orders || [];

  const statusColors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400",
    approved: "bg-emerald-500/10 text-emerald-400",
    rejected: "bg-red-500/10 text-red-400",
  };

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    approved: "Approuvé",
    rejected: "Rejeté",
  };

  const handleViewProof = async (proofUrl: string) => {
    const { data } = await supabase.storage
      .from("payment-proofs")
      .createSignedUrl(proofUrl, 300);
    if (data?.signedUrl) {
      setViewProof(data.signedUrl);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">Commandes d'abonnement</h2>
      {orders.length === 0 ? (
        <p className="text-slate-500 text-sm py-8 text-center">Aucune commande pour le moment</p>
      ) : (
        <div className="space-y-3">
          {orders.map((order: any) => (
            <div key={order.id} className="admin-glass-card rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium text-sm">{order.user_full_name || order.user_username || "Utilisateur"}</span>
                    <Badge className={`border-0 text-[10px] ${statusColors[order.status] || ""}`}>
                      {statusLabels[order.status] || order.status}
                    </Badge>
                  </div>
                  <p className="text-slate-500 text-xs mt-1">
                    Plan: <span className="text-slate-300">{order.plan_name}</span> — {order.amount} {order.currency} — via {order.gateway_key}
                  </p>
                  <p className="text-slate-600 text-xs mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {order.proof_url && (
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white" onClick={() => handleViewProof(order.proof_url)}>
                      <Eye className="h-3.5 w-3.5 mr-1" /> Preuve
                    </Button>
                  )}
                  {order.status === "pending" && (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                        onClick={() => updateOrder.mutate({ orderId: order.id, status: "approved" })}
                        disabled={updateOrder.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approuver
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => updateOrder.mutate({ orderId: order.id, status: "rejected" })}
                        disabled={updateOrder.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Rejeter
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proof viewer dialog */}
      <Dialog open={!!viewProof} onOpenChange={() => setViewProof(null)}>
        <DialogContent className="bg-slate-900 border-white/10 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Preuve de paiement</DialogTitle>
          </DialogHeader>
          {viewProof && (
            <img src={viewProof} alt="Preuve de paiement" className="w-full rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
