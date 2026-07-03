import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Repair } from "./RepairCard";

interface CancelRepairDialogProps {
  repair: Repair | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export function CancelRepairDialog({
  repair,
  open,
  onOpenChange,
  onConfirm,
}: CancelRepairDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Annuler cette réparation ?</AlertDialogTitle>
          <AlertDialogDescription>
            {repair && (
              <>
                Êtes-vous sûr de vouloir annuler la réparation{" "}
                <strong>{repair.id}</strong> pour{" "}
                <strong>{repair.customer}</strong> ?
                <br />
                <br />
                Appareil: {repair.device}
                <br />
                Problème: {repair.issue}
                <br />
                <br />
                Cette action est irréversible.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Non, garder</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Oui, annuler
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
