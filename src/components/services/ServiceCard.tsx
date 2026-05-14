import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";
import { Cloud, Wrench } from "lucide-react";
import type { ServiceRow } from "@/hooks/useServices";
import { SERVICE_CATEGORIES } from "@/hooks/useServices";

export function ServiceCard({ service, onRequest }: { service: ServiceRow; onRequest: () => void }) {
  const { format } = useCurrency();
  const catLabel = SERVICE_CATEGORIES.find((c) => c.value === service.category)?.label ?? service.category;
  const Icon = service.type === "tool_rental" ? Wrench : Cloud;
  return (
    <Card className="flex flex-col hover:border-primary/40 transition-colors">
      <CardContent className="p-4 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
              <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm truncate">{service.name}</h3>
              <Badge variant="secondary" className="mt-1 text-[10px]">{catLabel}</Badge>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-base font-bold text-primary">{format(Number(service.price))}</div>
          </div>
        </div>
        {service.description && (
          <p className="text-xs text-muted-foreground line-clamp-3">{service.description}</p>
        )}
        <div className="mt-auto pt-2">
          <Button onClick={onRequest} className="w-full" size="sm">Demander</Button>
        </div>
      </CardContent>
    </Card>
  );
}
