import { useState, useRef, useCallback, useEffect } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, Loader2, ScanBarcode, Wrench, CheckCircle2, AlertTriangle, Zap, Percent, DollarSign } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ShoppingCart } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useAllProducts } from "@/hooks/useProducts";
import { useRepairs } from "@/hooks/useRepairs";
import { useCreateSale } from "@/hooks/useSales";
import { useCreateCustomer, useUpdateCustomer, useAllCustomers } from "@/hooks/useCustomers";
import { useUpdateRepairStatus } from "@/hooks/useRepairs";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { LoyaltyRedeemCard } from "@/components/pos/LoyaltyRedeemCard";
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  maxStock: number;
  type: "product" | "repair";
  discount: number;
  discountType: "fixed" | "percent";
}

export default function POS() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanFlash, setScanFlash] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [pendingPaymentMethod, setPendingPaymentMethod] = useState<string>("");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyPointsUsed, setLoyaltyPointsUsed] = useState(0);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const beepRef = useRef<AudioContext | null>(null);

  const { data: products = [], isLoading: productsLoading } = useAllProducts();
  const { data: repairsResult = {data:[], count:0}, isLoading: repairsLoading } = useRepairs();
  const rawRepairs = repairsResult.data;
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();
  const updateRepairStatus = useUpdateRepairStatus();
  const { data: customers = [] } = useAllCustomers();
  const { settings } = useShopSettingsContext();
  const { isEmployee } = useInventoryAccess();
  const { format } = useCurrency();

  // Live-refresh product stock so cashiers never oversell on the cached grid
  useRealtimeSubscription({
    tables: ["products", "sales"],
    queryKeys: [
      ["products-all"],
      ["products"],
      ["products-low-stock"],
      ["inventory-stats"],
    ],
  });

  // Completed repairs only
  const completedRepairs = (rawRepairs || []).filter((r: any) => r.status === "completed");

  const categories = [...new Set(products.map((p: any) => p.category?.name).filter(Boolean))];

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const playBeep = useCallback(() => {
    try {
      if (!beepRef.current) beepRef.current = new AudioContext();
      const ctx = beepRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, []);

  const flashGreen = useCallback(() => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 400);
  }, []);

  const handleScan = (value: string) => {
    if (!value.trim()) return;
    const product = products.find((p: any) => p.sku && p.sku.toLowerCase() === value.trim().toLowerCase());
    if (product) {
      addToCart(product);
      playBeep();
      flashGreen();
    } else {
      toast.error(`Produit non trouvé: ${value}`);
    }
    setScanInput("");
    scanRef.current?.focus();
  };

  const addToCart = (product: any) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.type === "product");
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((item) =>
          item.id === product.id && item.type === "product" ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.sell_price, originalPrice: product.sell_price, quantity: 1, maxStock: product.quantity, type: "product" as const, discount: 0, discountType: "fixed" as const }];
    });
  };

  const addRepairToCart = (repair: any) => {
    const already = cart.find((item) => item.id === repair.id && item.type === "repair");
    if (already) return;
    const remaining = repair.total_cost - repair.amount_paid;
    if (remaining <= 0) {
      toast.info("Cette réparation est déjà entièrement payée");
      return;
    }
    setCart((prev) => [...prev, {
      id: repair.id,
      name: `Réparation: ${repair.device_model}`,
      price: remaining,
      originalPrice: remaining,
      quantity: 1,
      maxStock: 1,
      type: "repair" as const,
      discount: 0,
      discountType: "fixed" as const,
    }]);
    if (repair.customer_id && !selectedCustomerId) {
      setSelectedCustomerId(repair.customer_id);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (item.type === "repair") return item; // Can't change repair qty
          const newQuantity = item.quantity + delta;
          if (newQuantity > item.maxStock) return item;
          return { ...item, quantity: Math.max(0, newQuantity) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, price: newPrice, discount: 0 } : item));
  };

  const updateItemDiscount = (id: string, discount: number, discountType: "fixed" | "percent") => {
    setCart((prev) => prev.map((item) => {
      if (item.id !== id) return item;
      const effectiveDiscount = discountType === "percent"
        ? item.originalPrice * (Math.min(discount, 100) / 100)
        : Math.min(discount, item.originalPrice);
      return { ...item, discount, discountType, price: Math.max(0, item.originalPrice - effectiveDiscount) };
    }));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  // Loyalty discount
  const selectedCustomerEarly = customers.find((c: any) => c.id === selectedCustomerId);
  const loyaltyDiscount = (settings.loyalty_enabled && loyaltyEnabled && selectedCustomerEarly && loyaltyPointsUsed > 0)
    ? (loyaltyPointsUsed / (settings.loyalty_redeem_points || 100)) * (settings.loyalty_redeem_value || 0)
    : 0;
  const total = Math.max(0, subtotal - loyaltyDiscount);

  const clearCart = () => {
    setCart([]);
    setLoyaltyEnabled(false);
    setLoyaltyPointsUsed(0);
  };

  // Reset loyalty when customer changes
  useEffect(() => {
    setLoyaltyEnabled(false);
    setLoyaltyPointsUsed(0);
  }, [selectedCustomerId]);

  const openPaymentDialog = (method: string) => {
    if (cart.length === 0) return;
    setPendingPaymentMethod(method);
    setAmountPaidInput(total.toFixed(3));
    setPaymentDialogOpen(true);
  };

  const handleQuickPayment = async () => {
    if (cart.length === 0) return;

    const productItems = cart.filter((i) => i.type === "product");
    const repairItems = cart.filter((i) => i.type === "repair");

    if (productItems.length > 0) {
      const productTotal = productItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const productPaid = Math.max(0, productTotal - (repairItems.length === 0 ? loyaltyDiscount : 0));
      await createSale.mutateAsync({
        customer_id: selectedCustomerId || null,
        payment_method: "cash",
        total_amount: Math.max(0, productTotal - (repairItems.length === 0 ? loyaltyDiscount : 0)),
        amount_paid: productPaid,
        items: productItems.map((item) => ({ product_id: item.id, quantity: item.quantity, unit_price: item.price })),
        loyalty_enabled: settings.loyalty_enabled && !!selectedCustomerId,
        loyalty_earn_rate: settings.loyalty_earn_rate,
        loyalty_points_used: repairItems.length === 0 ? loyaltyPointsUsed : 0,
        loyalty_discount: repairItems.length === 0 ? loyaltyDiscount : 0,
      });
    }

    for (const repairItem of repairItems) {
      await updateRepairStatus.mutateAsync({ id: repairItem.id, status: "delivered" });
    }

    try {
      const { generateThermalReceipt } = await import("@/lib/receiptPdf");
      await generateThermalReceipt({
        type: repairItems.length > 0 && productItems.length === 0 ? "repair" : "sale",
        id: Date.now().toString(36),
        date: new Date().toLocaleDateString("fr-TN"),
        time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
        items: cart.map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
        subtotal,
        total,
        paid: total,
        remaining: 0,
        paymentMethod: "cash",
      }, settings, format);
    } catch (e) {
      console.error("Receipt generation error:", e);
    }

    clearCart();
    setSelectedCustomerId("");
  };

  // Keyboard shortcuts for fast checkout
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (cart.length === 0 || createSale.isPending || paymentDialogOpen) return;
      if (e.key === "F1") { e.preventDefault(); handleQuickPayment(); }
      else if (e.key === "F2") { e.preventDefault(); openPaymentDialog("card"); }
      else if (e.key === "F3") { e.preventDefault(); openPaymentDialog("cash"); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const parsedAmountPaid = parseFloat(amountPaidInput) || 0;
  const remainder = Math.max(0, total - parsedAmountPaid);
  const isPartialPayment = parsedAmountPaid < total && parsedAmountPaid > 0;
  const selectedCustomer = customers.find((c: any) => c.id === selectedCustomerId);

  const handlePayment = async () => {
    if (cart.length === 0) return;
    if (isPartialPayment && !selectedCustomerId) {
      toast.error("Veuillez sélectionner un client pour un paiement partiel");
      return;
    }

    const actualPaid = Math.min(parsedAmountPaid, total);

    const productItems = cart.filter((i) => i.type === "product");
    const repairItems = cart.filter((i) => i.type === "repair");

    // Create sale for products
    if (productItems.length > 0) {
      const productTotalRaw = productItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const effectiveLoyaltyDiscount = repairItems.length === 0 ? loyaltyDiscount : 0;
      const productTotal = Math.max(0, productTotalRaw - effectiveLoyaltyDiscount);
      const productPaid = repairItems.length > 0
        ? Math.min(actualPaid, productTotal)
        : actualPaid;
      await createSale.mutateAsync({
        customer_id: selectedCustomerId || null,
        payment_method: pendingPaymentMethod,
        total_amount: productTotal,
        amount_paid: Math.min(productPaid, productTotal),
        items: productItems.map((item) => ({ product_id: item.id, quantity: item.quantity, unit_price: item.price })),
        loyalty_enabled: settings.loyalty_enabled && !!selectedCustomerId,
        loyalty_earn_rate: settings.loyalty_earn_rate,
        loyalty_points_used: repairItems.length === 0 ? loyaltyPointsUsed : 0,
        loyalty_discount: effectiveLoyaltyDiscount,
      });
    }

    // Mark repairs as delivered
    for (const repairItem of repairItems) {
      await updateRepairStatus.mutateAsync({ id: repairItem.id, status: "delivered" });
    }

    // Update customer balance if partial payment
    if (remainder > 0 && selectedCustomerId && selectedCustomer) {
      await updateCustomer.mutateAsync({
        id: selectedCustomerId,
        balance: (selectedCustomer.balance || 0) + remainder,
      });
    }

    // Generate receipt via dynamic import
    try {
      const { generateThermalReceipt } = await import("@/lib/receiptPdf");
      await generateThermalReceipt({
        type: repairItems.length > 0 && productItems.length === 0 ? "repair" : "sale",
        id: Date.now().toString(36),
        date: new Date().toLocaleDateString("fr-TN"),
        time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
        items: cart.map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
        subtotal,
        total,
        paid: actualPaid,
        remaining: remainder,
        paymentMethod: pendingPaymentMethod,
      }, settings, format);
    } catch (e) {
      console.error("Receipt generation error:", e);
    }

    setPaymentDialogOpen(false);
    clearCart();
    setSelectedCustomerId("");
  };

  if (productsLoading) {
    return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] animate-fade-in">
        <PageHeader title="Point de Vente" description="Encaissement et ventes" />
        <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100%-5rem)]">
          <div className="lg:col-span-2 min-h-[50vh] lg:min-h-0"><Skeleton className="h-10 w-full mb-4" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] animate-fade-in pb-24 lg:pb-0">
      <PageHeader title="Point de Vente" description="Encaissement et ventes" />

      <div className="grid gap-6 lg:grid-cols-3 lg:h-[calc(100%-5rem)]">
        {/* Products & Repairs Section */}
        <div className="lg:col-span-2 flex flex-col lg:min-h-0">
          <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mb-3 w-fit">
              <TabsTrigger value="products">Produits</TabsTrigger>
              <TabsTrigger value="repairs" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Réparations terminées
                {completedRepairs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{completedRepairs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="space-y-2 mb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un produit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)}>Tout</Button>
                  {categories.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                  ))}
                </div>
              </div>
              <div className="lg:flex-1 lg:overflow-auto">
                {filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {products.length === 0 ? "Aucun produit dans l'inventaire." : "Aucun produit trouvé."}
                  </div>
                ) : (
                  <div className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                    {filteredProducts.map((product: any) => (
                      <Card key={product.id} className={cn("cursor-pointer transition-all hover:shadow-soft hover:border-primary/30", product.quantity <= 0 && "opacity-50 cursor-not-allowed")} onClick={() => addToCart(product)}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-medium text-sm leading-tight line-clamp-2">{product.name}</h3>
                            <Badge variant={product.quantity <= 0 ? "destructive" : "outline"} className="text-[10px] shrink-0 ml-1">{product.quantity}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="text-[10px]">{product.category?.name || "—"}</Badge>
                            <span className="font-bold font-mono-numbers text-primary text-sm">{format(product.sell_price)}</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="repairs" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="lg:flex-1 lg:overflow-auto">
                {completedRepairs.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">Aucune réparation terminée en attente d'encaissement.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {completedRepairs.map((repair: any) => {
                      const remaining = repair.total_cost - repair.amount_paid;
                      const inCart = cart.some((i) => i.id === repair.id && i.type === "repair");
                      return (
                        <Card key={repair.id} className={cn("cursor-pointer transition-all hover:shadow-soft", inCart && "border-primary ring-1 ring-primary/20", remaining <= 0 && "opacity-60")} onClick={() => addRepairToCart(repair)}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-sm">{repair.device_model}</p>
                                <p className="text-xs text-muted-foreground">{repair.customer?.name || "Client inconnu"}</p>
                              </div>
                              <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Terminé
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{repair.problem_description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Total: {format(repair.total_cost)}</span>
                              {remaining > 0 ? (
                                <Badge variant="destructive" className="text-[10px]">Reste: {format(remaining)}</Badge>
                              ) : (
                                <Badge className="bg-success/10 text-success text-[10px]">Payé</Badge>
                              )}
                            </div>
                            {inCart && <p className="text-[10px] text-primary font-medium mt-1">✓ Ajouté au panier</p>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Mobile floating cart trigger */}
        <Button
          onClick={() => setMobileCartOpen(true)}
          className="lg:hidden fixed bottom-4 inset-x-4 z-40 h-14 shadow-elevated bg-gradient-primary text-primary-foreground hover:opacity-90 flex items-center justify-between px-5"
        >
          <span className="flex items-center gap-2 font-semibold">
            <ShoppingCart className="h-5 w-5" />
            Panier
            {cart.length > 0 && (
              <Badge variant="secondary" className="ml-1 h-6 px-2">
                {cart.reduce((n, i) => n + i.quantity, 0)}
              </Badge>
            )}
          </span>
          <span className="font-mono-numbers font-bold">{format(total)}</span>
        </Button>

        {/* Mobile backdrop */}
        {mobileCartOpen && (
          <div
            className="lg:hidden fixed inset-0 z-40 bg-background/70 backdrop-blur-sm"
            onClick={() => setMobileCartOpen(false)}
          />
        )}

        {/* Cart Section (desktop inline, mobile bottom sheet) */}
        <Card
          className={cn(
            "flex-col min-h-0 transition-all",
            "lg:relative lg:flex lg:inset-auto lg:max-h-none lg:rounded-lg lg:shadow-none",
            "fixed inset-x-0 bottom-0 z-50 max-h-[88vh] rounded-t-2xl rounded-b-none shadow-2xl",
            mobileCartOpen ? "flex" : "hidden lg:flex",
            scanFlash && "ring-2 ring-success/60 bg-success/5"
          )}
        >
          <CardHeader className="pb-3 shrink-0">
            <div className="lg:hidden mx-auto mb-2 h-1.5 w-12 rounded-full bg-muted-foreground/30" />
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Panier</CardTitle>
              <div className="flex items-center gap-1">
                {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">Vider</Button>}
                <Button variant="ghost" size="sm" onClick={() => setMobileCartOpen(false)} className="lg:hidden">Fermer</Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
            {/* Barcode scan input */}
            <div className="relative mb-3">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={scanRef}
                placeholder="Scanner code-barres / SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(scanInput); } }}
                className="pl-9 font-mono text-sm"
              />
            </div>

            <div className="mb-3">
              <CustomerCombobox value={selectedCustomerId} onValueChange={setSelectedCustomerId} onAddNew={() => setCustomerDialogOpen(true)} />
            </div>

            <div className="flex-1 overflow-auto space-y-2 min-h-0">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Panier vide</div>
              ) : (
                cart.map((item) => (
                  <div key={`${item.type}-${item.id}`} className={cn("flex flex-col gap-1 p-2 rounded-lg bg-muted/50", item.type === "repair" && "border-l-2 border-primary")}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.type === "repair" && <span className="text-[10px] text-primary">Réparation</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.type === "product" && (
                          <>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.maxStock}><Plus className="h-3 w-3" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === "product" ? (
                        <>
                          {item.discount > 0 && (
                            <span className="text-[10px] line-through text-muted-foreground font-mono-numbers">{format(item.originalPrice)}</span>
                          )}
                          <span className="text-xs font-mono-numbers font-medium">{format(item.price)}</span>
                        </>
                      ) : (
                        <span className="text-xs font-mono-numbers">{format(item.price)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      <span className="text-xs font-medium font-mono-numbers ml-auto">{format(item.price * item.quantity)}</span>
                    </div>
                    {/* Discount row for products */}
                    {item.type === "product" && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[10px] text-muted-foreground shrink-0">Remise:</span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          max={item.discountType === "percent" ? 100 : item.originalPrice}
                          value={item.discount || ""}
                          onChange={(e) => updateItemDiscount(item.id, parseFloat(e.target.value) || 0, item.discountType)}
                          placeholder="0"
                          className="w-16 h-6 text-[10px] text-right font-mono-numbers px-1"
                        />
                        <Button
                          variant={item.discountType === "fixed" ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateItemDiscount(item.id, item.discount, "fixed")}
                        >
                          <DollarSign className="h-2.5 w-2.5" />
                        </Button>
                        <Button
                          variant={item.discountType === "percent" ? "default" : "outline"}
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => updateItemDiscount(item.id, item.discount, "percent")}
                        >
                          <Percent className="h-2.5 w-2.5" />
                        </Button>
                        {item.discount > 0 && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-success/10 text-success">
                            -{item.discountType === "percent" ? `${item.discount}%` : format(item.discount)}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Loyalty redeem */}
            {settings.loyalty_enabled && selectedCustomerEarly && cart.some(i => i.type === "product") && !cart.some(i => i.type === "repair") && (
              <div className="shrink-0 pt-2">
                <LoyaltyRedeemCard
                  customerName={selectedCustomerEarly.name}
                  customerPoints={(selectedCustomerEarly as any).loyalty_points ?? 0}
                  redeemPoints={settings.loyalty_redeem_points || 100}
                  redeemValue={settings.loyalty_redeem_value || 0}
                  minRedeem={settings.loyalty_min_redeem || 100}
                  cartSubtotal={subtotal}
                  pointsUsed={loyaltyPointsUsed}
                  enabled={loyaltyEnabled}
                  onEnabledChange={setLoyaltyEnabled}
                  onPointsUsedChange={setLoyaltyPointsUsed}
                />
              </div>
            )}

            <div className="shrink-0 pt-3 space-y-2">
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-mono-numbers">{format(subtotal)}</span></div>
              {loyaltyDiscount > 0 && (
                <div className="flex justify-between text-sm text-success"><span>Fidélité (-{loyaltyPointsUsed} pts)</span><span className="font-mono-numbers">-{format(loyaltyDiscount)}</span></div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono-numbers text-primary">{format(total)}</span></div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button
                  className="h-12 col-span-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold"
                  disabled={cart.length === 0 || createSale.isPending}
                  onClick={handleQuickPayment}
                >
                  {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
                  Paiement rapide
                  <kbd className="ml-auto text-[10px] font-mono bg-white/20 rounded px-1.5 py-0.5">F1</kbd>
                </Button>
                <Button variant="outline" className="h-12" disabled={cart.length === 0 || createSale.isPending} onClick={() => openPaymentDialog("card")}>
                  <CreditCard className="h-4 w-4 mr-2" />Carte
                  <kbd className="ml-auto text-[10px] font-mono bg-muted rounded px-1.5 py-0.5">F2</kbd>
                </Button>
                <Button className="h-12 bg-gradient-success hover:opacity-90" disabled={cart.length === 0 || createSale.isPending} onClick={() => openPaymentDialog("cash")}>
                  <Banknote className="h-4 w-4 mr-2" />Espèces
                  <kbd className="ml-auto text-[10px] font-mono bg-white/20 rounded px-1.5 py-0.5">F3</kbd>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Confirmation Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {pendingPaymentMethod === "card" ? <CreditCard className="h-5 w-5" /> : <Banknote className="h-5 w-5" />}
              Confirmer le paiement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Total à payer</span>
              <span className="text-lg font-bold font-mono-numbers text-primary">{format(total)}</span>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount-paid">Montant payé</Label>
              <Input
                id="amount-paid"
                type="number"
                step="0.001"
                min="0"
                max={total}
                value={amountPaidInput}
                onChange={(e) => setAmountPaidInput(e.target.value)}
                className="font-mono-numbers text-right text-lg"
                autoFocus
              />
            </div>

            {isPartialPayment && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">Paiement partiel</p>
                    <p className="text-xs text-muted-foreground">
                      Reste à payer: <span className="font-bold font-mono-numbers text-destructive">{format(remainder)}</span>
                    </p>
                  </div>
                </div>
                {!selectedCustomerId && (
                  <p className="text-xs text-destructive font-medium">⚠ Veuillez sélectionner un client pour enregistrer la dette</p>
                )}
                {selectedCustomer && (
                  <p className="text-xs text-muted-foreground">
                    La dette de <span className="font-medium">{selectedCustomer.name}</span> passera de{" "}
                    <span className="font-mono-numbers">{format(selectedCustomer.balance || 0)}</span> à{" "}
                    <span className="font-mono-numbers font-medium text-destructive">{format((selectedCustomer.balance || 0) + remainder)}</span>
                  </p>
                )}
              </div>
            )}

            {selectedCustomer && !isPartialPayment && (
              <p className="text-xs text-muted-foreground">
                Client: <span className="font-medium">{selectedCustomer.name}</span>
                {selectedCustomer.balance > 0 && (
                  <> — Dette actuelle: <span className="font-mono-numbers text-destructive">{format(selectedCustomer.balance)}</span></>
                )}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>Annuler</Button>
            <Button
              onClick={handlePayment}
              disabled={parsedAmountPaid <= 0 || createSale.isPending || (isPartialPayment && !selectedCustomerId)}
              className={isPartialPayment ? "bg-destructive hover:bg-destructive/90" : "bg-gradient-success hover:opacity-90"}
            >
              {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isPartialPayment ? `Encaisser ${format(parsedAmountPaid)}` : "Confirmer le paiement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSubmit={async (data) => {
          const newCustomer = await createCustomer.mutateAsync({ name: data.name, phone: data.phone, email: data.email, address: data.address, notes: data.notes });
          setSelectedCustomerId(newCustomer.id);
          setCustomerDialogOpen(false);
        }}
        isLoading={createCustomer.isPending}
      />
    </div>
  );
}
