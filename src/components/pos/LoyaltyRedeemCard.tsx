import { useMemo } from "react";
import { Sparkles, Minus, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCurrency } from "@/hooks/useCurrency";

interface LoyaltyRedeemCardProps {
  customerName: string;
  customerPoints: number;
  redeemPoints: number;     // points per discount block
  redeemValue: number;      // currency per block
  minRedeem: number;
  cartSubtotal: number;
  pointsUsed: number;
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  onPointsUsedChange: (v: number) => void;
}

export function LoyaltyRedeemCard({
  customerName,
  customerPoints,
  redeemPoints,
  redeemValue,
  minRedeem,
  cartSubtotal,
  pointsUsed,
  enabled,
  onEnabledChange,
  onPointsUsedChange,
}: LoyaltyRedeemCardProps) {
  const { format } = useCurrency();

  const maxByBalance = Math.floor(customerPoints / redeemPoints) * redeemPoints;
  const maxByCart = Math.floor((cartSubtotal / redeemValue)) * redeemPoints;
  const maxUsable = Math.max(0, Math.min(maxByBalance, maxByCart));

  const discount = useMemo(
    () => (pointsUsed / redeemPoints) * redeemValue,
    [pointsUsed, redeemPoints, redeemValue]
  );

  if (customerPoints < minRedeem) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="font-medium">{customerName}</span>
            <Badge variant="outline" className="ml-auto font-mono-numbers">{customerPoints} pts</Badge>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1">
            Minimum {minRedeem} points pour utiliser la fidélité.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-3 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold flex-1 truncate">{customerName}</span>
          <Badge variant="outline" className="font-mono-numbers">{customerPoints} pts</Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs">Utiliser mes points</span>
          <Switch checked={enabled} onCheckedChange={(v) => { onEnabledChange(v); if (!v) onPointsUsedChange(0); }} />
        </div>
        {enabled && maxUsable > 0 && (
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pointsUsed <= 0}
                onClick={() => onPointsUsedChange(Math.max(0, pointsUsed - redeemPoints))}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <div className="flex-1 text-center text-xs font-mono-numbers">
                {pointsUsed} / {maxUsable} pts
              </div>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                disabled={pointsUsed >= maxUsable}
                onClick={() => onPointsUsedChange(Math.min(maxUsable, pointsUsed + redeemPoints))}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
            {pointsUsed > 0 && (
              <div className="flex justify-between text-xs font-medium text-success">
                <span>Réduction appliquée</span>
                <span className="font-mono-numbers">-{format(discount)}</span>
              </div>
            )}
          </div>
        )}
        {enabled && maxUsable === 0 && (
          <p className="text-[11px] text-muted-foreground">
            Le panier est trop petit pour utiliser des points.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
