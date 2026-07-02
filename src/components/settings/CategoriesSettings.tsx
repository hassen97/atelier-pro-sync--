import { useState } from "react";
import { Plus, Trash2, RefreshCw, Loader2, Tag } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
  useSubcategories,
  useCreateSubcategory,
  useDeleteSubcategory,
} from "@/hooks/useCategories";

type Subcategory = { id: string; name: string; category_id: string };

function SubcategoryList({ categoryId }: { categoryId: string }) {
  const { data: allSubcategories = [], isLoading } = useSubcategories();
  const createSubcategory = useCreateSubcategory();
  const deleteSubcategory = useDeleteSubcategory();
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const subcategories = (allSubcategories as Subcategory[]).filter(
    (s) => s.category_id === categoryId,
  );

  const handleAdd = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createSubcategory.mutate(
      { name: trimmed, categoryId },
      { onSuccess: () => setNewName("") },
    );
  };

  return (
    <div className="ml-3 border-l-2 border-border pl-3 space-y-2">
      {isLoading ? (
        <div className="flex items-center py-2">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : subcategories.length === 0 ? (
        <p className="text-xs text-muted-foreground py-1">Aucune sous-catégorie.</p>
      ) : (
        <div className="space-y-1">
          {subcategories.map((sub) => (
            <div
              key={sub.id}
              className="flex items-center justify-between py-1 px-2 rounded-md bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <span className="text-sm">{sub.name}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => setDeleteTarget({ id: sub.id, name: sub.name })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder="Nouvelle sous-catégorie..."
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 h-8"
          onClick={handleAdd}
          disabled={!newName.trim() || createSubcategory.isPending}
        >
          {createSubcategory.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-3.5 w-3.5 mr-1" />
          )}
          Ajouter
        </Button>
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la sous-catégorie</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer « {deleteTarget?.name} » ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) deleteSubcategory.mutate(deleteTarget.id);
                setDeleteTarget(null);
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

function CategorySection({
  title,
  description,
  type,
  nested = false,
}: {
  title: string;
  description: string;
  type: "repair" | "product";
  nested?: boolean;
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
        ) : nested ? (
          <Accordion type="multiple" className="w-full">
            {categories.map((cat) => (
              <AccordionItem key={cat.id} value={cat.id}>
                <div className="flex items-center">
                  <AccordionTrigger className="flex-1 py-2.5 text-sm hover:no-underline">
                    {cat.name}
                  </AccordionTrigger>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget({ id: cat.id, name: cat.name });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <AccordionContent>
                  <SubcategoryList categoryId={cat.id} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
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
                {nested
                  ? "La suppression de cette catégorie supprimera également toutes ses sous-catégories. Continuer ?"
                  : `Êtes-vous sûr de vouloir supprimer « ${deleteTarget?.name} » ? Les éléments associés seront marqués comme « Non classé ».`}
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
        nested
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
