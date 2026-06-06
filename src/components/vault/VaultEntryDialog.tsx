import { useEffect, useState } from "react";
import { Eye, EyeOff, Sparkles, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { useCreateCustomer } from "@/hooks/useCustomers";
import {
  generateStrongPassword,
  useCreateVaultEntry,
  useUpdateVaultEntry,
  type VaultAccountType,
  type VaultEntry,
} from "@/hooks/useCustomerVault";
import { useReadOnlyGuard } from "@/hooks/useReadOnlyGuard";
import { toast } from "sonner";

interface VaultEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry?: VaultEntry | null;
}

export function VaultEntryDialog({ open, onOpenChange, entry }: VaultEntryDialogProps) {
  const isEdit = !!entry;
  const [customerId, setCustomerId] = useState("");
  const [showCreateClient, setShowCreateClient] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");

  const [accountType, setAccountType] = useState<VaultAccountType>("icloud");
  const [emailId, setEmailId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const createCustomer = useCreateCustomer();
  const createEntry = useCreateVaultEntry();
  const updateEntry = useUpdateVaultEntry();
  const { guardMutation } = useReadOnlyGuard();

  useEffect(() => {
    if (open) {
      if (entry) {
        setCustomerId(entry.customer_id);
        setAccountType(entry.account_type);
        setEmailId(entry.email_id);
        setPassword(entry.password);
      } else {
        setCustomerId("");
        setAccountType("icloud");
        setEmailId("");
        setPassword("");
      }
      setShowCreateClient(false);
      setNewName("");
      setNewPhone("");
      setShowPassword(false);
    }
  }, [open, entry]);

  const handleSubmit = guardMutation(async () => {
    if (!emailId.trim()) {
      toast.error("Email / ID requis");
      return;
    }
    if (!password.trim()) {
      toast.error("Mot de passe requis");
      return;
    }

    let finalCustomerId = customerId;

    if (!isEdit && showCreateClient) {
      if (!newName.trim()) {
        toast.error("Nom du nouveau client requis");
        return;
      }
      try {
        const created = await createCustomer.mutateAsync({
          name: newName.trim(),
          phone: newPhone.trim() || null,
        });
        finalCustomerId = created.id;
      } catch {
        return;
      }
    }

    if (!finalCustomerId) {
      toast.error("Veuillez sélectionner ou créer un client");
      return;
    }

    try {
      if (isEdit && entry) {
        await updateEntry.mutateAsync({
          id: entry.id,
          customer_id: finalCustomerId,
          account_type: accountType,
          email_id: emailId.trim(),
          password,
        });
      } else {
        await createEntry.mutateAsync({
          customer_id: finalCustomerId,
          account_type: accountType,
          email_id: emailId.trim(),
          password,
        });
      }
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  });

  const isPending = createEntry.isPending || updateEntry.isPending || createCustomer.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'entrée" : "Nouveau compte"}</DialogTitle>
          <DialogDescription>
            Enregistrez un identifiant iCloud, Google ou Samsung pour un client.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Client selection */}
          <div className="space-y-2">
            <Label>Client</Label>
            {!showCreateClient ? (
              <>
                <CustomerCombobox
                  value={customerId}
                  onValueChange={setCustomerId}
                  placeholder="Rechercher un client (nom ou tél)..."
                />
                {!isEdit && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowCreateClient(true);
                      setCustomerId("");
                    }}
                    className="w-full justify-start text-primary"
                  >
                    <UserPlus className="mr-2 h-4 w-4" />
                    Créer un nouveau client
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-2 rounded-md border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nouveau client</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateClient(false)}
                  >
                    Annuler
                  </Button>
                </div>
                <Input
                  placeholder="Nom complet *"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="Téléphone"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Account type */}
          <div className="space-y-2">
            <Label>Type de compte</Label>
            <Select value={accountType} onValueChange={(v) => setAccountType(v as VaultAccountType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="icloud">iCloud</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="samsung">Samsung</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Email/ID */}
          <div className="space-y-2">
            <Label>Email / ID</Label>
            <Input
              type="text"
              placeholder="exemple@icloud.com"
              value={emailId}
              onChange={(e) => setEmailId(e.target.value)}
              autoComplete="off"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label>Mot de passe</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setPassword(generateStrongPassword());
                  setShowPassword(true);
                }}
                title="Générer un mot de passe fort"
              >
                <Sparkles className="h-4 w-4 mr-1" />
                Générer
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={() => handleSubmit?.()} disabled={isPending}>
            {isPending ? "Enregistrement..." : isEdit ? "Mettre à jour" : "Enregistrer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
