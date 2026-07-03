import { useFeatureFlags, useToggleFeatureFlag } from "@/hooks/useFeatureFlags";
import { useAdminPlans } from "@/hooks/useSubscriptionPlans";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

export function AdminFeatureFlagsView() {
  const { data: flagsData, isLoading: flagsLoading } = useFeatureFlags();
  const { data: plansData, isLoading: plansLoading } = useAdminPlans();
  const toggleFlag = useToggleFeatureFlag();

  if (flagsLoading || plansLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const flags = flagsData?.flags || [];
  const assignments = flagsData?.assignments || [];
  const plans = plansData?.plans || [];

  const isAssigned = (planId: string, flagId: string) =>
    assignments.some(a => a.plan_id === planId && a.feature_flag_id === flagId);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-white">Feature Flags par Plan</h2>
        <p className="text-sm text-slate-400 mt-1">Contrôlez l'accès aux fonctionnalités selon le tier d'abonnement</p>
      </div>

      <div className="admin-glass-card rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left text-slate-400 text-xs font-medium px-4 py-3 w-48">Fonctionnalité</th>
                {plans.map(plan => (
                  <th key={plan.id} className="text-center text-slate-400 text-xs font-medium px-4 py-3 min-w-[100px]">
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {flags.map(flag => (
                <tr key={flag.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <div>
                      <span className="text-white text-sm">{flag.feature_name}</span>
                      {flag.description && (
                        <p className="text-slate-500 text-xs mt-0.5">{flag.description}</p>
                      )}
                    </div>
                  </td>
                  {plans.map(plan => (
                    <td key={plan.id} className="px-4 py-3 text-center">
                      <Checkbox
                        checked={isAssigned(plan.id, flag.id)}
                        onCheckedChange={(checked) => {
                          toggleFlag.mutate({
                            planId: plan.id,
                            featureFlagId: flag.id,
                            enabled: !!checked,
                          });
                        }}
                        className="border-white/20 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
