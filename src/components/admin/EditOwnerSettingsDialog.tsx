import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface EditOwnerSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentCountry: string;
  currentCurrency: string;
}

export function EditOwnerSettingsDialog({ open, onOpenChange, userId, userName, currentCountry, currentCurrency }: EditOwnerSettingsDialogProps) {
  const [country, setCountry] = useState(currentCountry);
  const [currency, setCurrency] = useState(currentCurrency);
  const queryClient = useQueryClient();

  const updateSettings = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-settings", userId, country, currency },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Paramètres mis à jour");
      onOpenChange(false);
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const defaultCurrency = getCurrencyForCountry(val);
    if (defaultCurrency) setCurrency(defaultCurrency.code);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier les paramètres de {userName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Pays</Label>
            <Select value={country} onValueChange={handleCountryChange}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {countries.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Devise</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {currencies.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={() => updateSettings.mutate()} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
