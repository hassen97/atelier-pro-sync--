import { useState } from "react";
import {
  Search,
  Plus,
  Receipt,
  Calendar,
  Building,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import {
  useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, type ExpenseWithSupplier,
} from "@/hooks/useExpenses";
import { ExpenseDialog } from "@/components/expenses/ExpenseDialog";
import { useExpenseCategories } from "@/hooks/useExpenseCategories";

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithSupplier | null>(null);

  const { data: expenses = [], isLoading } = useExpenses();
  const { data: expenseCategories = [] } = useExpenseCategories();
  const createExpense = useCreateExpense();
  const updateExpense = useUpdateExpense();
  const deleteExpense = useDeleteExpense();
  const { format } = useCurrency();

  const allCategories = ["Toutes", ...expenseCategories];

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchQuery.toLowerCase()) || expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Toutes" || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  const stockExpenses = expenses.filter((e) => e.category === "Stock").reduce((sum, e) => sum + Number(e.amount), 0);
  const fixedExpenses = expenses.filter((e) => ["Loyer", "Électricité", "Télécom"].includes(e.category)).reduce((sum, e) => sum + Number(e.amount), 0);

  const handleCreate = () => { setEditingExpense(null); setDialogOpen(true); };
  const handleEdit = (expense: ExpenseWithSupplier) => { setEditingExpense(expense); setDialogOpen(true); };
  const handleDelete = (id: string) => { if (confirm("Êtes-vous sûr de vouloir supprimer cette dépense ?")) deleteExpense.mutate(id); };

  const handleSubmit = async (data: { expense_date: string; category: string; description?: string; amount: number }) => {
    if (editingExpense) { await updateExpense.mutateAsync({ id: editingExpense.id, ...data }); }
    else { await createExpense.mutateAsync(data); }
    setDialogOpen(false); setEditingExpense(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion des Dépenses" description="Suivi des dépenses fixes et variables" />
        <div className="grid gap-4 sm:grid-cols-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestion des Dépenses" description="Suivi des dépenses fixes et variables">
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleCreate}><Plus className="h-4 w-4 mr-2" />Nouvelle dépense</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total dépenses (mois)" value={format(totalExpenses)} icon={Receipt} variant="destructive" />
        <StatCard title="Achats stock" value={format(stockExpenses)} icon={Receipt} variant="accent" />
        <StatCard title="Charges fixes" value={format(fixedExpenses)} icon={Receipt} variant="warning" />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Rechercher une dépense..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
          <SelectContent>{allCategories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead><TableHead>Description</TableHead><TableHead>Catégorie</TableHead><TableHead>Fournisseur</TableHead><TableHead className="text-right">Montant</TableHead><TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{expenses.length === 0 ? "Aucune dépense enregistrée. Cliquez sur 'Nouvelle dépense' pour commencer." : "Aucune dépense trouvée"}</TableCell></TableRow>
              ) : (
                filteredExpenses.map((expense) => (
                  <TableRow key={expense.id}>
                    <TableCell className="text-muted-foreground"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{new Date(expense.expense_date).toLocaleDateString("fr-TN")}</div></TableCell>
                    <TableCell className="font-medium">{expense.description || "—"}</TableCell>
                    <TableCell><Badge variant="secondary">{expense.category}</Badge></TableCell>
                    <TableCell>{expense.supplier ? <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" /><span>{expense.supplier.name}</span></div> : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right font-mono-numbers font-medium text-destructive">-{format(expense.amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(expense)}>Modifier</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(expense.id)}>Supprimer</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} expense={editingExpense} onSubmit={handleSubmit} isLoading={createExpense.isPending || updateExpense.isPending} />
    </div>
  );
}
