import { useEffect, useRef, useState } from "react";
import { Search, UserPlus, Loader2, Eye, EyeOff, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchUsers, useAddTeamMember, useCreateEmployee, ALL_PAGES } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";

type UsernameStatus = "idle" | "invalid" | "checking" | "available" | "taken" | "error";

const USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,20}$/;

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

function formatHandle(username: string | null | undefined) {
  return username ? `@${username}` : "Username indisponible";
}

export function AddMemberDialog({ disabled, disabledReason }: { disabled?: boolean; disabledReason?: string }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"search" | "create">("create");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    username: string | null;
    full_name: string | null;
  } | null>(null);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [role, setRole] = useState<"employee" | "manager" | "admin">("employee");
  const [selectedPages, setSelectedPages] = useState<string[]>(["/dashboard", "/pos"]);

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [checkedUsername, setCheckedUsername] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const latestUsernameRef = useRef("");

  const { user } = useAuth();
  const searchUsers = useSearchUsers();
  const addMember = useAddTeamMember();
  const createEmployee = useCreateEmployee();

  const normalizedUsername = normalizeUsername(username);
  const usernameValid = USERNAME_PATTERN.test(normalizedUsername);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirmPassword;
  const createFormValid =
    fullName.trim().length > 0 &&
    usernameValid &&
    passwordValid &&
    passwordsMatch &&
    usernameStatus === "available" &&
    checkedUsername === normalizedUsername;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    latestUsernameRef.current = normalizedUsername;
    setCheckedUsername("");

    if (!normalizedUsername) {
      setUsernameStatus("idle");
      return;
    }

    if (!usernameValid) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");

    debounceRef.current = setTimeout(async () => {
      const currentUsername = normalizedUsername;

      try {
        const { data, error } = await supabase.functions.invoke("check-username", {
          body: { username: currentUsername },
        });

        if (latestUsernameRef.current !== currentUsername) return;

        if (error || data?.error) {
          setUsernameStatus("error");
          return;
        }

        setCheckedUsername(currentUsername);
        setUsernameStatus(data?.exists ? "taken" : "available");
      } catch {
        if (latestUsernameRef.current === currentUsername) {
          setUsernameStatus("error");
        }
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [normalizedUsername, usernameValid]);

  const resetForm = () => {
    setSearchQuery("");
    setSelectedUser(null);
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setRole("employee");
    setSelectedPages(["/dashboard", "/pos"]);
    setShowPassword(false);
    setUsernameStatus("idle");
    setCheckedUsername("");
    latestUsernameRef.current = "";
  };

  const handleSearch = () => {
    if (searchQuery.trim().length < 2) return;
    searchUsers.mutate(searchQuery.trim());
  };

  const togglePage = (href: string) => {
    if (href === "/dashboard") return;
    setSelectedPages((prev) =>
      prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]
    );
  };

  const handleAddExisting = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({
      memberUserId: selectedUser.user_id,
      role,
      allowedPages: selectedPages,
    });
    setOpen(false);
    resetForm();
  };

  const handleCreate = async () => {
    if (!createFormValid) return;
    await createEmployee.mutateAsync({
      fullName: fullName.trim(),
      username: normalizedUsername,
      password,
      role,
      allowedPages: selectedPages,
    });
    setOpen(false);
    resetForm();
  };

  const searchResults = (searchUsers.data || []).filter((u) => u.user_id !== user?.id);

  const renderPermissions = () => (
    <>
      <div className="space-y-2">
        <Label>Rôle</Label>
        <Select value={role} onValueChange={(v: "employee" | "manager" | "admin") => setRole(v)}>
          <SelectTrigger>
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
        <Label>Pages autorisées</Label>
        <div className="grid grid-cols-2 gap-2">
          {ALL_PAGES.map((page) => (
            <label key={page.href} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selectedPages.includes(page.href)}
                onCheckedChange={() => togglePage(page.href)}
                disabled={page.href === "/dashboard"}
              />
              {page.label}
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) resetForm();
      }}
    >
      <DialogTrigger asChild>
        <Button
          className="bg-gradient-primary hover:opacity-90"
          disabled={disabled}
          title={disabledReason}
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Ajouter un employé
          {disabled && <span className="ml-1 text-xs opacity-70">({disabledReason})</span>}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter un employé</DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(value) => setTab(value as "search" | "create")}>
          <TabsList className="w-full">
            <TabsTrigger value="create" className="flex-1">Créer un compte</TabsTrigger>
            <TabsTrigger value="search" className="flex-1">Rechercher</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Nom complet</Label>
              <Input
                placeholder="Ex: Ahmed Ben Ali"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Nom d'utilisateur</Label>
              <Input
                placeholder="Ex: ahmed_ali"
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
              />

              {usernameStatus === "invalid" && (
                <p className="text-xs text-destructive">3-20 caractères, lettres/chiffres/_ uniquement</p>
              )}

              {usernameStatus !== "idle" && usernameStatus !== "invalid" && (
                <div className="flex items-center gap-1 text-xs">
                  {usernameStatus === "checking" && (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      <span className="text-muted-foreground">Vérification globale...</span>
                    </>
                  )}
                  {usernameStatus === "available" && (
                    <>
                      <CheckCircle2 className="h-3 w-3 text-primary" />
                      <span className="text-primary">Disponible</span>
                    </>
                  )}
                  {usernameStatus === "taken" && (
                    <>
                      <XCircle className="h-3 w-3 text-destructive" />
                      <span className="text-destructive">Déjà pris</span>
                    </>
                  )}
                  {usernameStatus === "error" && (
                    <span className="text-destructive">Impossible de vérifier maintenant</span>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Mot de passe</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min 8 caractères"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((prev) => !prev)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && !passwordValid && (
                <p className="text-xs text-destructive">Le mot de passe doit contenir au moins 8 caractères</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confirmer le mot de passe</Label>
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Répétez le mot de passe"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {confirmPassword && !passwordsMatch && (
                <p className="text-xs text-destructive">Les mots de passe ne correspondent pas</p>
              )}
            </div>

            {renderPermissions()}

            <Button
              className="w-full bg-gradient-primary hover:opacity-90"
              onClick={handleCreate}
              disabled={!createFormValid || createEmployee.isPending}
            >
              {createEmployee.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Créer et ajouter à l'équipe
            </Button>
          </TabsContent>

          <TabsContent value="search" className="space-y-4 mt-4">
            {!selectedUser ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nom d'utilisateur..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                  <Button variant="outline" onClick={handleSearch} disabled={searchUsers.isPending}>
                    {searchUsers.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-2">
                    {searchResults.map((result) => {
                      const displayName = result.full_name || result.username || "Utilisateur";
                      return (
                        <button
                          key={result.user_id}
                          onClick={() => setSelectedUser(result)}
                          className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                            {displayName[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{displayName}</p>
                            <p className="text-xs text-muted-foreground">{formatHandle(result.username)}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {searchUsers.isSuccess && searchResults.length === 0 && searchQuery && (
                  <p className="text-sm text-muted-foreground text-center py-4">Aucun utilisateur trouvé</p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                    {(selectedUser.full_name || selectedUser.username || "U")[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{selectedUser.full_name || selectedUser.username || "Utilisateur"}</p>
                    <p className="text-xs text-muted-foreground">{formatHandle(selectedUser.username)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-auto"
                    onClick={() => setSelectedUser(null)}
                  >
                    Changer
                  </Button>
                </div>

                {renderPermissions()}

                <Button
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={handleAddExisting}
                  disabled={addMember.isPending}
                >
                  {addMember.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <UserPlus className="h-4 w-4 mr-2" />
                  )}
                  Ajouter à l'équipe
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
