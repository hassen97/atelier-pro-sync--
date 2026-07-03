import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

export function VerifiedBadge({ className, size = "sm" }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <CheckCircle className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
      Verified Pro
    </span>
  );
}
