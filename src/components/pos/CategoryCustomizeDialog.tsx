import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Check, RotateCcw } from "lucide-react";
import { CATEGORY_COLORS } from "@/lib/categoryColors";
import {
  useUpsertCategoryPreference,
  useResetCategoryPreference,
  type CategoryKind,
  type TextSize,
} from "@/hooks/useCategoryPreferences";
import { toast } from "sonner";

interface CategoryCustomizeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: {
    id: string;
    name: string;
    kind: CategoryKind;
    bg_color: string | null;
    text_size: TextSize | null;
  } | null;
}

export function CategoryCustomizeDialog({ open, onOpenChange, category }: CategoryCustomizeDialogProps) {
  const [color, setColor] = useState<string | null>(null);
  const [size, setSize] = useState<TextSize>("normal");
  const upsert = useUpsertCategoryPreference();
  const reset = useResetCategoryPreference();

  useEffect(() => {
    if (category) {
      setColor(category.bg_color);
      setSize(category.text_size ?? "normal");
    }
  }, [category]);

  if (!category) return null;

  const handleSave = async () => {
    try {
      await upsert.mutateAsync({
        category_id: category.id,
        category_kind: category.kind,
        bg_color: color,
        text_size: size,
      });
      toast.success("Personnalisation enregistrée");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de l'enregistrement");
    }
  };

  const handleReset = async () => {
    try {
      await reset.mutateAsync(category.id);
      toast.success("Réinitialisé");
      onOpenChange(false);
    } catch {
      toast.error("Erreur lors de la réinitialisation");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Personnaliser « {category.name} »</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Couleur de fond</Label>
            <div className="grid grid-cols-5 gap-2">
              <button
                type="button"
                onClick={() => setColor(null)}
                className={cn(
                  "h-10 rounded-md border-2 flex items-center justify-center bg-background text-xs text-muted-foreground transition-all",
                  color === null ? "border-primary" : "border-border",
                )}
                aria-label="Défaut"
              >
                {color === null && <Check className="h-4 w-4 text-primary" />}
                {color !== null && "Déf."}
              </button>
              {CATEGORY_COLORS.map((c) => (
                <button
                  key={c.token}
                  type="button"
                  onClick={() => setColor(c.token)}
                  className={cn(
                    "h-10 rounded-md border-2 flex items-center justify-center transition-all",
                    c.swatch,
                    color === c.token ? "border-foreground ring-2 ring-offset-2 ring-offset-background ring-foreground/40" : "border-transparent",
                  )}
                  aria-label={c.label}
                >
                  {color === c.token && <Check className="h-4 w-4 text-white" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Taille du texte</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={size === "normal" ? "default" : "outline"}
                className="flex-1"
                onClick={() => setSize("normal")}
              >
                Normal
              </Button>
              <Button
                type="button"
                variant={size === "large" ? "default" : "outline"}
                className="flex-1 text-base"
                onClick={() => setSize("large")}
              >
                Grand
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="ghost" onClick={handleReset} disabled={reset.isPending} className="mr-auto">
            <RotateCcw className="h-4 w-4 mr-1.5" />
            Réinitialiser
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={upsert.isPending}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
