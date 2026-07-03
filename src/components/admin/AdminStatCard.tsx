import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface AdminStatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red";
  subtitle?: string;
}

export function AdminStatCard({ title, value, icon: Icon, color = "blue", subtitle }: AdminStatCardProps) {
  const colorMap = {
    blue: "admin-neon-blue-glow",
    green: "admin-neon-green-glow",
    amber: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
    red: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
  };
  const textColorMap = {
    blue: "admin-neon-blue",
    green: "admin-neon-green",
    amber: "text-amber-400",
    red: "text-red-400",
  };
  const iconBgMap = {
    blue: "bg-[#00D4FF]/10",
    green: "bg-emerald-500/10",
    amber: "bg-amber-500/10",
    red: "bg-red-500/10",
  };

  return (
    <div className={cn("admin-glass-card rounded-xl p-5 transition-all hover:scale-[1.02]", colorMap[color])}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn("p-2.5 rounded-lg", iconBgMap[color])}>
          <Icon className={cn("h-5 w-5", textColorMap[color])} />
        </div>
      </div>
      <p className={cn("text-2xl font-bold font-mono-numbers", textColorMap[color])}>{value}</p>
      <p className="text-sm text-slate-400 mt-1">{title}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
    </div>
  );
}
