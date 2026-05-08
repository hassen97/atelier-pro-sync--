import { useState, useRef, useCallback } from "react";
import { Search, Plus, Package, AlertTriangle, MoreHorizontal, Download, History, Zap, FileSpreadsheet, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, useDebounce } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUpdateProductStock, useInventoryStats, PRODUCTS_PAGE_SIZE } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { ProductSheet, ProductSheetRef } from "@/components/inventory/ProductSheet";
import { SmartScanBar, SmartScanBarRef } from "@/components/inventory/SmartScanBar";
import { VariationMatrixDialog } from "@/components/inventory/VariationMatrixDialog";
import { InventoryUnlockDialog } from "@/components/inventory/InventoryUnlockDialog";
import { ExcelImportDialog } from "@/components/inventory/ExcelImportDialog";
import { ActivityLogTab } from "@/components/inventory/ActivityLogTab";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { PremiumFeature } from "@/components/billing/PremiumFeature";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface ProductWithCategory {
  id: string; name: string; sku: string | null; barcodes: string[]; description: string | null;
  cost_price: number; sell_price: number; quantity: number; min_quantity: number;
  category?: { id: string; name: string } | null;
  category_id?: string | null;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("__all__");
  const [currentPage, setCurrentPage] = useState(0);
  
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Edit dialog (existing products)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  
  // New product sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState<string | undefined>();
  
  // Matrix dialog
  const [matrixOpen, setMatrixOpen] = useState(false);
  
  // Excel import dialog
  const [importOpen, setImportOpen] = useState(false);
  
  // Unlock dialog
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const effectiveUserId = useEffectiveUserId();
  
  // Pulse animation
  const [pulsedProductId, setPulsedProductId] = useState<string | null>(null);

  // Fetch categories for the filter dropdown
  const { data: categoriesData = [] } = useCategories("product");

  // Reset to page 0 when search or category changes
  const handleSearchChange = (val: string) => { setSearchQuery(val); setCurrentPage(0); };
  const handleCategoryChange = (val: string) => { setSelectedCategory(val); setCurrentPage(0); };

  const selectedCategoryId = selectedCategory === "__all__" 
    ? null 
    : (categoriesData.find((c) => c.name === selectedCategory)?.id ?? null);

  const { data: productsResult = { data: [], count: 0 }, isLoading } = useProducts({
    page: currentPage,
    search: debouncedSearch,
    categoryId: selectedCategoryId,
  });
  const rawProducts = productsResult.data;
  const totalCount = productsResult.count;

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateProductStock();
  const { format } = useCurrency();
  const { isLocked, isEmployee, inventoryLocked, verifyCode, verifying, unlocked } = useInventoryAccess();
  const { data: inventoryStats } = useInventoryStats();

  const scanBarRef = useRef<SmartScanBarRef>(null);
  const sheetRef = useRef<ProductSheetRef>(null);

  useRealtimeSubscription({ tables: ["products"], queryKeys: [["products"], ["low-stock-alerts"], ["dashboard-stats"]] });

  const products = (rawProducts as ProductWithCategory[]).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name || "Non catégorisé",
    sku: p.sku || "",
    barcodes: p.barcodes || (p.sku ? [p.sku] : []),
    cost: Number(p.cost_price) || 0,
    price: Number(p.sell_price) || 0,
    stock: p.quantity || 0,
    threshold: p.min_quantity || 5,
    _original: p,
  }));

  // Categories for the filter — derived from fetched categories
  const categoryOptions = ["__all__", ...categoriesData.map((c) => c.name)];

  // Client-side: only apply pulsed-product ordering (search/filter is now server-side)
  const displayedInventory = (() => {
    let list = [...products];
    if (pulsedProductId) {
      const idx = list.findIndex((p) => p.id === pulsedProductId);
      if (idx > 0) {
        const [item] = list.splice(idx, 1);
        list = [item, ...list];
      }
    }
    return list;
  })();

  const totalPages = Math.ceil(totalCount / PRODUCTS_PAGE_SIZE);
  const pageStart = currentPage * PRODUCTS_PAGE_SIZE + 1;
  const pageEnd = Math.min((currentPage + 1) * PRODUCTS_PAGE_SIZE, totalCount);

  // Stats from global aggregation hook (not limited to current page)
  const totalStockUnits = inventoryStats?.totalUnits ?? 0;
  const totalValue = inventoryStats?.totalValue ?? 0;
  const lowStockItems = inventoryStats?.lowStock ?? 0;
  const outOfStockItems = inventoryStats?.outOfStock ?? 0;

  const returnFocusToScanBar = useCallback(() => {
    setTimeout(() => scanBarRef.current?.focus(), 50);
  }, []);

  const handleNewProduct = () => {
    setPrefillBarcode(undefined);
    setSheetOpen(true);
  };

  const handleEdit = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} ?`)) {
      deleteProduct.mutate(id);
    }
  };

  const handleAdjustStock = (id: string, name: string, currentStock: number) => {
    const newStock = prompt(`Nouveau stock pour ${name}:`, String(currentStock));
    if (newStock !== null) {
      const qty = parseInt(newStock);
      if (!isNaN(qty) && qty >= 0) updateStock.mutate({ id, quantity: qty });
      else toast.error("Quantité invalide");
    }
    returnFocusToScanBar();
  };

  // Smart Scan callbacks
  const handleProductScanned = useCallback((productId: string, _name: string, _newStock: number) => {
    setPulsedProductId(productId);
    setTimeout(() => setPulsedProductId(null), 1400);
  }, []);

  const handleUnknownBarcode = useCallback((barcode: string) => {
    setPrefillBarcode(barcode);
    setSheetOpen(true);
  }, []);

  const handleStockIncrement = useCallback((id: string, quantity: number) => {
    updateStock.mutate({ id, quantity });
  }, [updateStock]);

  // Sheet submit (new product)
  const handleSheetSubmit = async (data: any) => {
    await createProduct.mutateAsync(data);
    setSheetOpen(false);
    setPrefillBarcode(undefined);
    returnFocusToScanBar();
  };

  // Edit dialog submit
  const handleEditSubmit = async (data: any) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    }
    setEditDialogOpen(false);
    setEditingProduct(null);
    returnFocusToScanBar();
  };

  // Export full inventory to CSV (paged fetch, sanitized)
  const handleExport = useCallback(async () => {
    if (!effectiveUserId) {
      toast.error("Session non valide");
      return;
    }
    setIsExporting(true);
    try {
      const PAGE = 1000;
      let from = 0;
      const all: Array<{ name: string; sku: string | null; quantity: number; cost_price: number; sell_price: number; category_id: string | null }> = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("name, sku, quantity, cost_price, sell_price, category_id")
          .eq("user_id", effectiveUserId)
          .order("name", { ascending: true })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        const batch = data || [];
        all.push(...(batch as any));
        if (batch.length < PAGE) break;
        from += PAGE;
      }

      // Resolve category names in one query
      const catIds = Array.from(new Set(all.map((p) => p.category_id).filter(Boolean) as string[]));
      const catMap = new Map<string, string>();
      if (catIds.length > 0) {
        const { data: cats } = await supabase
          .from("categories")
          .select("id, name")
          .in("id", catIds);
        (cats || []).forEach((c: any) => catMap.set(c.id, c.name));
      }

      const sanitize = (v: unknown): string => {
        const s = v == null ? "" : String(v);
        // Strip line breaks and dangerous CSV chars; escape double quotes
        const cleaned = s.replace(/[\r\n]+/g, " ").trim();
        if (/[";]/.test(cleaned)) {
          return `"${cleaned.replace(/"/g, '""')}"`;
        }
        return cleaned;
      };

      const headers = [
        "Nom du produit",
        "Référence/SKU",
        "Catégorie",
        "Quantité en stock",
        "Prix d'achat",
        "Prix de vente",
      ];
      const lines: string[] = [headers.join(";")];
      for (const p of all) {
        lines.push([
          sanitize(p.name),
          sanitize(p.sku ?? ""),
          sanitize(p.category_id ? (catMap.get(p.category_id) ?? "") : ""),
          sanitize(p.quantity ?? 0),
          sanitize(Number(p.cost_price ?? 0).toFixed(2)),
          sanitize(Number(p.sell_price ?? 0).toFixed(2)),
        ].join(";"));
      }

      // BOM for Excel-FR + UTF-8
      const csv = "\uFEFF" + lines.join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `inventaire-${stamp}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 0);

      toast.success(`Export terminé — ${all.length} produit${all.length > 1 ? "s" : ""}`);
    } catch (err) {
      console.error("Inventory export failed:", err);
      toast.error("Erreur lors de l'export");
    } finally {
      setIsExporting(false);
    }
  }, [effectiveUserId]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion du Stock" description="Inventaire des produits, pièces et accessoires" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestion du Stock" description="Inventaire des produits, pièces et accessoires">
        {isLocked && (
          <Button variant="outline" onClick={() => setUnlockDialogOpen(true)} className="gap-2">
            <Lock className="h-4 w-4" />
            Déverrouiller
          </Button>
        )}
        {isEmployee && inventoryLocked && unlocked && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
            <Unlock className="h-3 w-3" />
            Déverrouillé
          </Badge>
        )}
        <PremiumFeature featureKey="inventory_export" featureName="Export Inventaire" mode="locked">
          <Button variant="outline" onClick={handleExport} disabled={isExporting} className="gap-2">
            {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isExporting ? "Export en cours..." : "Exporter"}
          </Button>
        </PremiumFeature>
        <PremiumFeature featureKey="inventory_export" featureName="Export Inventaire" mode="locked">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            disabled={isLocked}
            className="gap-2 border-success/30 text-success hover:bg-success/10"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import Excel
          </Button>
        </PremiumFeature>
        <Button
          variant="outline"
          onClick={() => setMatrixOpen(true)}
          disabled={isLocked}
          className="gap-2 border-warning/30 text-warning hover:bg-warning/10"
        >
          <Zap className="h-4 w-4" />
          Générateur
        </Button>
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewProduct} disabled={isLocked}>
          <Plus className="h-4 w-4 mr-2" />Nouveau produit
        </Button>
      </PageHeader>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock" className="gap-1.5">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total produits" value={totalCount} icon={Package} variant="default" />
            <StatCard title="Unités en stock" value={totalStockUnits} icon={Package} variant="success" />
            <StatCard title="Valeur du stock" value={format(totalValue)} icon={Package} variant="accent" />
            <StatCard title="Stock faible" value={lowStockItems} subtitle="Sous le seuil d'alerte" icon={AlertTriangle} variant="warning" />
            <StatCard title="Rupture de stock" value={outOfStockItems} icon={AlertTriangle} variant="destructive" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, SKU ou code-barres..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Smart Scan Bar */}
            <SmartScanBar
              ref={scanBarRef}
              products={products}
              isLocked={isLocked}
              onProductScanned={handleProductScanned}
              onUnknownBarcode={handleUnknownBarcode}
              onStockIncrement={handleStockIncrement}
            />

            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Toutes les catégories</SelectItem>
                {categoryOptions.filter((c) => c !== "__all__").map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Codes-barres</TableHead>
                    <TableHead>Catégorie</TableHead>
                    {!isEmployee && <TableHead className="text-right">Coût</TableHead>}
                    <TableHead className="text-right">Prix vente</TableHead>
                    {!isEmployee && <TableHead className="text-right">Marge</TableHead>}
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayedInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isEmployee ? 6 : 8} className="text-center py-12 text-muted-foreground">
                        {totalCount === 0
                          ? "Aucun produit enregistré. Cliquez sur 'Nouveau produit' pour commencer."
                          : "Aucun produit trouvé pour cette recherche"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    displayedInventory.map((item) => {
                      const margin = item.cost > 0 && isFinite(item.cost) && isFinite(item.price) ? ((item.price - item.cost) / item.cost) * 100 : 0;
                      const isLowStock = item.stock <= item.threshold;
                      const isOutOfStock = item.stock === 0;
                      const isPulsed = item.id === pulsedProductId;
                      return (
                        <TableRow
                          key={item.id}
                          className={cn(isPulsed && "animate-neon-pulse")}
                        >
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.barcodes.length > 0 ? (
                                item.barcodes.map((b) => (
                                  <span key={b} className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {b}
                                  </span>
                                ))
                              ) : item.sku ? (
                                <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                          {!isEmployee && <TableCell className="text-right font-mono-numbers">{format(item.cost)}</TableCell>}
                          <TableCell className="text-right font-mono-numbers">{format(item.price)}</TableCell>
                          {!isEmployee && (
                            <TableCell className="text-right">
                              <span className="text-success font-medium">+{margin.toFixed(0)}%</span>
                            </TableCell>
                          )}
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "font-mono",
                              isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20",
                              isLowStock && !isOutOfStock && "bg-warning/10 text-warning border-warning/20",
                              !isLowStock && "bg-success/10 text-success border-success/20"
                            )}>
                              {item.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLocked}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(item._original)}>Modifier</DropdownMenuItem>
                                {!isEmployee && <DropdownMenuItem onClick={() => handleAdjustStock(item.id, item.name, item.stock)}>Ajuster stock</DropdownMenuItem>}
                                {!isEmployee && <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id, item.name)}>Supprimer</DropdownMenuItem>}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            {totalCount > PRODUCTS_PAGE_SIZE && (
              <CardFooter className="flex items-center justify-between px-4 py-3 border-t">
                <p className="text-sm text-muted-foreground">
                  Affichage de <span className="font-medium text-foreground">{pageStart}–{pageEnd}</span> sur{" "}
                  <span className="font-medium text-foreground">{totalCount}</span> produits
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                    className="gap-1"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Précédent
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                    className="gap-1"
                  >
                    Suivant
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardFooter>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>

      {/* New Product Sheet (slide-over) */}
      <ProductSheet
        ref={sheetRef}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setPrefillBarcode(undefined);
            returnFocusToScanBar();
          }
        }}
        prefillBarcode={prefillBarcode}
        onSubmit={handleSheetSubmit}
        isLoading={createProduct.isPending}
        onSaved={returnFocusToScanBar}
      />

      {/* Edit Dialog (existing products) */}
      <ProductDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) returnFocusToScanBar();
        }}
        product={editingProduct}
        onSubmit={handleEditSubmit}
        isLoading={updateProduct.isPending}
      />

      {/* Variation Matrix */}
      <VariationMatrixDialog
        open={matrixOpen}
        onOpenChange={(open) => {
          setMatrixOpen(open);
          if (!open) returnFocusToScanBar();
        }}
        onSaved={returnFocusToScanBar}
      />

      {/* Unlock Dialog */}
      <InventoryUnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        onVerify={verifyCode}
        verifying={verifying}
      />

      {/* Excel Import Dialog */}
      <ExcelImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => {
          setImportOpen(false);
          returnFocusToScanBar();
        }}
      />
    </div>
  );
}
