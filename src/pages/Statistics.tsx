import { useState } from "react";
import {
  BarChart3,
  TrendingUp,
  Package,
  ShoppingCart,
  Wrench,
  Download,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useStatistics } from "@/hooks/useStatistics";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { toast } from "sonner";
import { PremiumFeature } from "@/components/billing/PremiumFeature";

export default function Statistics() {
  const [period, setPeriod] = useState("month");
  const { data: stats, isLoading } = useStatistics(period);
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  const handleExportPDF = () => {
    if (!stats) {
      toast.error("Aucune donnée à exporter");
      return;
    }

    const content = `
RAPPORT STATISTIQUES - ${settings.shop_name}
Période: ${period === "week" ? "Cette semaine" : period === "month" ? "Ce mois" : period === "quarter" ? "Ce trimestre" : "Cette année"}
Date: ${new Date().toLocaleDateString("fr-TN")}
================================

RÉSUMÉ
------
Ventes: ${stats.totals.salesCount} transactions - ${format(stats.totals.salesRevenue)}
Réparations: ${stats.totals.repairsCount} interventions - ${format(stats.totals.repairsRevenue)}
Total revenus: ${format(stats.totals.salesRevenue + stats.totals.repairsRevenue)}

MEILLEURES VENTES
-----------------
${stats.topProducts.map((p, i) => `${i + 1}. ${p.name} - ${p.sales} unités - ${format(p.revenue)}`).join("\n")}

RÉPARTITION PAR CATÉGORIE
-------------------------
${stats.categoryData.map((c) => `${c.name}: ${c.value}%`).join("\n")}

STATISTIQUES RÉPARATIONS
------------------------
${stats.repairStats.map((r) => `${r.type}: ${r.count} interventions`).join("\n")}

================================
Généré le ${new Date().toLocaleString("fr-TN")}
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statistiques_${period}_${new Date().toISOString().split("T")[0]}.txt`;
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

  const monthlyData = stats?.monthlyData || [];
  const topProducts = stats?.topProducts || [];
  const categoryData = stats?.categoryData || [];
  const repairStats = stats?.repairStats || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Statistiques"
        description="Analyses et rapports détaillés"
      >
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
        <PremiumFeature featureKey="advanced_analytics" featureName="Statistiques Avancées" mode="locked">
          <Button variant="outline" onClick={handleExportPDF}>
            <Download className="h-4 w-4 mr-2" />
            Exporter PDF
          </Button>
        </PremiumFeature>
      </PageHeader>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Évolution des ventes et réparations
          </CardTitle>
          <CardDescription>Comparaison mensuelle</CardDescription>
        </CardHeader>
        <CardContent>
          {monthlyData.length > 0 ? (
            <>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      formatter={(value: number) => format(value)}
                    />
                    <Bar dataKey="ventes" fill="hsl(217, 91%, 40%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="réparations" fill="hsl(187, 72%, 41%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-primary" />
                  <span className="text-sm text-muted-foreground">Ventes</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-accent" />
                  <span className="text-sm text-muted-foreground">Réparations</span>
                </div>
              </div>
            </>
          ) : (
            <div className="h-80 flex items-center justify-center text-muted-foreground">
              Aucune donnée pour cette période
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Meilleures ventes
            </CardTitle>
            <CardDescription>Produits les plus vendus</CardDescription>
          </CardHeader>
          <CardContent>
            {topProducts.length > 0 ? (
              <div className="space-y-3">
                {topProducts.slice(0, 6).map((product, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className={cn(
                      "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                      i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales} unités</p>
                    </div>
                    <span className="font-semibold font-mono-numbers text-sm">
                      {format(product.revenue)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                Aucune vente enregistrée
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Répartition par catégorie
            </CardTitle>
            <CardDescription>Distribution des ventes</CardDescription>
          </CardHeader>
          <CardContent>
            {categoryData.length > 0 ? (
              <>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                        formatter={(value: number) => `${value}%`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {categoryData.map((cat, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded"
                        style={{ backgroundColor: cat.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {cat.name} ({cat.value}%)
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                Aucune donnée disponible
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Repair Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Statistiques réparations
          </CardTitle>
          <CardDescription>Types de réparations les plus fréquents</CardDescription>
        </CardHeader>
        <CardContent>
          {repairStats.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {repairStats.map((stat, i) => (
                <div
                  key={i}
                  className="p-4 rounded-lg bg-muted/50 text-center"
                >
                  <p className="text-2xl font-bold">{stat.count}</p>
                  <p className="text-sm text-muted-foreground">{stat.type}</p>
                  <div className={cn(
                    "flex items-center justify-center gap-1 mt-2 text-xs font-medium",
                    stat.trend >= 0 ? "text-success" : "text-destructive"
                  )}>
                    <TrendingUp className={cn("h-3 w-3", stat.trend < 0 && "rotate-180")} />
                    {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              Aucune réparation enregistrée
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
