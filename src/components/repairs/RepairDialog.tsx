import { useEffect, useState, useMemo, useCallback } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, X, Plus, Trash2, Package, CalendarIcon, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format as formatDate } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { useAllCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { Combobox } from "@/components/ui/combobox";
import { PHONE_BRANDS, PHONE_MODELS, getBrandLabel, BRANDS_WITH_API } from "@/data/phoneModels";
import { useAppleDevices } from "@/hooks/useAppleDevices";
import { useCategories } from "@/hooks/useCategories";
import { useCurrency } from "@/hooks/useCurrency";
import { useAllProducts } from "@/hooks/useProducts";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";

export interface SelectedPart {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
}

const repairSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  category_id: z.string().optional(),
  device_brand: z.string().optional(),
  device_model: z.string().min(1, "Le modèle est requis"),
  imei: z.string().optional(),
  problem_description: z.string().optional().default(""),
  diagnosis: z.string().optional(),
  labor_cost: z.coerce.number().min(0, "Le coût doit être positif"),
  parts_cost: z.coerce.number().min(0, "Le coût doit être positif"),
  total_cost: z.coerce.number().min(0, "Le prix total doit être positif"),
  amount_paid: z.coerce.number().min(0, "Le montant doit être positif"),
  notes: z.string().optional(),
  estimated_ready_date: z.string().optional(),
  technician_note: z.string().optional(),
  received_by: z.string().optional(),
  repaired_by: z.string().optional(),
  device_condition: z.string().optional(),
}).refine((data) => data.amount_paid <= data.total_cost, {
  message: "L'avance ne peut pas dépasser le prix total",
  path: ["amount_paid"],
});

type RepairFormValues = z.infer<typeof repairSchema>;

interface RepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair?: {
    id: string;
    customer_id?: string | null;
    category_id?: string | null;
    device_model: string;
    imei?: string | null;
    problem_description: string;
    diagnosis?: string | null;
    labor_cost: number;
    parts_cost: number;
    total_cost: number;
    amount_paid: number;
    notes?: string | null;
    estimated_ready_date?: string | null;
    technician_note?: string | null;
    received_by?: string | null;
    repaired_by?: string | null;
    device_condition?: string | null;
  } | null;
  onSubmit: (data: RepairFormValues, selectedParts: SelectedPart[]) => Promise<void>;
  isLoading?: boolean;
}

// Helper function to parse device_model into brand and model
function parseDeviceModel(deviceModel: string): { brand: string; model: string } {
  // Try to find a matching brand at the start of the string
  for (const brand of PHONE_BRANDS) {
    if (deviceModel.toLowerCase().startsWith(brand.label.toLowerCase() + " ")) {
      return {
        brand: brand.value,
        model: deviceModel.substring(brand.label.length + 1),
      };
    }
  }
  // If no brand found, return empty brand and full string as model
  return { brand: "", model: deviceModel };
}

export function RepairDialog({
  open,
  onOpenChange,
  repair,
  onSubmit,
  isLoading,
}: RepairDialogProps) {
  const isEditing = !!repair;
  const { format } = useCurrency();
  const { data: customers = [] } = useAllCustomers();
  const createCustomer = useCreateCustomer();
  const { data: appleDevices = [], isLoading: isLoadingApple } = useAppleDevices();
  const { data: repairCategories = [] } = useCategories("repair");
  const { data: products = [] } = useAllProducts();
  const { isEmployee } = useInventoryAccess();

  const categoryOptions = repairCategories.map((c) => ({ value: c.id, label: c.name }));
  
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  const [selectedParts, setSelectedParts] = useState<SelectedPart[]>([]);
  
  // State for brand/model selection
  const [selectedBrand, setSelectedBrand] = useState("");

  const handleQuickCustomerCreate = async () => {
    if (!quickCustomerName.trim()) return;
    
    setCreatingCustomer(true);
    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: quickCustomerName.trim(),
        phone: quickCustomerPhone.trim() || null,
      });
      
      if (newCustomer?.id) {
        form.setValue("customer_id", newCustomer.id);
      }
      
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setShowQuickCustomer(false);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      category_id: "",
      device_brand: "",
      device_model: "",
      imei: "",
      problem_description: "",
      diagnosis: "",
      labor_cost: 0,
      parts_cost: 0,
      total_cost: 0,
      amount_paid: 0,
      notes: "",
      estimated_ready_date: "",
      technician_note: "",
      received_by: "",
      repaired_by: "",
      device_condition: "",
    },
  });

  const defaultDraftValues = {
    customer_id: "", customer_name: "", customer_phone: "", category_id: "",
    device_brand: "", device_model: "", imei: "", problem_description: "",
    diagnosis: "", labor_cost: 0, parts_cost: 0, total_cost: 0, amount_paid: 0, notes: "",
    estimated_ready_date: "", technician_note: "", received_by: "", repaired_by: "",
    device_condition: "",
  };

  const { clearDraft } = useFormDraft("repair", {
    watch: form.getValues.bind(form),
    reset: (values) => form.reset(values),
    isOpen: open && !repair,
    defaultValues: defaultDraftValues,
  });

  // Get available models based on selected brand
  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    
    // Use API data for brands with external API
    if (BRANDS_WITH_API.includes(selectedBrand as typeof BRANDS_WITH_API[number])) {
      if (selectedBrand === "apple") {
        return appleDevices.map(model => ({ value: model, label: model }));
      }
    }
    
    // Use static list for other brands
    const models = PHONE_MODELS[selectedBrand] || [];
    return models.map(model => ({ value: model, label: model }));
  }, [selectedBrand, appleDevices]);

  // Brand options for combobox
  const brandOptions = useMemo(() => 
    PHONE_BRANDS.map(brand => ({ value: brand.value, label: brand.label })),
    []
  );

  useEffect(() => {
    if (repair) {
      const { brand, model } = parseDeviceModel(repair.device_model);
      setSelectedBrand(brand);
      form.reset({
        customer_id: repair.customer_id || "",
        category_id: repair.category_id || "",
        device_brand: brand,
        device_model: model,
        imei: repair.imei || "",
        problem_description: repair.problem_description,
        diagnosis: repair.diagnosis || "",
        labor_cost: Number(repair.labor_cost) || 0,
        parts_cost: Number(repair.parts_cost) || 0,
        total_cost: Number(repair.total_cost) || 0,
        amount_paid: Number(repair.amount_paid) || 0,
        notes: repair.notes || "",
        estimated_ready_date: repair.estimated_ready_date || "",
        technician_note: repair.technician_note || "",
        received_by: (repair as any).received_by || "",
        repaired_by: (repair as any).repaired_by || "",
        device_condition: (repair as any).device_condition || "",
      });
    } else {
      setSelectedBrand("");
      setSelectedParts([]);
      form.reset({
        customer_id: "",
        customer_name: "",
        customer_phone: "",
        category_id: "",
        device_brand: "",
        device_model: "",
        imei: "",
        problem_description: "",
        diagnosis: "",
        labor_cost: 0,
        parts_cost: 0,
        total_cost: 0,
        amount_paid: 0,
        notes: "",
        estimated_ready_date: "",
        technician_note: "",
        received_by: "",
        repaired_by: "",
        device_condition: "",
      });
    }
  }, [repair, form]);

  const handleBrandChange = (brandValue: string) => {
    setSelectedBrand(brandValue);
    form.setValue("device_brand", brandValue);
    // Reset model when brand changes
    form.setValue("device_model", "");
  };

  const handleSubmit = async (data: RepairFormValues) => {
    const brandLabel = data.device_brand ? getBrandLabel(data.device_brand) : "";
    const fullDeviceModel = brandLabel 
      ? `${brandLabel} ${data.device_model}`.trim()
      : data.device_model;
    
    await onSubmit({
      ...data,
      device_model: fullDeviceModel,
    }, selectedParts);
    clearDraft();
    form.reset();
    setSelectedBrand("");
    setSelectedParts([]);
  };

  // Auto-update parts_cost when selectedParts change
  const partsTotal = useMemo(() => 
    selectedParts.reduce((sum, p) => sum + p.unit_price * p.quantity, 0), 
    [selectedParts]
  );

  useEffect(() => {
    if (selectedParts.length > 0) {
      form.setValue("parts_cost", partsTotal);
    }
  }, [partsTotal, selectedParts.length, form]);

  // Product options for combobox (only in-stock items)
  const productOptions = useMemo(() => 
    products
      .filter((p) => p.quantity > 0)
      .map((p) => ({ value: p.id, label: `${p.name} (stock: ${p.quantity})` })),
    [products]
  );

  const handleAddPart = useCallback((productId: string) => {
    if (!productId) return;
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    
    // Check if already added
    const existing = selectedParts.find((p) => p.product_id === productId);
    if (existing) return;
    
    setSelectedParts((prev) => [
      ...prev,
      {
        product_id: product.id,
        product_name: product.name,
        quantity: 1,
        unit_price: Number(product.sell_price),
      },
    ]);
  }, [products, selectedParts]);

  const handleRemovePart = useCallback((productId: string) => {
    setSelectedParts((prev) => prev.filter((p) => p.product_id !== productId));
  }, []);

  const handlePartQuantityChange = useCallback((productId: string, qty: number) => {
    const product = products.find((p) => p.id === productId);
    const maxQty = product ? product.quantity : qty;
    const safeQty = Math.max(1, Math.min(qty, maxQty));
    setSelectedParts((prev) =>
      prev.map((p) => (p.product_id === productId ? { ...p, quantity: safeQty } : p))
    );
  }, [products]);

  const laborCostWatch = form.watch("labor_cost");
  const partsCostWatch = form.watch("parts_cost");
  const totalCostWatch = form.watch("total_cost");
  const amountPaidWatch = form.watch("amount_paid");
  const laborCost = Number(laborCostWatch) || 0;
  const partsCost = Number(partsCostWatch) || 0;
  const calculatedInternalCost = laborCost + partsCost;
  const totalCost = Number(totalCostWatch) || 0;
  const amountPaid = Number(amountPaidWatch) || 0;
  const remainingBalance = Math.max(0, totalCost - amountPaid);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la réparation" : "Nouvelle réparation"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Customer Selection */}
            {!showQuickCustomer ? (
              <div className="space-y-2">
                <FormLabel>Client</FormLabel>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="flex gap-2">
                          <div className="flex-1">
                            <CustomerCombobox
                              value={field.value || ""}
                              onValueChange={field.onChange}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title="Ajouter un nouveau client"
                            onClick={() => setShowQuickCustomer(true)}
                          >
                            <UserPlus className="h-4 w-4" />
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nouveau client rapide</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setShowQuickCustomer(false);
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nom *</label>
                    <Input
                      placeholder="Nom du client"
                      value={quickCustomerName}
                      onChange={(e) => setQuickCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Téléphone</label>
                    <Input
                      placeholder="Numéro (optionnel)"
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowQuickCustomer(false);
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickCustomerCreate}
                    disabled={!quickCustomerName.trim() || creatingCustomer}
                  >
                    {creatingCustomer && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Créer et utiliser
                  </Button>
                </div>
              </div>
            )}

            {/* Device Info - Brand and Model with autocomplete */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="device_brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque</FormLabel>
                    <FormControl>
                      <Combobox
                        options={brandOptions}
                        value={field.value || ""}
                        onValueChange={handleBrandChange}
                        placeholder="Sélectionner marque"
                        searchPlaceholder="Rechercher marque..."
                        emptyText="Aucune marque trouvée"
                        allowCustomValue
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="device_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle *</FormLabel>
                    <FormControl>
                      {selectedBrand && (availableModels.length > 0 || isLoadingApple) ? (
                        <Combobox
                          options={availableModels}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder={isLoadingApple ? "Chargement..." : "Sélectionner modèle"}
                          searchPlaceholder="Rechercher modèle..."
                          emptyText="Aucun modèle trouvé"
                          allowCustomValue
                          disabled={isLoadingApple}
                        />
                      ) : (
                        <Input 
                          placeholder="Ex: iPhone 15 Pro" 
                          {...field} 
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Repair Category */}
            {categoryOptions.length > 0 && (
              <FormField
                control={form.control}
                name="category_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Catégorie de réparation</FormLabel>
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

            {/* IMEI - dans accordéon "Plus d'infos" (fermé par défaut à la création) */}
            <Collapsible defaultOpen={isEditing}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between text-muted-foreground hover:text-foreground -ml-2"
                >
                  <span>+ Plus d'infos (IMEI)</span>
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-2">
                <FormField
                  control={form.control}
                  name="imei"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>IMEI</FormLabel>
                      <FormControl>
                        <Input placeholder="IMEI (optionnel)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Problem Description - édition uniquement */}
            {isEditing && (
              <FormField
                control={form.control}
                name="problem_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description du problème</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Décrivez le problème signalé par le client..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Diagnosis - édition uniquement */}
            {isEditing && (
              <FormField
                control={form.control}
                name="diagnosis"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Diagnostic</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Votre diagnostic technique..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Replacement Parts from Inventory — hidden for employees */}
            {!isEmployee && (
            <div className="space-y-2">
              <FormLabel className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                Pièces de remplacement (stock)
                <span className="text-xs text-muted-foreground font-normal">— optionnel</span>
              </FormLabel>
              
              <div className="flex gap-2">
                <div className="flex-1">
                  <Combobox
                    options={productOptions}
                    value=""
                    onValueChange={handleAddPart}
                    placeholder="Ajouter une pièce du stock..."
                    searchPlaceholder="Rechercher un produit..."
                    emptyText="Aucun produit en stock"
                  />
                </div>
              </div>

              {selectedParts.length > 0 && (
                <div className="border rounded-lg divide-y">
                  {selectedParts.map((part) => {
                    const product = products.find((p) => p.id === part.product_id);
                    const maxQty = product?.quantity || 1;
                    return (
                      <div key={part.product_id} className="flex items-center gap-2 p-2 text-sm">
                        <span className="flex-1 truncate">{part.product_name}</span>
                        <Input
                          type="number"
                          min={1}
                          max={maxQty}
                          value={part.quantity}
                          onChange={(e) => handlePartQuantityChange(part.product_id, Number(e.target.value))}
                          className="w-16 h-8 text-center"
                        />
                        <span className="text-muted-foreground w-20 text-right font-mono-numbers">{format(part.unit_price * part.quantity)}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleRemovePart(part.product_id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    );
                  })}
                  <div className="flex justify-between p-2 text-sm font-medium bg-muted/30">
                    <span>Total pièces</span>
                    <span className="font-mono-numbers">{format(partsTotal)}</span>
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Costs détail — édition uniquement, masqué employés */}
            {isEditing && !isEmployee && (
            <>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="labor_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main d'œuvre</FormLabel>
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
                name="parts_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pièces</FormLabel>
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

            {/* Total Display */}
            <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium">Total estimé:</span>
              <span className="text-lg font-bold text-primary">
                {format(calculatedInternalCost)}
              </span>
            </div>
            </>
            )}

            {/* Notes - édition uniquement */}
            {isEditing && (
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes internes</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Notes internes (non visibles par le client)..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Estimated ready date */}
            <FormField
              control={form.control}
              name="estimated_ready_date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date de disponibilité estimée</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "justify-start text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {field.value
                            ? formatDate(new Date(field.value), "d MMMM yyyy", { locale: fr })
                            : "Sélectionner une date (optionnel)"}
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <div className="flex flex-wrap gap-1 p-2 border-b">
                        {[
                          { label: "Aujourd'hui", days: 0 },
                          { label: "Demain", days: 1 },
                          { label: "48 h", days: 2 },
                        ].map((preset) => (
                          <Button
                            key={preset.label}
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => {
                              const d = new Date();
                              d.setDate(d.getDate() + preset.days);
                              field.onChange(d.toISOString().split("T")[0]);
                            }}
                          >
                            {preset.label}
                          </Button>
                        ))}
                        {field.value && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => field.onChange("")}
                          >
                            Effacer
                          </Button>
                        )}
                      </div>
                      <Calendar
                        mode="single"
                        selected={field.value ? new Date(field.value) : undefined}
                        onSelect={(date) => field.onChange(date ? date.toISOString().split("T")[0] : "")}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <p className="text-xs text-muted-foreground">Visible par le client sur la page de suivi</p>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Technician note - édition uniquement */}
            {isEditing && (
              <FormField
                control={form.control}
                name="technician_note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Note du technicien (visible par le client)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ex: Écran remplacé. Test en cours. Pièce commandée, arrivée prévue demain..."
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">Cette note sera visible par le client sur la page de suivi public</p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Staff / Intake fields - "Réparé par" uniquement en édition */}
            <div className={cn("grid gap-4", isEditing ? "grid-cols-2" : "grid-cols-1")}>
              <FormField
                control={form.control}
                name="received_by"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reçu par</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom de l'employé..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {isEditing && (
                <FormField
                  control={form.control}
                  name="repaired_by"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Réparé par</FormLabel>
                      <FormControl>
                        <Input placeholder="Nom du technicien..." {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Device condition at intake */}
            <FormField
              control={form.control}
              name="device_condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>État de l'appareil à la réception</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ex: Écran cassé, rayures, ne s'allume pas..."
                      {...field}
                    />
                  </FormControl>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {["Écran cassé", "Rayures", "Ne s'allume pas", "Traces d'eau"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted hover:bg-accent transition-colors"
                        onClick={() => {
                          const current = field.value || "";
                          const parts = current.split(", ").filter(Boolean);
                          if (!parts.includes(preset)) {
                            field.onChange([...parts, preset].join(", "));
                          }
                        }}
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="total_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prix Total Estimé</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
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
                  name="amount_paid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Avance payée</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          placeholder="0"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex items-center justify-between rounded-md bg-background px-3 py-2">
                <span className="text-sm font-medium">Reste à payer</span>
                <span className="text-lg font-bold font-mono-numbers text-primary">
                  {format(remainingBalance)}
                </span>
              </div>
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
                {isEditing ? "Enregistrer" : "Créer la réparation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
