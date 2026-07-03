import { useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  CreditCard,
  MoreHorizontal,
  MapPin,
  Banknote,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useSuppliers, useDeleteSupplier, Supplier } from "@/hooks/useSuppliers";
import { SupplierDialog } from "@/components/suppliers/SupplierDialog";
import { SupplierPaymentDialog } from "@/components/suppliers/SupplierPaymentDialog";
import { SupplierDetailSheet } from "@/components/suppliers/SupplierDetailSheet";

function cleanPhone(phone: string): string {
  return phone.replace(/\s+/g, "").replace(/^00/, "+");
}

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  const { data: suppliers = [], isLoading } = useSuppliers();
  const deleteSupplier = useDeleteSupplier();
  const { format } = useCurrency();

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSuppliers = suppliers.length;
  const totalDebts = suppliers.reduce(
    (sum, s) => sum + Math.abs(Math.min(0, Number(s.balance))),
    0
  );
  const suppliersWithDebts = suppliers.filter((s) => Number(s.balance) < 0).length;

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
    setDetailSheetOpen(false);
  };

  const handlePayment = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setPaymentDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const handleOpenDetail = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDetailSheetOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedSupplier) {
      await deleteSupplier.mutateAsync(selectedSupplier.id);
      setDeleteDialogOpen(false);
      setSelectedSupplier(null);
    }
  };

  const handleNewSupplier = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Fournisseurs"
        description="Fiches fournisseurs, dettes et historique"
      >
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewSupplier}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total fournisseurs" value={totalSuppliers} icon={Building} variant="default" />
        <StatCard title="Fournisseurs à payer" value={suppliersWithDebts} icon={CreditCard} variant="warning" />
        <StatCard title="Total dettes" value={format(totalDebts)} icon={CreditCard} variant="destructive" />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-soft transition-shadow">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <button
                  className="flex items-center gap-3 text-left group flex-1 min-w-0"
                  onClick={() => handleOpenDetail(supplier)}
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarFallback className="bg-accent/10 text-accent font-medium">
                      {getInitials(supplier.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold group-hover:text-primary transition-colors flex items-center gap-1">
                      {supplier.name}
                      <ChevronRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    {supplier.notes && (
                      <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {supplier.notes}
                      </p>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 ml-2 shrink-0">
                  {/* Quick WhatsApp */}
                  {supplier.phone && (
                    <a
                      href={`https://wa.me/${cleanPhone(supplier.phone)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-[hsl(142,70%,45%)]">
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  {/* Quick Call */}
                  {supplier.phone && (
                    <a href={`tel:${cleanPhone(supplier.phone)}`} onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDetail(supplier)}>
                        Voir détails
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEdit(supplier)}>
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handlePayment(supplier)}>
                        <Banknote className="h-4 w-4 mr-2" />
                        Enregistrer paiement
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDelete(supplier)}
                      >
                        Supprimer
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                {supplier.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {supplier.phone}
                  </div>
                )}
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Solde</span>
                <Badge
                  className={cn(
                    Number(supplier.balance) < 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {Number(supplier.balance) < 0
                    ? `À payer: ${format(Math.abs(Number(supplier.balance)))}`
                    : "Soldé"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "Aucun fournisseur trouvé" : "Aucun fournisseur. Ajoutez-en un !"}
        </div>
      )}

      {/* Dialogs */}
      <SupplierDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
      />

      <SupplierPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        supplier={selectedSupplier}
      />

      <SupplierDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        supplier={selectedSupplier}
        onEdit={handleEdit}
        onPayment={handlePayment}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer le fournisseur ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le fournisseur "{selectedSupplier?.name}" sera définitivement supprimé.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
