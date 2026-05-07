import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RepairCard } from "@/components/repairs/RepairCard";
import { type RepairStatus } from "@/components/repairs/RepairStatusSelect";
import { CancelRepairDialog } from "@/components/repairs/CancelRepairDialog";
import { RepairReceiptDialog } from "@/components/repairs/RepairReceiptDialog";
import { StatusAssignDialog } from "@/components/repairs/StatusAssignDialog";
import { RepairDialog } from "@/components/repairs/RepairDialog";
import type { SelectedPart } from "@/components/repairs/RepairDialog";
import { PaymentConfirmDialog } from "@/components/repairs/PaymentConfirmDialog";
import {
  useRepairs,
  useRepairByTicketNumber,
  useCreateRepair,
  useUpdateRepair,
  useUpdateRepairStatus,
  useDeleteRepair,
  REPAIRS_PAGE_SIZE,
} from "@/hooks/useRepairs";
import { useAllCustomers, useUpdateCustomer } from "@/hooks/useCustomers";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { getShopInitials, formatTicketNumber } from "@/lib/utils";

// Type for the repair with customer relation
interface RepairWithCustomer {
  id: string;
  customer_id: string | null;
  category_id: string | null;
  device_model: string;
  problem_description: string;
  diagnosis: string | null;
  status: string;
  deposit_date: string;
  delivery_date: string | null;
  imei: string | null;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  amount_paid: number;
  notes: string | null;
  tracking_token?: string | null;
  ticket_number?: number | null;
  estimated_ready_date?: string | null;
  technician_note?: string | null;
  device_unlock_code?: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
  category?: { id: string; name: string } | null;
}

// Transform database repair to UI repair format
function transformRepair(dbRepair: RepairWithCustomer, shopInitials: string) {
  const ticketNum = dbRepair.ticket_number ?? null;
  return {
    id: dbRepair.id,
    customer_id: dbRepair.customer_id,
    category_id: dbRepair.category_id,
    category: dbRepair.category?.name || null,
    customer: dbRepair.customer?.name || "Client anonyme",
    phone: dbRepair.customer?.phone || "",
    device: dbRepair.device_model,
    imei: dbRepair.imei || undefined,
    issue: dbRepair.problem_description,
    diagnosis: dbRepair.diagnosis || undefined,
    status: dbRepair.status as RepairStatus,
    depositDate: dbRepair.deposit_date?.split("T")[0] || "",
    estimatedDate: undefined,
    deliveredDate: dbRepair.delivery_date?.split("T")[0],
    parts: [] as { name: string; cost: number }[],
    labor: Number(dbRepair.labor_cost) || 0,
    parts_cost: Number(dbRepair.parts_cost) || 0,
    total: Number(dbRepair.total_cost) || 0,
    paid: Number(dbRepair.amount_paid) || 0,
    notes: dbRepair.notes,
    is_warranty: (dbRepair as any).is_warranty || false,
    tracking_token: dbRepair.tracking_token || dbRepair.id,
    estimated_ready_date: dbRepair.estimated_ready_date || null,
    technician_note: dbRepair.technician_note || null,
    ticket_number: ticketNum,
    ticket_label: formatTicketNumber(shopInitials, ticketNum),
    device_unlock_code: (dbRepair as any).device_unlock_code || null,
    // Original data for editing
    _original: dbRepair,
  };
}

export default function Repairs() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [editingRepair, setEditingRepair] = useState<RepairWithCustomer | null>(null);
  
  // Payment confirmation state
  const [paymentConfirmOpen, setPaymentConfirmOpen] = useState(false);
  const [paymentConfirmRepair, setPaymentConfirmRepair] = useState<ReturnType<typeof transformRepair> | null>(null);
  const [pendingStatus, setPendingStatus] = useState<RepairStatus | null>(null);

  // Status assign dialog state
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignRepair, setAssignRepair] = useState<ReturnType<typeof transformRepair> | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const queryClient = useQueryClient();
  const { data: repairsResult = { data: [], count: 0 }, isLoading } = useRepairs(page);
  const rawRepairs = repairsResult.data;
  const totalCount = repairsResult.count;
  const totalPages = Math.ceil(totalCount / REPAIRS_PAGE_SIZE);

  const { data: customers = [] } = useAllCustomers();
  const createRepair = useCreateRepair();
  const updateRepair = useUpdateRepair();
  const updateStatus = useUpdateRepairStatus();
  const deleteRepair = useDeleteRepair();
  const updateCustomer = useUpdateCustomer();

  // Enable realtime updates for repairs
  useRealtimeSubscription({
    tables: ["repairs"],
    queryKeys: [["repairs"], ["recent-repairs"], ["dashboard-stats"]],
  });

  // Shop initials for ticket number labels
  const { settings } = useShopSettingsContext();
  const shopInitials = getShopInitials(settings.shop_name);

  // Numeric search → server-side lookup so a ticket number on another page is found
  const trimmed = searchQuery.trim();
  const numericSearch = /^\d+$/.test(trimmed) ? parseInt(trimmed, 10) : null;
  const { data: ticketHit } = useRepairByTicketNumber(numericSearch);

  // Transform repairs for UI
  const baseRepairs = (rawRepairs as unknown as RepairWithCustomer[]).map((r) => transformRepair(r, shopInitials));
  // Inject the server-side numeric hit if it's not already in the current page
  const repairs = (() => {
    if (!ticketHit) return baseRepairs;
    if (baseRepairs.some((r) => r.id === ticketHit.id)) return baseRepairs;
    return [transformRepair(ticketHit as unknown as RepairWithCustomer, shopInitials), ...baseRepairs];
  })();

  const selectedRepair = selectedRepairId
    ? repairs.find((r) => r.id === selectedRepairId) || null
    : null;

  const filteredRepairs = repairs.filter((repair) => {
    const q = searchQuery.toLowerCase();
    const ticketStr = repair.ticket_number ? String(repair.ticket_number) : "";
    const ticketLabel = (repair.ticket_label || "").toLowerCase();
    const matchesSearch =
      !q ||
      repair.customer.toLowerCase().includes(q) ||
      repair.device.toLowerCase().includes(q) ||
      repair.id.toLowerCase().includes(q) ||
      ticketStr.includes(trimmed) ||
      ticketLabel.includes(q) ||
      (repair.phone && repair.phone.toLowerCase().includes(q));
    const matchesTab = activeTab === "all" || activeTab === "warranty" ? true : repair.status === activeTab;
    const matchesWarranty = activeTab === "warranty" ? repair.is_warranty : true;
    return matchesSearch && matchesTab && matchesWarranty;
  });

  const getStatusCounts = () => ({
    all: repairs.length,
    pending: repairs.filter((r) => r.status === "pending").length,
    in_progress: repairs.filter((r) => r.status === "in_progress").length,
    completed: repairs.filter((r) => r.status === "completed").length,
    warranty: repairs.filter((r) => r.is_warranty).length,
  });

  const counts = getStatusCounts();

  const handleNewRepair = () => {
    setEditingRepair(null);
    setRepairDialogOpen(true);
  };

  const handleViewDetails = (repair: ReturnType<typeof transformRepair>) => {
    toast.info(`Affichage des détails`, {
      description: `Client: ${repair.customer} - ${repair.device}`,
    });
  };

  const handleEdit = (repair: ReturnType<typeof transformRepair>) => {
    setEditingRepair(repair._original);
    setRepairDialogOpen(true);
  };

  const handlePrint = (repair: ReturnType<typeof transformRepair>) => {
    setSelectedRepairId(repair.id);
    setReceiptDialogOpen(true);
  };

  const handleCancel = (repair: ReturnType<typeof transformRepair>) => {
    setSelectedRepairId(repair.id);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedRepairId) {
      deleteRepair.mutate(selectedRepairId, {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setSelectedRepairId(null);
        },
      });
    }
  };

  const handleStatusChange = (
    repair: ReturnType<typeof transformRepair>,
    newStatus: RepairStatus
  ) => {
    // If moving to in_progress, prompt for received_by / repaired_by
    if (newStatus === "in_progress") {
      setAssignRepair(repair);
      // Defer to let the DropdownMenu fully close before opening the dialog
      setTimeout(() => setAssignDialogOpen(true), 100);
      return;
    }

    // Check if moving to completed or delivered AND not fully paid
    const remaining = repair.total - repair.paid;
    
    if ((newStatus === "completed" || newStatus === "delivered") && remaining > 0) {
      setPaymentConfirmRepair(repair);
      setPendingStatus(newStatus);
      setPaymentConfirmOpen(true);
    } else {
      updateStatus.mutate(
        { id: repair.id, status: newStatus },
        {
          onSuccess: () => {
            const statusLabels: Record<RepairStatus, string> = {
              pending: "En attente",
              in_progress: "En cours",
              completed: "Terminé",
              delivered: "Livré",
            };
            toast.success(`Statut mis à jour`, {
              description: `→ ${statusLabels[newStatus]}`,
            });
          },
        }
      );
    }
  };

  const handleAssignConfirm = async (data: { received_by: string; repaired_by: string }) => {
    if (!assignRepair) return;
    try {
      await updateRepair.mutateAsync({
        id: assignRepair.id,
        received_by: data.received_by || null,
        repaired_by: data.repaired_by || null,
        status: "in_progress",
      });
      toast.success("Statut mis à jour", { description: "→ En cours" });
      setAssignDialogOpen(false);
      setAssignRepair(null);
    } catch {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handlePaymentConfirm = async (data: { paymentAmount: number; isFullPayment: boolean }) => {
    if (!paymentConfirmRepair || !pendingStatus) return;

    setIsProcessingPayment(true);
    
    try {
      const repair = paymentConfirmRepair;
      const remaining = repair.total - repair.paid;
      const newAmountPaid = repair.paid + data.paymentAmount;
      const debtAmount = remaining - data.paymentAmount;

      // 1. Update repair with new payment amount and status
      await updateRepair.mutateAsync({
        id: repair.id,
        amount_paid: newAmountPaid,
        status: pendingStatus,
        delivery_date: pendingStatus === "delivered" ? new Date().toISOString() : undefined,
      });

      // 2. If partial payment and customer exists, add debt to customer balance
      if (debtAmount > 0 && repair.customer_id) {
        const customer = customers.find((c) => c.id === repair.customer_id);
        if (customer) {
          await updateCustomer.mutateAsync({
            id: customer.id,
            balance: Number(customer.balance) + debtAmount,
          });
          toast.success("Dette enregistrée", {
            description: `${debtAmount.toFixed(3)} DT ajouté au solde de ${customer.name}`,
          });
        }
      }

      const statusLabels: Record<RepairStatus, string> = {
        pending: "En attente",
        in_progress: "En cours",
        completed: "Terminé",
        delivered: "Livré",
      };

      toast.success(`Réparation ${statusLabels[pendingStatus].toLowerCase()}`, {
        description: data.isFullPayment 
          ? "Paiement complet enregistré" 
          : `Paiement de ${data.paymentAmount.toFixed(3)} DT enregistré`,
      });

      // Reset state
      setPaymentConfirmOpen(false);
      setPaymentConfirmRepair(null);
      setPendingStatus(null);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Erreur lors du traitement du paiement");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handleRepairSubmit = async (data: {
    customer_id?: string;
    category_id?: string;
    device_model: string;
    imei?: string;
    problem_description: string;
    diagnosis?: string;
    labor_cost: number;
    parts_cost: number;
    total_cost: number;
    amount_paid: number;
    notes?: string;
    estimated_ready_date?: string;
    technician_note?: string;
    received_by?: string;
    repaired_by?: string;
    device_condition?: string;
    device_unlock_code?: string;
  }, selectedParts: SelectedPart[] = []) => {
    const repairData = {
      customer_id: data.customer_id || null,
      category_id: data.category_id || null,
      device_model: data.device_model,
      imei: data.imei || null,
      problem_description: data.problem_description,
      diagnosis: data.diagnosis || null,
      labor_cost: data.labor_cost,
      parts_cost: data.parts_cost,
      total_cost: data.total_cost,
      amount_paid: data.amount_paid,
      notes: data.notes || null,
      estimated_ready_date: data.estimated_ready_date || null,
      technician_note: data.technician_note || null,
      received_by: data.received_by || null,
      repaired_by: data.repaired_by || null,
      device_condition: data.device_condition || null,
      device_unlock_code: data.device_unlock_code || null,
    };

    let repairId: string;

    if (editingRepair) {
      await updateRepair.mutateAsync({ id: editingRepair.id, ...repairData });
      repairId = editingRepair.id;
    } else {
      const created = await createRepair.mutateAsync(repairData);
      repairId = created.id;
    }

    // Insert repair_parts and deduct stock
    if (selectedParts.length > 0) {
      const partsToInsert = selectedParts.map((p) => ({
        repair_id: repairId,
        product_id: p.product_id,
        quantity: p.quantity,
        unit_price: p.unit_price,
      }));

      const { error: partsError } = await supabase.from("repair_parts").insert(partsToInsert);
      if (partsError) {
        console.error("Error inserting repair parts:", partsError);
        toast.error("Erreur lors de l'ajout des pièces");
      }

      // Deduct stock from inventory
      for (const part of selectedParts) {
        const { error: stockError } = await supabase.rpc("update_product_stock_deduct" as any, {
          p_product_id: part.product_id,
          p_quantity: part.quantity,
        });
        
        // Fallback: direct update if RPC doesn't exist
        if (stockError) {
          const { data: product } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", part.product_id)
            .single();
          
          if (product) {
            await supabase
              .from("products")
              .update({ quantity: Math.max(0, product.quantity - part.quantity), updated_at: new Date().toISOString() })
              .eq("id", part.product_id);
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
    }

    setRepairDialogOpen(false);
    setEditingRepair(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Gestion des Réparations"
          description="Suivi et gestion des fiches de réparation"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Réparations"
        description={
          totalCount > 0
            ? `Affichage de ${(page * REPAIRS_PAGE_SIZE) + 1}–${Math.min((page + 1) * REPAIRS_PAGE_SIZE, totalCount)} sur ${totalCount} réparation${totalCount > 1 ? "s" : ""} (incluant les dettes)`
            : "Suivi et gestion des fiches de réparation"
        }
      >
        <Button
          className="bg-gradient-primary hover:opacity-90"
          onClick={handleNewRepair}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réparation
        </Button>
      </PageHeader>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, téléphone, appareil ou N° réparation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
        </Button>
      </div>

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">En cours ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Terminées ({counts.completed})</TabsTrigger>
          {counts.warranty > 0 && (
            <TabsTrigger value="warranty" className="text-orange-500">
              Garantie ({counts.warranty})
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRepairs.map((repair) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onPrint={handlePrint}
                onCancel={handleCancel}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>

          {filteredRepairs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              {repairs.length === 0
                ? "Aucune réparation enregistrée. Cliquez sur 'Nouvelle réparation' pour commencer."
                : "Aucune réparation trouvée"}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
              <span className="text-sm text-muted-foreground">
                Page {page + 1} / {totalPages} — {totalCount} réparation{totalCount > 1 ? "s" : ""} au total
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Précédent
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Suivant
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CancelRepairDialog
        repair={selectedRepair}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={confirmCancel}
      />

      <RepairReceiptDialog
        repair={selectedRepair}
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
      />

      <RepairDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        repair={editingRepair}
        onSubmit={handleRepairSubmit}
        isLoading={createRepair.isPending || updateRepair.isPending}
      />

      <PaymentConfirmDialog
        open={paymentConfirmOpen}
        onOpenChange={setPaymentConfirmOpen}
        repair={paymentConfirmRepair}
        pendingStatus={pendingStatus}
        onConfirm={handlePaymentConfirm}
        isLoading={isProcessingPayment}
      />

      <StatusAssignDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onConfirm={handleAssignConfirm}
        isLoading={updateRepair.isPending}
      />
    </div>
  );
}
