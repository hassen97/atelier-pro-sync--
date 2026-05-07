import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Banknote, Gift, Receipt as ReceiptIcon, Wallet, Wrench, ShoppingCart, Pencil, Check, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useCurrency } from "@/hooks/useCurrency";
import { useEmployeeTransactions, useEmployeeMonthlyStats, useUpdateTeamMemberHr, useDeleteEmployeeTransaction, type EmployeeTxType, type EmployeeTransaction } from "@/hooks/useEmployeeTransactions";
import { EmployeeTransactionDialog } from "./EmployeeTransactionDialog";
import { EditEmployeeTransactionDialog } from "./EditEmployeeTransactionDialog";
import type { TeamMember } from "@/hooks/useTeam";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  employee: (TeamMember & { base_salary?: number | null; hire_date?: string | null; currentBalance?: number }) | null;
}

const TYPE_META: Record<EmployeeTxType, { label: string; icon: any; cls: string; sign: 1 | -1 }> = {
  avance_salaire: { label: "Avance", icon: Banknote, cls: "bg-warning/10 text-warning border-warning/20", sign: -1 },
  prime_bonus: { label: "Prime", icon: Gift, cls: "bg-success/10 text-success border-success/20", sign: 1 },
  remboursement_frais: { label: "Remboursement", icon: ReceiptIcon, cls: "bg-primary/10 text-primary border-primary/20", sign: 1 },
  salary_payment: { label: "Salaire payé", icon: Wallet, cls: "bg-muted text-muted-foreground border-border", sign: -1 },
};

export function EmployeeDetailSheet({ open, onOpenChange, employee }: Props) {
  const { format } = useCurrency();
  const employeeId = employee?.member_user_id ?? null;
  const employeeName = employee?.profile?.full_name || employee?.profile?.username || "Employé";

  const { data: txs = [], isLoading } = useEmployeeTransactions(employeeId);
  const { data: stats } = useEmployeeMonthlyStats(employeeId, employeeName);
  const updateHr = useUpdateTeamMemberHr();

  const [dialogType, setDialogType] = useState<EmployeeTxType | null>(null);
  const [editHr, setEditHr] = useState(false);
  const [salary, setSalary] = useState<string>(employee?.base_salary != null ? String(employee.base_salary) : "0");
  const [hireDate, setHireDate] = useState<string>(employee?.hire_date ?? "");
  const [editTx, setEditTx] = useState<EmployeeTransaction | null>(null);
  const [deleteTx, setDeleteTx] = useState<EmployeeTransaction | null>(null);
  const deleteMutation = useDeleteEmployeeTransaction();

  // monthly settlement
  const monthSummary = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const inMonth = txs.filter((t) => t.transaction_date >= monthStart);
    const sum = (type: EmployeeTxType) => inMonth.filter((t) => t.type === type).reduce((a, t) => a + Number(t.amount), 0);
    return {
      avances: sum("avance_salaire"),
      primes: sum("prime_bonus"),
      remboursements: sum("remboursement_frais"),
      salaryPaid: sum("salary_payment"),
    };
  }, [txs]);

  const baseSalary = Number(employee?.base_salary ?? 0);
  const netToPay = baseSalary - monthSummary.avances + monthSummary.primes + monthSummary.remboursements - monthSummary.salaryPaid;

  if (!employee) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-2xl">{employeeName}</SheetTitle>
            <SheetDescription>
              <Badge variant="outline" className="capitalize">{employee.role}</Badge>
              {employee.profile?.username && (
                <span className="ml-2 text-xs text-muted-foreground">@{employee.profile.username}</span>
              )}
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogType("avance_salaire")}>
              <Banknote className="h-4 w-4" /> Avance
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogType("prime_bonus")}>
              <Gift className="h-4 w-4" /> Prime
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5" onClick={() => setDialogType("remboursement_frais")}>
              <ReceiptIcon className="h-4 w-4" /> Remboursement
            </Button>
          </div>

          <Tabs defaultValue="settlement" className="space-y-4">
            <TabsList className="w-full">
              <TabsTrigger value="settlement" className="flex-1">Clôture</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">Historique</TabsTrigger>
              <TabsTrigger value="profile" className="flex-1">Profil</TabsTrigger>
              <TabsTrigger value="perf" className="flex-1">Perf.</TabsTrigger>
            </TabsList>

            {/* Settlement */}
            <TabsContent value="settlement" className="space-y-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Clôture du mois</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <Row label="Salaire de base" value={format(baseSalary)} />
                  <Row label="Avances" value={`- ${format(monthSummary.avances)}`} negative={monthSummary.avances > 0} />
                  <Row label="Remboursements" value={`+ ${format(monthSummary.remboursements)}`} positive={monthSummary.remboursements > 0} />
                  <Row label="Primes" value={`+ ${format(monthSummary.primes)}`} positive={monthSummary.primes > 0} />
                  <Row label="Salaires déjà payés" value={`- ${format(monthSummary.salaryPaid)}`} negative={monthSummary.salaryPaid > 0} />
                  <div className="pt-2 mt-2 border-t border-border flex items-center justify-between">
                    <span className="font-semibold">Net à payer</span>
                    <span className={`text-lg font-bold ${netToPay > 0 ? "text-success" : "text-muted-foreground"}`}>
                      {format(netToPay)}
                    </span>
                  </div>
                  <Button
                    className="w-full mt-2"
                    disabled={netToPay <= 0}
                    onClick={() => setDialogType("salary_payment")}
                  >
                    Marquer comme payé
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* History */}
            <TabsContent value="history">
              {isLoading ? (
                <Skeleton className="h-40 w-full" />
              ) : txs.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Aucune transaction enregistrée.</p>
              ) : (
                <div className="rounded-md border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                      <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {txs.map((t) => {
                        const meta = TYPE_META[t.type];
                        const Icon = meta.icon;
                        return (
                          <TableRow key={t.id}>
                            <TableCell className="text-xs whitespace-nowrap">
                              {new Date(t.transaction_date).toLocaleDateString("fr-FR")}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant="outline" className={`gap-1 w-fit ${meta.cls}`}>
                                  <Icon className="h-3 w-3" />
                                  {meta.label}
                                </Badge>
                                {t.description && (
                                  <span className="text-xs text-muted-foreground">{t.description}</span>
                                )}
                                {t.expense_id && (
                                  <span className="text-[10px] text-primary">↳ Synchronisé caisse</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={`text-right font-medium ${meta.sign === 1 ? "text-success" : "text-warning"}`}>
                              {meta.sign === 1 ? "+" : "-"} {format(Number(t.amount))}
                            </TableCell>
                            <TableCell>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditTx(t)}>
                                    <Pencil className="h-4 w-4 mr-2" /> Modifier
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeleteTx(t)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            {/* Profile */}
            <TabsContent value="profile">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Profil HR</CardTitle>
                  {!editHr ? (
                    <Button size="sm" variant="ghost" onClick={() => setEditHr(true)}>
                      <Pencil className="h-4 w-4 mr-1" /> Modifier
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={async () => {
                        await updateHr.mutateAsync({
                          memberId: employee.id,
                          base_salary: Number(salary) || 0,
                          hire_date: hireDate || null,
                        });
                        setEditHr(false);
                      }}
                      disabled={updateHr.isPending}
                    >
                      <Check className="h-4 w-4 mr-1" /> Enregistrer
                    </Button>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label>Salaire de base mensuel</Label>
                    {editHr ? (
                      <Input type="number" step="0.01" value={salary} onChange={(e) => setSalary(e.target.value)} />
                    ) : (
                      <p className="text-sm">{format(baseSalary)}</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label>Date d'embauche</Label>
                    {editHr ? (
                      <Input type="date" value={hireDate} onChange={(e) => setHireDate(e.target.value)} />
                    ) : (
                      <p className="text-sm">
                        {employee.hire_date
                          ? new Date(employee.hire_date).toLocaleDateString("fr-FR")
                          : "—"}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Perf */}
            <TabsContent value="perf">
              <div className="grid grid-cols-2 gap-3">
                <Card>
                  <CardContent className="pt-6 text-center">
                    <Wrench className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{stats?.repairs ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Réparations ce mois</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 text-center">
                    <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-primary" />
                    <p className="text-2xl font-bold">{stats?.sales ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Ventes (boutique)</p>
                  </CardContent>
                </Card>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Les réparations sont attribuées via le champ "Réparé par" sur la fiche.
              </p>
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {dialogType && (
        <EmployeeTransactionDialog
          open={!!dialogType}
          onOpenChange={(v) => !v && setDialogType(null)}
          type={dialogType}
          employeeId={employee.member_user_id}
          employeeName={employeeName}
          defaultAmount={dialogType === "salary_payment" && netToPay > 0 ? netToPay : undefined}
        />
      )}

      <EditEmployeeTransactionDialog
        open={!!editTx}
        onOpenChange={(v) => !v && setEditTx(null)}
        transaction={editTx}
      />

      <AlertDialog open={!!deleteTx} onOpenChange={(v) => !v && setDeleteTx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette transaction ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible.
              {deleteTx?.expense_id && " L'écriture liée dans la caisse sera également supprimée."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (deleteTx) {
                  await deleteMutation.mutateAsync(deleteTx.id);
                  setDeleteTx(null);
                }
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Row({ label, value, positive, negative }: { label: string; value: string; positive?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={positive ? "text-success" : negative ? "text-warning" : ""}>{value}</span>
    </div>
  );
}
