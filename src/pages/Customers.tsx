import { useState } from "react";
import { Search, Plus, Phone, Mail, User, CreditCard, MoreHorizontal, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useCustomers, useAllCustomers, useCreateCustomer, useUpdateCustomer, useDeleteCustomer, type Customer } from "@/hooks/useCustomers";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { CustomerDossierDialog } from "@/components/customers/CustomerDossierDialog";

const CUSTOMERS_PAGE_SIZE = 50;

export default function Customers() {
  const [page, setPage] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [dossierCustomer, setDossierCustomer] = useState<Customer | null>(null);

  const { data: customersResult, isLoading } = useCustomers(page);
  const customers: Customer[] = customersResult?.data ?? [];
  const totalCount = customersResult?.count ?? 0;
  const totalPages = Math.ceil(totalCount / CUSTOMERS_PAGE_SIZE);
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const deleteCustomer = useDeleteCustomer();
  const { format } = useCurrency();

  // For stat cards: use all customers (lightweight, cached) for accurate totals
  const { data: allCustomers = [] } = useAllCustomers();
  const filteredCustomers = customers.filter((customer) => customer.name.toLowerCase().includes(searchQuery.toLowerCase()) || (customer.phone?.includes(searchQuery) ?? false));
  const totalDebts = allCustomers.reduce((sum, c) => sum + Math.max(0, Number(c.balance) || 0), 0);
  const customersWithDebts = allCustomers.filter((c) => Number(c.balance) > 0).length;

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const handleCreate = () => { setEditingCustomer(null); setDialogOpen(true); };
  const handleEdit = (customer: Customer) => { setEditingCustomer(customer); setDialogOpen(true); };
  const handleDelete = (id: string, name: string) => { if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} ?`)) deleteCustomer.mutate(id); };

  const handleSubmit = async (data: { name: string; phone?: string; email?: string; address?: string; notes?: string }) => {
    if (editingCustomer) await updateCustomer.mutateAsync({ id: editingCustomer.id, ...data });
    else await createCustomer.mutateAsync(data);
    setDialogOpen(false); setEditingCustomer(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion des Clients" description="Fiches clients et historique" />
        <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-48" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestion des Clients" description="Fiches clients et historique">
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />Nouveau client</Button>
      </PageHeader>

      <h2 className="sr-only">Statistiques clients</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total clients" value={totalCount} icon={User} variant="default" />
        <StatCard title="Clients avec crédit" value={customersWithDebts} icon={CreditCard} variant="warning" />
        <StatCard title="Total créances" value={format(totalDebts)} icon={CreditCard} variant="destructive" />
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par nom ou téléphone..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 max-w-md" />
      </div>

      <h2 className="sr-only">Liste des clients</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-soft transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary/10 text-primary font-medium">{getInitials(customer.name)}</AvatarFallback></Avatar>
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    {customer.phone && <p className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</p>}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Actions sur le client"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDossierCustomer(customer)}>
                      <Eye className="h-3.5 w-3.5 mr-2" />Voir dossier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleEdit(customer)}>Modifier</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(customer.id, customer.name)}>Supprimer</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              {customer.email && <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3"><Mail className="h-3 w-3" /><span className="truncate">{customer.email}</span></div>}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Solde</span>
                <Badge className={cn(Number(customer.balance) < 0 ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-success/10 text-success border-success/20")}>
                  {Number(customer.balance) < 0 ? `Doit: ${format(Math.abs(Number(customer.balance)))}` : "À jour"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && !isLoading && <div className="text-center py-12 text-muted-foreground">{customers.length === 0 ? "Aucun client enregistré. Cliquez sur 'Nouveau client' pour commencer." : "Aucun client trouvé"}</div>}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages} — {totalCount} client{totalCount > 1 ? "s" : ""} au total
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0}>
              <ChevronLeft className="h-4 w-4 mr-1" />Précédent
            </Button>
            <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}>
              Suivant<ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      <CustomerDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={editingCustomer} onSubmit={handleSubmit} isLoading={createCustomer.isPending || updateCustomer.isPending} />
      <CustomerDossierDialog customer={dossierCustomer} open={!!dossierCustomer} onOpenChange={(open) => !open && setDossierCustomer(null)} />
    </div>
  );
}
