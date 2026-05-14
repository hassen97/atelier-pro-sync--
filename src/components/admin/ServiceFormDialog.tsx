import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUpsertService, SERVICE_CATEGORIES, type ServiceRow } from "@/hooks/useServices";

export function ServiceFormDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  service: ServiceRow | null;
}) {
  const upsert = useUpsertService();
  const [form, setForm] = useState({
    name: "",
    type: "service" as "service" | "tool_rental",
    category: "frp",
    price: 0,
    description: "",
    is_active: true,
    requires_imei: true,
    requires_model: false,
  });

  useEffect(() => {
    if (service) {
      setForm({
        name: service.name,
        type: service.type,
        category: service.category,
        price: Number(service.price),
        description: service.description ?? "",
        is_active: service.is_active,
        requires_imei: service.requires_imei,
        requires_model: service.requires_model,
      });
    } else {
      setForm({ name: "", type: "service", category: "frp", price: 0, description: "", is_active: true, requires_imei: true, requires_model: false });
    }
  }, [service, open]);

  const submit = async () => {
    if (!form.name.trim()) return;
    await upsert.mutateAsync({ id: service?.id, ...form });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{service ? "Modifier le service" : "Nouveau service"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Nom *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm({ ...form, type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="service">Service</SelectItem>
                  <SelectItem value="tool_rental">Location d'outil</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Catégorie</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SERVICE_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Prix</Label>
            <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Actif</Label>
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Demander l'IMEI / Serial</Label>
            <Switch checked={form.requires_imei} onCheckedChange={(v) => setForm({ ...form, requires_imei: v })} />
          </div>
          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label>Demander le modèle</Label>
            <Switch checked={form.requires_model} onCheckedChange={(v) => setForm({ ...form, requires_model: v })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={submit} disabled={upsert.isPending || !form.name.trim()}>
            {upsert.isPending ? "..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
