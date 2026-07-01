import { useState } from "react";
import { Users, Save, Loader2, UserMinus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useTeamMembers,
  useUpdateMemberPermissions,
  useRemoveTeamMember,
  ALL_PAGES,
  type TeamMember,
} from "@/hooks/useTeam";
import { AddMemberDialog } from "./AddMemberDialog";
import { usePlanPermissions } from "@/hooks/usePlanPermissions";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function normalizePagesArray(pages: string[]): string[] {
  const mapped = pages.map((p) => (p === "/" ? "/dashboard" : p));
  const deduped = Array.from(new Set(mapped));
  return deduped.includes("/dashboard") ? deduped : ["/dashboard", ...deduped];
}

function MemberCard({ member }: { member: TeamMember }) {
  const normalized = normalizePagesArray(member.allowed_pages || []);
  const [pages, setPages] = useState<string[]>(normalized);
  const [role, setRole] = useState(member.role);
  const updatePermissions = useUpdateMemberPermissions();
  const removeMember = useRemoveTeamMember();

  const displayName = member.profile?.full_name?.trim() || member.profile?.username?.trim() || "Utilisateur";
  const displayHandle = member.profile?.username?.trim()
    ? `@${member.profile.username.trim()}`
    : "Username indisponible";

  const togglePage = (href: string) => {
    if (href === "/dashboard") return;
    setPages((prev) =>
      prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]
    );
  };

  // Compare against normalized baseline to avoid false "has changes" from "/" vs "/dashboard"
  const normalizedBaseline = normalizePagesArray(member.allowed_pages || []);
  const hasChanges =
    JSON.stringify([...pages].sort()) !== JSON.stringify([...normalizedBaseline].sort()) ||
    role !== member.role;

  const handleSave = () => {
    updatePermissions.mutate({
      memberId: member.id,
      allowedPages: pages.includes("/dashboard") ? pages : ["/dashboard", ...pages],
      role: role as any,
    });
  };

  return (
    <div className="p-4 rounded-lg border bg-card space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold shrink-0">
            {displayName[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{displayName}</p>
            <p className="text-sm text-muted-foreground truncate">{displayHandle}</p>
          </div>
        </div>
        <Select value={role} onValueChange={(v: any) => setRole(v)}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="employee">Employé</SelectItem>
            <SelectItem value="manager">Manager</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-sm text-muted-foreground">Pages autorisées</Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {ALL_PAGES.map((page) => (
            <label
              key={page.href}
              className="flex items-center gap-2 text-sm cursor-pointer"
            >
              <Checkbox
                checked={pages.includes(page.href)}
                onCheckedChange={() => togglePage(page.href)}
                disabled={page.href === "/dashboard"}
              />
              {page.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!hasChanges || updatePermissions.isPending}
        >
          {updatePermissions.isPending ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-1" />
          )}
          Enregistrer
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <UserMinus className="h-4 w-4 mr-1" />
              Retirer
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Retirer ce membre ?</AlertDialogTitle>
              <AlertDialogDescription>
                {displayName} n'aura plus accès aux données de votre boutique.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => removeMember.mutate(member.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Retirer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}

export function TeamManagement() {
  const { data: members = [], isLoading } = useTeamMembers();
  const { hasReachedLimit, getLimit, isLoading: planLoading } = usePlanPermissions();
  const atLimit = hasReachedLimit("max_employees", members.length);
  const maxEmp = getLimit("max_employees");

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Gestion de l'équipe
            </CardTitle>
            <CardDescription>
              Invitez vos employés et gérez leurs accès
            </CardDescription>
          </div>
          <AddMemberDialog disabled={atLimit} disabledReason={atLimit ? `Limite de ${maxEmp} employé${maxEmp > 1 ? "s" : ""} atteinte` : undefined} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : members.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Aucun membre dans l'équipe</p>
            <p className="text-sm mt-1">
              Invitez vos employés pour partager l'accès à votre boutique
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
