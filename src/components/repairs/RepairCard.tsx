import { Phone, Wrench as WrenchIcon, Calendar, MoreHorizontal, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { statusConfig, type RepairStatus } from "./RepairStatusSelect";

export interface Repair {
  id: string; customer: string; phone: string; device: string; imei?: string;
  issue: string; diagnosis?: string; notes?: string; status: RepairStatus;
  depositDate: string; estimatedDate?: string; deliveredDate?: string;
  parts: { name: string; cost: number }[]; labor: number; total: number; paid: number;
  is_warranty?: boolean;
  tracking_token?: string;
  estimated_ready_date?: string | null;
  technician_note?: string | null;
  ticket_number?: number | null;
  ticket_label?: string;
}

interface RepairCardProps {
  repair: Repair;
  onViewDetails: (repair: Repair) => void;
  onEdit: (repair: Repair) => void;
  onPrint: (repair: Repair) => void;
  onCancel: (repair: Repair) => void;
  onStatusChange: (repair: Repair, newStatus: RepairStatus) => void;
}

export function RepairCard({ repair, onViewDetails, onEdit, onPrint, onCancel, onStatusChange }: RepairCardProps) {
  const status = statusConfig[repair.status];
  const StatusIcon = status.icon;
  const remaining = repair.total - repair.paid;
  const { format } = useCurrency();

  return (
    <Card className={cn(
      "hover:shadow-soft transition-shadow",
      repair.is_warranty && "border-orange-500/40 bg-orange-500/5"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {repair.ticket_label ? (
                <span className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                  {repair.ticket_label}
                </span>
              ) : (
                <span className="font-mono text-xs text-muted-foreground">{repair.id.slice(0, 8).toUpperCase()}</span>
              )}
              {repair.is_warranty && (
                <Badge className="text-xs bg-orange-500/10 text-orange-500 border-orange-500/20">
                  <Shield className="h-3 w-3 mr-1" />Garantie
                </Badge>
              )}
              <Badge className={cn("text-xs", status.className)}><StatusIcon className="h-3 w-3 mr-1" />{status.label}</Badge>
            </div>
            <h3 className="font-semibold mt-1">{repair.customer}</h3>
            {repair.phone && <p className="text-sm text-muted-foreground mt-0.5">{repair.phone}</p>}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(repair)}>Voir détails</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(repair)}>Modifier</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onPrint(repair)}>Imprimer fiche</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled={repair.status === "pending"} onClick={() => onStatusChange(repair, "pending")}>→ En attente</DropdownMenuItem>
              <DropdownMenuItem disabled={repair.status === "in_progress"} onClick={() => onStatusChange(repair, "in_progress")}>→ En cours</DropdownMenuItem>
              <DropdownMenuItem disabled={repair.status === "completed"} onClick={() => onStatusChange(repair, "completed")}>→ Terminé</DropdownMenuItem>
              <DropdownMenuItem disabled={repair.status === "delivered"} onClick={() => onStatusChange(repair, "delivered")}>→ Livré</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onCancel(repair)}>Annuler</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" /><span>{repair.device}</span></div>
          <div className="flex items-center gap-2 text-sm"><WrenchIcon className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">{repair.issue}</span></div>
          <div className="flex items-center gap-2 text-sm"><Calendar className="h-4 w-4 text-muted-foreground" /><span className="text-muted-foreground">Dépôt: {new Date(repair.depositDate).toLocaleDateString("fr-TN")}</span></div>
          {repair.estimated_ready_date && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <Calendar className="h-4 w-4" />
              <span className="font-medium">Prêt estimé: {new Date(repair.estimated_ready_date).toLocaleDateString("fr-TN")}</span>
            </div>
          )}
          {repair.technician_note && <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200 italic">💬 {repair.technician_note}</div>}
          {repair.notes && <div className="text-xs text-muted-foreground bg-muted/50 p-2 rounded italic">📝 {repair.notes}</div>}
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div>
            <span className="text-sm text-muted-foreground">Total: </span>
            <span className="font-bold font-mono-numbers">{format(repair.total)}</span>
          </div>
          {remaining > 0 && <Badge variant="destructive" className="text-xs">Reste: {format(remaining)}</Badge>}
          {remaining === 0 && repair.paid > 0 && <Badge className="bg-success/10 text-success border-success/20 text-xs">Payé</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
