import { useState } from "react";
import {
  Search, Filter, User, Phone, CreditCard, Calendar, MoreHorizontal, Banknote, Plus,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useAllCustomers, useUpdateCustomer, Customer } from "@/hooks/useCustomers";
import { useAllUnpaidRepairs, useUpdateRepair } from "@/hooks/useRepairs";
import { useSales, useUpdateSale } from "@/hooks/useSales";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { getShopInitials, formatTicketNumber } from "@/lib/utils";
import { toast } from "sonner";

interface DebtItem {
  id: string; customerId: string; customerName: string; customerPhone: string;
  type: "Réparation" | "Vente"; reference: string; totalAmount: number; paidAmount: number; createdAt: string;
}

export default function CustomerDebts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedDebt, setSelectedDebt] = useState<DebtItem | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [newDebtOpen, setNewDebtOpen] = useState(false);
  const [newDebtCustomerId, setNewDebtCustomerId] = useState("");
  const [newDebtAmount, setNewDebtAmount] = useState("");
  const [newDebtNote, setNewDebtNote] = useState("");
  const [creatingDebt, setCreatingDebt] = useState(false);

  const { data: customers = [] } = useAllCustomers();
  const { data: repairs = [] } = useAllUnpaidRepairs();
  const { data: sales = [] } = useSales();
  const updateCustomer = useUpdateCustomer();
  const updateRepair = useUpdateRepair();
  const updateSale = useUpdateSale();
  const { format } = useCurrency();

  const { settings } = useShopSettingsContext();
  const shopInitials = getShopInitials(settings.shop_name);

  const debts: DebtItem[] = [];

  repairs.forEach((repair: any) => {
    const remaining = Number(repair.total_cost) - Number(repair.amount_paid);
    if (remaining > 0) {
      const customer = customers.find((c) => c.id === repair.customer_id);
      const ref = formatTicketNumber(shopInitials, repair.ticket_number ?? null) || `REP-${repair.id.slice(0, 8).toUpperCase()}`;
      debts.push({ id: repair.id, customerId: repair.customer_id || "", customerName: customer?.name || "Client inconnu", customerPhone: customer?.phone || "", type: "Réparation", reference: ref, totalAmount: Number(repair.total_cost), paidAmount: Number(repair.amount_paid), createdAt: repair.created_at });
    }
  });

  sales.forEach((sale) => {
    const remaining = Number(sale.total_amount) - Number(sale.amount_paid);
    if (remaining > 0) {
      const customer = customers.find((c) => c.id === sale.customer_id);
      debts.push({ id: sale.id, customerId: sale.customer_id || "", customerName: customer?.name || "Client passager", customerPhone: customer?.phone || "", type: "Vente", reference: `VEN-${sale.id.slice(0, 8).toUpperCase()}`, totalAmount: Number(sale.total_amount), paidAmount: Number(sale.amount_paid), createdAt: sale.created_at });
    }
  });

  customers.forEach((customer) => {
    if (Number(customer.balance) > 0) {
      const existingDebt = debts.find((d) => d.customerId === customer.id);
      if (!existingDebt) {
        debts.push({ id: customer.id, customerId: customer.id, customerName: customer.name, customerPhone: customer.phone || "", type: "Vente", reference: `CLI-${customer.id.slice(0, 8).toUpperCase()}`, totalAmount: Number(customer.balance), paidAmount: 0, createdAt: customer.created_at });
      }
    }
  });

  const filteredDebts = debts.filter((debt) => debt.customerName.toLowerCase().includes(searchQuery.toLowerCase()) || debt.reference.toLowerCase().includes(searchQuery.toLowerCase()));
  const totalDebts = debts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
  const debtorsCount = new Set(debts.map((d) => d.customerId)).size;

  const handlePayment = (debt: DebtItem) => { setSelectedDebt(debt); setPaymentAmount(""); setPaymentDialogOpen(true); };

  const submitPayment = async () => {
    if (!selectedDebt || !paymentAmount) return;
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) { toast.error("Montant invalide"); return; }
    const remaining = selectedDebt.totalAmount - selectedDebt.paidAmount;
    if (amount > remaining) { toast.error("Le montant dépasse la dette restante"); return; }

    try {
      if (selectedDebt.type === "Réparation") {
        const repair = repairs.find((r) => r.id === selectedDebt.id);
        if (repair) await updateRepair.mutateAsync({ id: repair.id, amount_paid: Number(repair.amount_paid) + amount });
      } else if (selectedDebt.type === "Vente" && !selectedDebt.reference.startsWith("CLI-")) {
        const sale = sales.find((s) => s.id === selectedDebt.id);
        if (sale) await updateSale.mutateAsync({ id: sale.id, amount_paid: Number(sale.amount_paid) + amount });
      }
      const customer = customers.find((c) => c.id === selectedDebt.customerId);
      if (customer) { const newBalance = Math.max(0, Number(customer.balance) - amount); await updateCustomer.mutateAsync({ id: customer.id, balance: newBalance }); }
      toast.success("Paiement enregistré");
      setPaymentDialogOpen(false); setSelectedDebt(null); setPaymentAmount("");
    } catch (error) { console.error("Error recording payment:", error); toast.error("Erreur lors de l'enregistrement"); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Dettes Clients" description="Suivi des créances et paiements partiels" />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total créances" value={format(totalDebts)} icon={CreditCard} variant="warning" />
        <StatCard title="Clients débiteurs" value={debtorsCount} icon={User} variant="default" />
        <StatCard title="Transactions non soldées" value={debts.length} icon={CreditCard} variant="destructive" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher par client ou référence..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead><TableHead>Type</TableHead><TableHead>Référence</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-center">Progression</TableHead><TableHead className="text-right">Reste à payer</TableHead><TableHead>Date</TableHead><TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune dette en cours</TableCell></TableRow>
              ) : (
                filteredDebts.map((debt) => {
                  const remaining = debt.totalAmount - debt.paidAmount;
                  const progress = debt.totalAmount > 0 ? (debt.paidAmount / debt.totalAmount) * 100 : 0;
                  return (
                    <TableRow key={`${debt.type}-${debt.id}`}>
                      <TableCell><div><p className="font-medium">{debt.customerName}</p>{debt.customerPhone && <p className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{debt.customerPhone}</p>}</div></TableCell>
                      <TableCell><Badge variant="secondary">{debt.type}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{debt.reference}</TableCell>
                      <TableCell className="text-right font-mono-numbers">{format(debt.totalAmount)}</TableCell>
                      <TableCell><div className="w-24 mx-auto"><Progress value={progress} className="h-2" /><p className="text-xs text-center text-muted-foreground mt-1">{progress.toFixed(0)}%</p></div></TableCell>
                      <TableCell className="text-right font-mono-numbers font-medium text-destructive">{format(remaining)}</TableCell>
                      <TableCell><div className="flex items-center gap-2 text-muted-foreground"><Calendar className="h-4 w-4" />{new Date(debt.createdAt).toLocaleDateString("fr-TN")}</div></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handlePayment(debt)}><Banknote className="h-4 w-4 mr-2" />Enregistrer paiement</DropdownMenuItem>
                            {debt.customerPhone && <DropdownMenuItem onClick={() => window.open(`tel:${debt.customerPhone}`)}><Phone className="h-4 w-4 mr-2" />Contacter client</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Enregistrer un paiement</DialogTitle></DialogHeader>
          {selectedDebt && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-muted">
                <p className="font-medium">{selectedDebt.customerName}</p>
                <p className="text-sm text-muted-foreground">{selectedDebt.reference}</p>
                <p className="text-sm mt-2">Reste à payer: <span className="text-destructive font-medium">{format(selectedDebt.totalAmount - selectedDebt.paidAmount)}</span></p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="payment">Montant du paiement</Label>
                <Input id="payment" type="number" step="0.001" min="0" max={(selectedDebt.totalAmount - selectedDebt.paidAmount) > 0 ? (selectedDebt.totalAmount - selectedDebt.paidAmount) : undefined} value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} placeholder="0.000" />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Annuler</Button>
                <Button onClick={submitPayment} disabled={updateCustomer.isPending || updateRepair.isPending || updateSale.isPending}>Enregistrer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
