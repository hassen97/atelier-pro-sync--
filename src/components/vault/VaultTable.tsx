import { useMemo, useState } from "react";
import { Copy, Download, Eye, EyeOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useDeleteVaultEntry, useVaultEntries, type VaultEntry } from "@/hooks/useCustomerVault";
import { toast } from "sonner";

const TYPE_LABELS: Record<string, string> = {
  icloud: "iCloud",
  google: "Google",
  samsung: "Samsung",
};

interface VaultTableProps {
  search: string;
  onSearchChange: (v: string) => void;
  onEdit: (entry: VaultEntry) => void;
}

export function VaultTable({ search, onSearchChange, onEdit }: VaultTableProps) {
  const { data: entries = [], isLoading } = useVaultEntries();
  const deleteEntry = useDeleteVaultEntry();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [confirmDelete, setConfirmDelete] = useState<VaultEntry | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((e) => {
      const name = e.customers?.name?.toLowerCase() ?? "";
      const phone = e.customers?.phone?.toLowerCase() ?? "";
      const email = e.email_id.toLowerCase();
      const type = e.account_type.toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q) || type.includes(q);
    });
  }, [entries, search]);

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copié`);
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const exportCsv = () => {
    if (!filtered.length) {
      toast.error("Aucune donnée à exporter");
      return;
    }
    const headers = ["Client", "Téléphone", "Type", "Email/ID", "Mot de passe", "Créé le"];
    const rows = filtered.map((e) => [
      e.customers?.name ?? "",
      e.customers?.phone ?? "",
      TYPE_LABELS[e.account_type] ?? e.account_type,
      e.email_id,
      e.password,
      new Date(e.created_at).toLocaleString("fr-FR"),
    ]);
    const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
    const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `coffre-fort-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export CSV téléchargé");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
        <Input
          placeholder="Rechercher (client, email, type)..."
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="sm:max-w-sm"
        />
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-2" />
          Exporter CSV
        </Button>
      </div>

      <div className="rounded-md border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Email / ID</TableHead>
              <TableHead>Mot de passe</TableHead>
              <TableHead>Créé le</TableHead>
              <TableHead className="w-10"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Aucune entrée. Cliquez sur « Nouveau compte » pour commencer.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((entry) => {
                const isRevealed = !!revealed[entry.id];
                return (
                  <TableRow key={entry.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {entry.customers?.name ?? "Client supprimé"}
                        </span>
                        {entry.customers?.phone && (
                          <span className="text-xs text-muted-foreground">
                            {entry.customers.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {TYPE_LABELS[entry.account_type] ?? entry.account_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <span className="truncate max-w-[180px]">{entry.email_id}</span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copy(entry.email_id, "Email")}
                          aria-label="Copier l'email"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-1">
                        <span className="min-w-[80px]">
                          {isRevealed ? entry.password : "••••••••"}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() =>
                            setRevealed((r) => ({ ...r, [entry.id]: !r[entry.id] }))
                          }
                          aria-label={isRevealed ? "Masquer" : "Afficher"}
                        >
                          {isRevealed ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copy(entry.password, "Mot de passe")}
                          aria-label="Copier le mot de passe"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label="Actions sur l'entrée"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(entry)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setConfirmDelete(entry)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette entrée ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. L'identifiant et le mot de passe seront supprimés
              définitivement.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) deleteEntry.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
