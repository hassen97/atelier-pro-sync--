import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { UserCheck, Wrench } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { useTeamMembers } from "@/hooks/useTeam";

interface StatusAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { received_by: string; repaired_by: string }) => void;
  isLoading?: boolean;
}

export function StatusAssignDialog({ open, onOpenChange, onConfirm, isLoading }: StatusAssignDialogProps) {
  const [receivedBy, setReceivedBy] = useState("");
  const [repairedBy, setRepairedBy] = useState("");
  const { data: teamMembers } = useTeamMembers();

  const memberOptions = useMemo(() => {
    return (teamMembers || []).map((m) => {
      const name = m.profile?.full_name || m.profile?.username || "";
      return { value: name, label: name };
    }).filter((o) => o.value);
  }, [teamMembers]);

  const handleConfirm = () => {
    onConfirm({ received_by: receivedBy.trim(), repaired_by: repairedBy.trim() });
    setReceivedBy("");
    setRepairedBy("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Passer en cours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Reçu par
            </Label>
            <Combobox
              options={memberOptions}
              value={receivedBy}
              onValueChange={setReceivedBy}
              placeholder="Nom de la personne"
              searchPlaceholder="Rechercher ou saisir..."
              emptyText="Aucun membre trouvé."
              allowCustomValue
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Réparé par (technicien)
            </Label>
            <Combobox
              options={memberOptions}
              value={repairedBy}
              onValueChange={setRepairedBy}
              placeholder="Nom du technicien"
              searchPlaceholder="Rechercher ou saisir..."
              emptyText="Aucun membre trouvé."
              allowCustomValue
            />
          </div>
          <Button onClick={handleConfirm} className="w-full" disabled={isLoading}>
            {isLoading ? "Mise à jour..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
