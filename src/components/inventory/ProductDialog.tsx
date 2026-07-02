import { useEffect, useMemo, useCallback } from "react";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Loader2 } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  sku: z.string().optional(),
  description: z.string().optional(),
  category_id: z.string().optional(),
  cost_price: z.coerce.number().min(0, "Le prix doit être positif"),
  sell_price: z.coerce.number().min(0, "Le prix doit être positif"),
  quantity: z.coerce.number().int().min(0, "La quantité doit être positive"),
  min_quantity: z.coerce.number().int().min(0, "Le seuil doit être positif"),
});

type ProductFormValues = z.infer<typeof productSchema>;

interface ProductDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    description?: string | null;
    category_id?: string | null;
    cost_price: number;
    sell_price: number;
    quantity: number;
    min_quantity: number;
  } | null;
  onSubmit: (data: ProductFormValues) => Promise<void>;
  isLoading?: boolean;
}

export function ProductDialog({
  open,
  onOpenChange,
  product,
  onSubmit,
  isLoading,
}: ProductDialogProps) {
  const isEditing = !!product;
  const { currencyCode } = useCurrency();
  const { data: productCategories = [] } = useCategories("product");
  const categoryOptions = useMemo(
    () => productCategories.map((c) => ({ value: c.id, label: c.name })),
    [productCategories]
  );

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category_id: "",
      cost_price: 0,
      sell_price: 0,
      quantity: 0,
      min_quantity: 5,
    },
  });

  const defaultDraftValues = {
    name: "", sku: "", description: "", category_id: "",
    cost_price: 0, sell_price: 0, quantity: 0, min_quantity: 5,
  };

  const { clearDraft } = useFormDraft("product", {
    watch: form.getValues.bind(form),
    reset: (values) => form.reset(values),
    isOpen: open && !product,
    defaultValues: defaultDraftValues,
  });

  useEffect(() => {
    if (product) {
      form.reset({
        name: product.name,
        sku: product.sku || "",
        description: product.description || "",
        category_id: product.category_id || "",
        cost_price: Number(product.cost_price) || 0,
        sell_price: Number(product.sell_price) || 0,
        quantity: product.quantity || 0,
        min_quantity: product.min_quantity || 5,
      });
    } else {
      form.reset({
        name: "",
        sku: "",
        description: "",
        category_id: "",
        cost_price: 0,
        sell_price: 0,
        quantity: 0,
        min_quantity: 5,
      });
    }
  }, [product, form]);

  const handleSubmit = async (data: ProductFormValues) => {
    await onSubmit(data);
    clearDraft();
    form.reset();
  };

  const costPrice = form.watch("cost_price") || 0;
  const sellPrice = form.watch("sell_price") || 0;
  const margin = costPrice > 0 ? ((sellPrice - costPrice) / costPrice) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier le produit" : "Nouveau produit"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom du produit *</FormLabel>
                  <FormControl>
                    <Input placeholder="Écran iPhone 13" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* SKU */}
            <FormField
              control={form.control}
              name="sku"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>SKU / Référence</FormLabel>
                  <FormControl>
                    <Input placeholder="IP13-SCR-001" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            {categoryOptions.length > 0 && (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie</FormLabel>
                    <FormControl>
                      <Combobox
                        options={categoryOptions}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder="Sélectionner catégorie"
                        searchPlaceholder="Rechercher catégorie..."
                        emptyText="Aucune catégorie"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description du produit..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix d'achat ({currencyCode})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="sell_price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prix de vente ({currencyCode})</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Margin Display */}
            {costPrice > 0 && (
              <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium">Marge:</span>
                <span className={`text-lg font-bold ${margin > 0 ? 'text-success' : 'text-destructive'}`}>
                  {margin > 0 ? '+' : ''}{margin.toFixed(1)}%
                </span>
              </div>
            )}

            {/* Stock */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantité en stock</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seuil d'alerte</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer le produit"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
