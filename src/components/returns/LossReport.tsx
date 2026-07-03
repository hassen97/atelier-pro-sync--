import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useWarrantyTickets, useDefectiveParts } from "@/hooks/useWarranty";
import { useProductReturns } from "@/hooks/useProductReturns";
import { useExpenses } from "@/hooks/useExpenses";
import { useCurrency } from "@/hooks/useCurrency";
import { TrendingDown } from "lucide-react";

export function LossReport() {
  const { data: tickets = [] } = useWarrantyTickets();
  const { data: parts = [] } = useDefectiveParts();
  const { data: returns = [] } = useProductReturns();
  const { data: expenses = [] } = useExpenses();
  const { format } = useCurrency();

  // Filter warranty-related expenses
  const warrantyExpenses = (expenses as any[]).filter(
    (e: any) => e.category === "Perte garantie" || e.category === "Remboursement client"
  );

  // Monthly loss data (last 6 months)
  const months: { label: string; warranty: number; refunds: number; rma: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });

    const warrantyCost = (tickets as any[])
      .filter((t: any) => t.created_at?.startsWith(key))
      .reduce((sum: number, t: any) => sum + Number(t.total_cost || 0), 0);

    const refundCost = (returns as any[])
      .filter((r: any) => r.created_at?.startsWith(key))
      .reduce((sum: number, r: any) => sum + Number(r.refund_amount || 0), 0);

    const rmaCost = (parts as any[])
      .filter((p: any) => p.status === "written_off" && p.created_at?.startsWith(key))
      .reduce((sum: number) => sum + 1, 0); // count, not monetary

    months.push({ label, warranty: warrantyCost, refunds: refundCost, rma: rmaCost });
  }

  const totalLoss = months.reduce((s, m) => s + m.warranty + m.refunds, 0);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingDown className="h-4 w-4 text-destructive" />
          Rapport de pertes (6 derniers mois)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Total pertes</p>
            <p className="text-lg font-bold font-mono-numbers text-destructive">{format(totalLoss)}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Tickets garantie</p>
            <p className="text-lg font-bold font-mono-numbers">{(tickets as any[]).length}</p>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground">Retours produits</p>
            <p className="text-lg font-bold font-mono-numbers">{(returns as any[]).length}</p>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months}>
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value: number) => format(value)} />
              <Bar dataKey="warranty" name="Garantie" fill="hsl(var(--destructive))" radius={[2, 2, 0, 0]} />
              <Bar dataKey="refunds" name="Remboursements" fill="hsl(var(--warning))" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
