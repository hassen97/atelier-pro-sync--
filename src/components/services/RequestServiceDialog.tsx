import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
import { useCreateServiceRequest } from "@/hooks/useServiceRequests";
import type { ServiceRow } from "@/hooks/useServices";

export function RequestServiceDialog({
  service,
  open,
  onOpenChange,
  onSubmitted,
}: {
  service: ServiceRow | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSubmitted?: () => void;
}) {
  const { format } = useCurrency();
  const create = useCreateServiceRequest();
  const [imei, setImei] = useState("");
  const [model, setModel] = useState("");
  const [notes, setNotes] = useState("");
  const [extras, setExtras] = useState<Record<string, string>>({});

  if (!service) return null;

  const handleSubmit = async () => {
    if (service.requires_imei && !imei.trim()) return;
    const input_data: Record<string, any> = {};
    if (service.requires_imei) input_data.imei = imei.trim();
    if (service.requires_model) input_data.model = model.trim();
    for (const f of service.extra_fields || []) {
      const v = extras[f.key];
      if (f.required && !v?.trim()) return;
      if (v) input_data[f.key] = v;
    }
    if (notes.trim()) input_data.notes = notes.trim();

    await create.mutateAsync({
      service_id: service.id,
      service_name_snapshot: service.name,
      service_price_snapshot: Number(service.price),
      input_data,
    });
    setImei(""); setModel(""); setNotes(""); setExtras({});
    onOpenChange(false);
    onSubmitted?.();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Demander : {service.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="rounded-lg bg-muted/40 p-3 text-sm flex items-center justify-between">
            <span>Prix</span>
            <span className="font-bold text-primary">{format(Number(service.price))}</span>
          </div>
          {service.requires_imei && (
            <div className="space-y-1.5">
              <Label>IMEI / Serial Number *</Label>
              <Input value={imei} onChange={(e) => setImei(e.target.value)} placeholder="Ex: 359384101234567" />
            </div>
          )}
          {service.requires_model && (
            <div className="space-y-1.5">
              <Label>Modèle</Label>
              <Input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Ex: iPhone 13 Pro" />
            </div>
          )}
          {(service.extra_fields || []).map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}{f.required ? " *" : ""}</Label>
              <Input
                value={extras[f.key] ?? ""}
                onChange={(e) => setExtras((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          <div className="space-y-1.5">
            <Label>Notes (optionnel)</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={create.isPending}>
            {create.isPending ? "Envoi..." : "Envoyer la demande"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
