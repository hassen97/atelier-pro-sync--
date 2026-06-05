import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wrench, ShoppingCart, Shield, Phone, Mail, MapPin, DollarSign, Sparkles, Plus, Minus, KeyRound, Eye, EyeOff, Copy, Printer, Pencil, Trash2, Save, X } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useCustomerHistory } from "@/hooks/useCustomerHistory";
import { useLoyaltyTransactions, useAdjustLoyaltyPoints } from "@/hooks/useLoyalty";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useCustomerVault, useAddVaultCredential, useUpdateVaultCredential, useDeleteVaultCredential, type VaultCredential } from "@/hooks/useCustomerVault";
import { generateCredentialSlip } from "@/lib/receiptPdf";
import { toast } from "sonner";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerDossierDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
  delivered: "Livré",
};

export function CustomerDossierDialog({ customer, open, onOpenChange }: CustomerDossierDialogProps) {
  const { format } = useCurrency();
  const { repairs, sales, warranties, lifetimeSpend, isLoading } = useCustomerHistory(customer?.id);
  const { settings } = useShopSettingsContext();
  const { data: loyaltyTx = [], isLoading: loyaltyLoading } = useLoyaltyTransactions(customer?.id);
  const adjust = useAdjustLoyaltyPoints();
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNote, setAdjNote] = useState("");

  if (!customer) return null;

  const initials = customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const balance = (customer as any).loyalty_points ?? 0;

  const handleAdjust = async (sign: 1 | -1) => {
    const n = parseInt(adjAmount);
    if (!n || n <= 0) return;
    await adjust.mutateAsync({
      customer_id: customer.id,
      amount_points: sign * n,
      note: adjNote || undefined,
    });
    setAdjAmount("");
    setAdjNote("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dossier Client</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold">{customer.name}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
              {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.address}</span>}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <div className="text-base font-bold font-mono-numbers text-primary">{format(lifetimeSpend)}</div>
            <div className="text-[10px] text-muted-foreground">Total dépensé</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Wrench className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-base font-bold font-mono-numbers">{repairs.length}</div>
            <div className="text-[10px] text-muted-foreground">Réparations</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-base font-bold font-mono-numbers">{sales.length}</div>
            <div className="text-[10px] text-muted-foreground">Achats</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="h-4 w-4 mx-auto text-primary mb-1" />
            <div className="text-base font-bold font-mono-numbers text-primary">{balance}</div>
            <div className="text-[10px] text-muted-foreground">Points</div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <Tabs defaultValue="repairs" className="mt-2">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="repairs">
                <Wrench className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Rép. </span>({repairs.length})
              </TabsTrigger>
              <TabsTrigger value="sales">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Achats </span>({sales.length})
              </TabsTrigger>
              <TabsTrigger value="warranties">
                <Shield className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Gar. </span>({warranties.length})
              </TabsTrigger>
              <TabsTrigger value="loyalty">
                <Sparkles className="h-3.5 w-3.5 mr-1" />
                Fidélité
              </TabsTrigger>
              <TabsTrigger value="vault">
                <KeyRound className="h-3.5 w-3.5 mr-1" />
                Coffre
              </TabsTrigger>
            </TabsList>

            <TabsContent value="repairs" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {repairs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucune réparation</p>
              ) : (
                repairs.map((repair) => (
                  <div key={repair.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{repair.device_model}</p>
                      <p className="text-xs text-muted-foreground truncate">{repair.problem_description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(repair.deposit_date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {statusLabels[repair.status] || repair.status}
                      </Badge>
                      <p className="text-sm font-bold font-mono-numbers">{format(Number(repair.total_cost))}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="sales" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {sales.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucun achat</p>
              ) : (
                sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{sale.sale_items?.length || 0} article(s)</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString("fr-FR")}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {sale.payment_method === "cash" ? "Espèces" : "Carte"}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold font-mono-numbers">{format(Number(sale.total_amount))}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="warranties" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {warranties.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucune garantie active</p>
              ) : (
                warranties.map((warranty) => (
                  <div key={warranty.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{warranty.return_reason}</p>
                      <p className="text-xs text-muted-foreground">{new Date(warranty.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <Badge variant={warranty.status === "pending" ? "secondary" : "default"} className="text-[10px]">
                      {warranty.status === "pending" ? "En attente" : "En cours"}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="loyalty" className="max-h-[400px] overflow-y-auto mt-3 space-y-3">
              {!settings.loyalty_enabled && (
                <div className="p-3 rounded-lg bg-muted/40 text-xs text-muted-foreground">
                  Le programme de fidélité est désactivé. Activez-le dans Paramètres → Boutique.
                </div>
              )}

              {/* Manual adjust */}
              <div className="rounded-lg border p-3 space-y-2 bg-card">
                <p className="text-xs font-semibold flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Ajuster manuellement
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px]">Points</Label>
                    <Input type="number" min="1" placeholder="ex: 50" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} className="h-8 font-mono-numbers" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Note (optionnel)</Label>
                    <Input placeholder="Cadeau, correction..." value={adjNote} onChange={(e) => setAdjNote(e.target.value)} className="h-8" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(1)} disabled={adjust.isPending || !adjAmount} className="flex-1">
                    <Plus className="h-3 w-3 mr-1" />Ajouter
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleAdjust(-1)} disabled={adjust.isPending || !adjAmount} className="flex-1 text-destructive">
                    <Minus className="h-3 w-3 mr-1" />Retirer
                  </Button>
                </div>
              </div>

              {/* History */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Historique</p>
                {loyaltyLoading ? (
                  <Skeleton className="h-20" />
                ) : loyaltyTx.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-6">Aucune transaction</p>
                ) : (
                  loyaltyTx.map((tx) => {
                    const isPositive = tx.amount_points > 0;
                    const label =
                      tx.type === "earned" ? `Gagné${tx.source === "repair" ? " (réparation)" : tx.source === "sale" ? " (vente)" : ""}` :
                      tx.type === "redeemed" ? "Utilisé" :
                      "Ajustement";
                    return (
                      <div key={tx.id} className="flex items-center justify-between p-2.5 rounded-lg border bg-card">
                        <div className="min-w-0">
                          <p className="text-xs font-medium">{label}</p>
                          {tx.note && <p className="text-[10px] text-muted-foreground truncate">{tx.note}</p>}
                          <p className="text-[10px] text-muted-foreground">{new Date(tx.created_at).toLocaleString("fr-FR")}</p>
                        </div>
                        <div className={`text-sm font-bold font-mono-numbers ${isPositive ? "text-success" : "text-destructive"}`}>
                          {isPositive ? "+" : ""}{tx.amount_points} pts
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            <TabsContent value="vault" className="max-h-[400px] overflow-y-auto mt-3">
              <VaultTab customer={customer} shopName={settings.shop_name} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface VaultTabProps {
  customer: Customer;
  shopName: string;
}

const emptyForm = { account_type: "", email_id: "", password: "" };

function VaultTab({ customer, shopName }: VaultTabProps) {
  const { data: credentials = [], isLoading } = useCustomerVault(customer.id);
  const addCred = useAddVaultCredential();
  const updateCred = useUpdateVaultCredential();
  const deleteCred = useDeleteVaultCredential();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(false);
  };

  const startEdit = (cred: VaultCredential) => {
    setForm({ account_type: cred.account_type, email_id: cred.email_id, password: cred.password });
    setEditingId(cred.id);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.account_type.trim() || !form.email_id.trim() || !form.password.trim()) {
      toast.error("Tous les champs sont requis");
      return;
    }
    if (editingId) {
      await updateCred.mutateAsync({ id: editingId, customerId: customer.id, input: form });
    } else {
      await addCred.mutateAsync({ customerId: customer.id, input: form });
    }
    resetForm();
  };

  const handleDelete = async (cred: VaultCredential) => {
    if (!window.confirm(`Supprimer l'identifiant « ${cred.account_type} » ?`)) return;
    await deleteCred.mutateAsync({ id: cred.id, customerId: customer.id });
  };

  const handleCopy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const handlePrint = (cred: VaultCredential) => {
    generateCredentialSlip(
      {
        accountType: cred.account_type,
        emailId: cred.email_id,
        password: cred.password,
        customer: customer.name,
        date: new Date().toLocaleDateString("fr-FR"),
      },
      shopName,
      "80mm"
    );
  };

  return (
    <div className="space-y-3">
      {!showForm && (
        <Button size="sm" variant="outline" onClick={() => { setForm(emptyForm); setEditingId(null); setShowForm(true); }} className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1" /> Ajouter un identifiant
        </Button>
      )}

      {showForm && (
        <div className="rounded-lg border p-3 space-y-2 bg-card">
          <p className="text-xs font-semibold flex items-center gap-1">
            <KeyRound className="h-3.5 w-3.5 text-primary" />
            {editingId ? "Modifier l'identifiant" : "Nouvel identifiant"}
          </p>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label className="text-[10px]">Type de compte</Label>
              <Input placeholder="iCloud, Gmail, Samsung..." value={form.account_type} onChange={(e) => setForm({ ...form, account_type: e.target.value })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Email / Identifiant</Label>
              <Input placeholder="exemple@email.com" value={form.email_id} onChange={(e) => setForm({ ...form, email_id: e.target.value })} className="h-8" />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px]">Mot de passe</Label>
              <Input placeholder="••••••••" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="h-8 font-mono" />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} disabled={addCred.isPending || updateCred.isPending} className="flex-1">
              <Save className="h-3 w-3 mr-1" /> Enregistrer
            </Button>
            <Button size="sm" variant="outline" onClick={resetForm} className="flex-1">
              <X className="h-3 w-3 mr-1" /> Annuler
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-20" />
      ) : credentials.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">Aucun identifiant enregistré</p>
      ) : (
        <div className="space-y-2">
          {credentials.map((cred) => {
            const isRevealed = !!revealed[cred.id];
            return (
              <div key={cred.id} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-[10px]">{cred.account_type}</Badge>
                  <div className="flex items-center gap-1">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handlePrint(cred)} aria-label="Imprimer l'identifiant">
                      <Printer className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEdit(cred)} aria-label="Modifier l'identifiant">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(cred)} aria-label="Supprimer l'identifiant">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Email / Identifiant</p>
                    <p className="text-sm font-medium truncate">{cred.email_id}</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => handleCopy(cred.email_id, "Email")} aria-label="Copier l'email">
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] text-muted-foreground">Mot de passe</p>
                    <p className="text-sm font-mono truncate">{isRevealed ? cred.password : "••••••••"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setRevealed((r) => ({ ...r, [cred.id]: !r[cred.id] }))} aria-label={isRevealed ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleCopy(cred.password, "Mot de passe")} aria-label="Copier le mot de passe">
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
