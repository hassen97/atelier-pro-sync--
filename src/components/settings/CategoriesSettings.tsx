import { useState } from "react";
import { Plus, Trash2, RefreshCw, Loader2, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useSeedDefaultCategories,
} from "@/hooks/useCategories";

function CategorySection({
  title,
  description,
  type,
}: {
  title: string;
  description: string;
  type: "repair" | "product";
}) {
  const { data: categories = [], isLoading } = useCategories(type);
  const createCategory = useCreateCategory();
  const deleteCategory = useDeleteCategory();
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createCategory.mutate({ name: trimmed, type }, { onSuccess: () => setNewName("") });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Tag className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">
            Aucune catégorie. Ajoutez-en ou réinitialisez les valeurs par défaut.
          </p>
        ) : (
          <div className="space-y-1">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="flex items-center justify-between py-1.5 px-3 rounded-md hover:bg-muted/50 transition-colors"
              >
                <span className="text-sm">{cat.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <Separator />

        <div className="flex gap-2">
          <Input
            placeholder="Nouvelle catégorie..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="h-9"
          />
          <Button
            size="sm"
            className="shrink-0 h-9"
            onClick={handleAdd}
            disabled={!newName.trim() || createCategory.isPending}
          >
            {createCategory.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-1" />
            )}
            Ajouter
          </Button>
        </div>

        {/* Delete confirmation */}
        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la catégorie</AlertDialogTitle>
              <AlertDialogDescription>
                Êtes-vous sûr de vouloir supprimer « {deleteTarget?.name} » ? Les éléments associés
                seront marqués comme « Non classé ».
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (deleteTarget) deleteCategory.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }}
              >
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}

export function CategoriesSettings() {
  const seedCategories = useSeedDefaultCategories();

  return (
    <div className="space-y-6">
      <CategorySection
        title="Catégories de réparation"
        description="Utilisées dans le formulaire de réparation"
        type="repair"
      />
      <CategorySection
        title="Catégories de stock"
        description="Utilisées dans le formulaire de produit et le POS"
        type="product"
      />

      <div className="flex justify-center">
        <Button
          variant="outline"
          onClick={() => seedCategories.mutate()}
          disabled={seedCategories.isPending}
        >
          {seedCategories.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Réinitialiser les catégories par défaut
        </Button>
      </div>
    </div>
  );
}
