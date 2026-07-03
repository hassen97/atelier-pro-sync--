import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Loader2, CheckCircle2, Truck } from "lucide-react";
import { cn } from "@/lib/utils";

export type RepairStatus = "pending" | "in_progress" | "completed" | "delivered";

interface RepairStatusSelectProps {
  value: RepairStatus;
  onValueChange: (value: RepairStatus) => void;
  disabled?: boolean;
}

export const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  in_progress: {
    label: "En cours",
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Terminé",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  delivered: {
    label: "Livré",
    icon: Truck,
    className: "bg-accent/10 text-accent border-accent/20",
  },
};

export function RepairStatusSelect({
  value,
  onValueChange,
  disabled = false,
}: RepairStatusSelectProps) {
  const currentStatus = statusConfig[value];
  const CurrentIcon = currentStatus.icon;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className={cn("w-[180px]", currentStatus.className)}>
        <SelectValue>
          <div className="flex items-center gap-2">
            <CurrentIcon className="h-4 w-4" />
            {currentStatus.label}
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {Object.entries(statusConfig).map(([key, config]) => {
          const Icon = config.icon;
          return (
            <SelectItem key={key} value={key}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {config.label}
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
