import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { KeyRound, Trash2, Search } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { ShopOwner } from "@/hooks/useAdmin";
import { useDeleteOwner } from "@/hooks/useAdmin";
import { ResetPasswordDialog } from "./ResetPasswordDialog";

interface ShopOwnersListProps {
  owners: ShopOwner[];
}

export function ShopOwnersList({ owners }: ShopOwnersListProps) {
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<ShopOwner | null>(null);
  const [resetTarget, setResetTarget] = useState<ShopOwner | null>(null);
  const deleteOwner = useDeleteOwner();

  const filtered = owners.filter(
    (o) =>
      (o.full_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (o.username || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher un propriétaire..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Username</TableHead>
              <TableHead>Inscription</TableHead>
              <TableHead className="text-center">Employés</TableHead>
              <TableHead className="text-center">Réparations</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Aucun propriétaire trouvé
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((owner) => (
                <TableRow key={owner.user_id}>
                  <TableCell className="font-medium">{owner.full_name || "—"}</TableCell>
                  <TableCell>{owner.username || "—"}</TableCell>
                  <TableCell>{format(new Date(owner.created_at), "dd MMM yyyy", { locale: fr })}</TableCell>
                  <TableCell className="text-center">{owner.team_count}</TableCell>
                  <TableCell className="text-center">{owner.repair_count}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button size="icon" variant="ghost" onClick={() => setResetTarget(owner)} title="Réinitialiser le mot de passe">
                      <KeyRound className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => setDeleteTarget(owner)} title="Supprimer">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer {deleteTarget?.full_name} ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Toutes les données de ce propriétaire seront supprimées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteOwner.mutate(deleteTarget.user_id);
                  setDeleteTarget(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={() => setResetTarget(null)}
          userId={resetTarget.user_id}
          userName={resetTarget.full_name || "ce propriétaire"}
        />
      )}
    </div>
  );
}
