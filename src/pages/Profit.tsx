import { useState, useMemo } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Wrench,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  CalendarIcon,
} from "lucide-react";
import { format as formatDate, startOfMonth, endOfMonth } from "date-fns";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useProfit } from "@/hooks/useProfit";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useCurrency } from "@/hooks/useCurrency";
import { toast } from "sonner";

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

export default function Profit() {
  const [period, setPeriod] = useState("month");
  const now = new Date();
  const [pickedMonth, setPickedMonth] = useState(now.getMonth());
  const [pickedYear, setPickedYear] = useState(now.getFullYear());
  const [customFrom, setCustomFrom] = useState<Date | undefined>(startOfMonth(now));
  const [customTo, setCustomTo] = useState<Date | undefined>(now);

  const profitParam = useMemo(() => {
    if (period === "specific_month") {
      const from = startOfMonth(new Date(pickedYear, pickedMonth, 1));
      const to = endOfMonth(from);
      return { from, to };
    }
    if (period === "custom" && customFrom && customTo) {
      return { from: customFrom, to: customTo };
    }
    return period;
  }, [period, pickedMonth, pickedYear, customFrom, customTo]);

  const { data: profitData, isLoading } = useProfit(profitParam as any);
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  const periodLabel = useMemo(() => {
    switch (period) {
      case "today": return "Aujourd'hui";
      case "week": return "Cette semaine";
      case "month": return "Ce mois";
      case "quarter": return "Ce trimestre";
      case "year": return "Cette année";
      case "specific_month": return `${MONTHS_FR[pickedMonth]} ${pickedYear}`;
      case "custom":
        if (customFrom && customTo)
          return `${formatDate(customFrom, "dd/MM/yyyy")} → ${formatDate(customTo, "dd/MM/yyyy")}`;
        return "Période personnalisée";
      default: return period;
    }
  }, [period, pickedMonth, pickedYear, customFrom, customTo]);

  const handleExport = () => {
    if (!profitData) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const content = `
RAPPORT PROFIT & COMPTABILITÉ - ${settings.shop_name}
Période: ${periodLabel}
Date: ${new Date().toLocaleDateString("fr-TN")}
================================

REVENUS
-------
Ventes produits: ${format(profitData.revenue.sales)}
Réparations: ${format(profitData.revenue.repairs)}
Total revenus: ${format(profitData.revenue.total)}

DÉPENSES
--------
Achats stock: ${format(profitData.expenses.stock)}
Charges fixes: ${format(profitData.expenses.fixed)}
Autres dépenses: ${format(profitData.expenses.other)}
Total dépenses: ${format(profitData.expenses.total)}

RÉSULTAT
--------
Bénéfice net: ${format(profitData.profit)}
Marge bénéficiaire: ${profitData.profitMargin.toFixed(1)}%

MARGES PAR PRODUIT
------------------
${profitData.productMargins.map((p) => `${p.name}: ${p.margin.toFixed(0)}% (${p.sales} ventes)`).join("\n")}

MARGES PAR RÉPARATION
---------------------
${profitData.repairMargins.map((r) => `${r.type}: ${r.margin.toFixed(0)}% (${r.count} interventions)`).join("\n")}

================================
Généré le ${new Date().toLocaleString("fr-TN")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `profit_${period}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport exporté");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const data = profitData || {
    revenue: { sales: 0, repairs: 0, total: 0 },
    expenses: { stock: 0, fixed: 0, other: 0, total: 0 },
    profit: 0,
    profitMargin: 0,
    revenueTrend: 0,
    profitTrend: 0,
    productMargins: [],
    repairMargins: [],
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Profit & Comptabilité"
        description="Analyse des revenus, dépenses et marges"
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Aujourd'hui</SelectItem>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
            <SelectItem value="specific_month">Mois spécifique</SelectItem>
            <SelectItem value="custom">Période personnalisée</SelectItem>
          </SelectContent>
        </Select>

        {period === "specific_month" && (
          <div className="flex items-center gap-2">
            <Select value={String(pickedMonth)} onValueChange={(v) => setPickedMonth(Number(v))}>
              <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS_FR.map((m, i) => (
                  <SelectItem key={i} value={String(i)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(pickedYear)} onValueChange={(v) => setPickedYear(Number(v))}>
              <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 6 }).map((_, idx) => {
                  const y = now.getFullYear() - idx;
                  return <SelectItem key={y} value={String(y)}>{y}</SelectItem>;
                })}
              </SelectContent>
            </Select>
          </div>
        )}

        {period === "custom" && (
          <div className="flex items-center gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !customFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customFrom ? formatDate(customFrom, "dd/MM/yyyy") : "Du"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customFrom} onSelect={setCustomFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <span className="text-muted-foreground">→</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("justify-start text-left font-normal", !customTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {customTo ? formatDate(customTo, "dd/MM/yyyy") : "Au"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={customTo} onSelect={setCustomTo} disabled={(d) => customFrom ? d < customFrom : false} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
        )}
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
      </PageHeader>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires"
          value={format(data.revenue.total)}
          icon={TrendingUp}
          trend={data.revenueTrend !== 0 ? { value: Math.round(data.revenueTrend * 10) / 10, label: "vs période précédente" } : undefined}
          variant="success"
        />
        <StatCard
          title="Dépenses totales"
          value={format(data.expenses.total)}
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Bénéfice net"
          value={format(data.profit)}
          icon={DollarSign}
          trend={data.profitTrend !== 0 ? { value: Math.round(data.profitTrend * 10) / 10, label: "vs période précédente" } : undefined}
          variant={data.profit >= 0 ? "success" : "destructive"}
        />
        <StatCard
          title="Marge bénéficiaire"
          value={`${data.profitMargin.toFixed(1)}%`}
          icon={TrendingUp}
          variant="accent"
        />
      </div>

      {/* Revenue & Expenses Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-5 w-5 text-success" />
              Revenus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Ventes produits</p>
                  <p className="text-sm text-muted-foreground">Accessoires et pièces</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-success">
                +{format(data.revenue.sales)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Réparations</p>
                  <p className="text-sm text-muted-foreground">Main d'œuvre et services</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-success">
                +{format(data.revenue.repairs)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total revenus</span>
                <span className="font-bold font-mono-numbers text-lg text-success">
                  {format(data.revenue.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="h-5 w-5 text-destructive" />
              Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Achats stock</p>
                  <p className="text-sm text-muted-foreground">Pièces et accessoires</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-destructive">
                -{format(data.expenses.stock)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Charges fixes</p>
                  <p className="text-sm text-muted-foreground">Loyer, électricité, etc.</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-destructive">
                -{format(data.expenses.fixed)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Autres dépenses</p>
                  <p className="text-sm text-muted-foreground">Marketing, divers</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers">
                -{format(data.expenses.other)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total dépenses</span>
                <span className="font-bold font-mono-numbers text-lg text-destructive">
                  {format(data.expenses.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margins Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marges par produit</CardTitle>
            <CardDescription>Top produits vendus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.productMargins.length > 0 ? (
              data.productMargins.map((product, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {format(product.cost)} → {format(product.price)} • {product.sales} ventes
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 ml-3",
                      product.margin >= 100
                        ? "bg-success/10 text-success border-success/20"
                        : product.margin >= 50
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    +{product.margin.toFixed(0)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Aucune vente enregistrée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Repair Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marges par type de réparation</CardTitle>
            <CardDescription>Analyse de rentabilité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.repairMargins.length > 0 ? (
              data.repairMargins.map((repair, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{repair.type}</p>
                    <p className="text-xs text-muted-foreground">
                      Moy: {format(repair.avgRevenue)} • Coût: {format(repair.avgCost)} • {repair.count} réparations
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "shrink-0 ml-3",
                      repair.margin >= 100
                        ? "bg-success/10 text-success border-success/20"
                        : repair.margin >= 50
                        ? "bg-accent/10 text-accent border-accent/20"
                        : "bg-warning/10 text-warning border-warning/20"
                    )}
                  >
                    +{repair.margin.toFixed(0)}%
                  </Badge>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Aucune réparation enregistrée
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
