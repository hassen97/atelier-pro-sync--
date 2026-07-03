import { useMemo, useState } from "react";
import { useServices, SERVICE_CATEGORIES, type ServiceRow } from "@/hooks/useServices";
import { ServiceCard } from "@/components/services/ServiceCard";
import { RequestServiceDialog } from "@/components/services/RequestServiceDialog";
import { MyRequestsTable } from "@/components/services/MyRequestsTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Services() {
  const { data: services = [], isLoading } = useServices();
  const [tab, setTab] = useState<"catalog" | "history">("catalog");
  const [category, setCategory] = useState<string>("all");
  const [selected, setSelected] = useState<ServiceRow | null>(null);
  const [open, setOpen] = useState(false);

  const filtered = useMemo(
    () => (category === "all" ? services : services.filter((s) => s.category === category)),
    [services, category],
  );

  return (
    <div className="p-4 sm:p-6 space-y-4 max-w-7xl mx-auto w-full">
      <PageHeader
        title="Services & Outils"
        description="FRP, KG, MDM bypass et location d'outils — demandes traitées par notre équipe."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="catalog">Catalogue</TabsTrigger>
          <TabsTrigger value="history">Mes demandes</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4 mt-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant={category === "all" ? "default" : "outline"} onClick={() => setCategory("all")}>
              Tout
            </Button>
            {SERVICE_CATEGORIES.map((c) => (
              <Button
                key={c.value}
                size="sm"
                variant={category === c.value ? "default" : "outline"}
                onClick={() => setCategory(c.value)}
              >
                {c.label}
              </Button>
            ))}
          </div>

          {isLoading ? (
            <div className="text-sm text-muted-foreground p-8 text-center">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="text-sm text-muted-foreground p-12 text-center border rounded-lg">
              Aucun service disponible dans cette catégorie pour le moment.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filtered.map((s) => (
                <ServiceCard
                  key={s.id}
                  service={s}
                  onRequest={() => { setSelected(s); setOpen(true); }}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <MyRequestsTable />
        </TabsContent>
      </Tabs>

      <RequestServiceDialog
        service={selected}
        open={open}
        onOpenChange={setOpen}
        onSubmitted={() => setTab("history")}
      />
    </div>
  );
}
