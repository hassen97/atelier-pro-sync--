import { useState } from "react";
import { Users, UserPlus, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useCurrency } from "@/hooks/useCurrency";
import { useEmployees } from "@/hooks/useEmployeeTransactions";
import { useIsOwner, type TeamMember } from "@/hooks/useTeam";
import { EmployeeDetailSheet } from "@/components/team/EmployeeDetailSheet";

type EmployeeRow = TeamMember & {
  base_salary?: number | null;
  hire_date?: string | null;
  currentBalance?: number;
};

export default function Team() {
  const { data: employees, isLoading } = useEmployees() as { data: EmployeeRow[]; isLoading: boolean };
  const { data: isOwner } = useIsOwner();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<EmployeeRow | null>(null);

  if (!isOwner) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion des Employés" description="Réservé au propriétaire de la boutique." />
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Cette page est réservée au propriétaire.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Employés"
        description="Salaires, avances, primes et remboursements — tout au même endroit."
      >
        <Button onClick={() => navigate("/settings?tab=team")} className="gap-2">
          <UserPlus className="h-4 w-4" />
          Nouvel employé
        </Button>
      </PageHeader>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      ) : employees.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <Users className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <div>
              <h3 className="font-semibold">Aucun employé pour le moment</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Ajoutez votre premier membre d'équipe pour commencer à gérer salaires et avances.
              </p>
            </div>
            <Button onClick={() => navigate("/settings?tab=team")} className="gap-2">
              <UserPlus className="h-4 w-4" />
              Ajouter un membre
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {employees.map((emp) => {
            const name = emp.profile?.full_name || emp.profile?.username || "Sans nom";
            const balance = emp.currentBalance ?? 0;
            // Positive balance => shop has paid this month (advances/salary). Higher = more owed back.
            const balanceColor =
              balance > 0
                ? "text-warning"
                : balance < 0
                ? "text-success"
                : "text-muted-foreground";

            return (
              <Card
                key={emp.id}
                className="cursor-pointer hover:border-primary/40 transition-colors"
                onClick={() => setSelected(emp)}
              >
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold leading-tight">{name}</h3>
                      {emp.profile?.username && (
                        <p className="text-xs text-muted-foreground">@{emp.profile.username}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="capitalize text-xs">
                      {emp.role}
                    </Badge>
                  </div>

                  <div className="pt-2 border-t border-border">
                    <p className="text-xs text-muted-foreground">Solde du mois</p>
                    <p className={`text-xl font-bold ${balanceColor}`}>
                      {balance >= 0 ? "+ " : "- "}
                      {format(Math.abs(balance))}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {balance > 0
                        ? "À déduire de la paie"
                        : balance < 0
                        ? "À ajouter à la paie"
                        : "Aucun mouvement"}
                    </p>
                  </div>

                  <div className="flex items-center justify-end text-xs text-primary">
                    Voir le détail <ArrowRight className="h-3 w-3 ml-1" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <EmployeeDetailSheet
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
        employee={selected}
      />
    </div>
  );
}
