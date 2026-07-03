import { Store, Users, Wrench } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AdminStats as AdminStatsType } from "@/hooks/useAdmin";

interface AdminStatsProps {
  stats: AdminStatsType;
}

export function AdminStats({ stats }: AdminStatsProps) {
  const items = [
    { label: "Boutiques", value: stats.total_owners, icon: Store },
    { label: "Employés", value: stats.total_employees, icon: Users },
    { label: "Réparations", value: stats.total_repairs, icon: Wrench },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {items.map((item) => (
        <Card key={item.label}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{item.label}</CardTitle>
            <item.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{item.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
