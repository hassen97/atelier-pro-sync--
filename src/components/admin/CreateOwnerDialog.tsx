import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateOwner } from "@/hooks/useAdmin";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";

interface CreateOwnerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateOwnerDialog({ open, onOpenChange }: CreateOwnerDialogProps) {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [country, setCountry] = useState("TN");
  const [currency, setCurrency] = useState("TND");
  const createOwner = useCreateOwner();

  const isValid =
    fullName.trim().length >= 2 &&
    /^[a-zA-Z0-9_]{3,20}$/.test(username) &&
    password.length >= 8 &&
    password === confirmPassword;

  const handleCountryChange = (val: string) => {
    setCountry(val);
    const curr = getCurrencyForCountry(val);
    if (curr) setCurrency(curr.code);
  };

  const handleSubmit = async () => {
    if (!isValid) return;
    await createOwner.mutateAsync({ fullName: fullName.trim(), username: username.trim(), password, country, currency });
    setFullName("");
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setCountry("TN");
    setCurrency("TND");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Créer un propriétaire de boutique</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Nom complet</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nom complet" />
          </div>
          <div>
            <Label>Username</Label>
            <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="username" />
            <p className="text-xs text-muted-foreground mt-1">3-20 caractères alphanumériques</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Pays</Label>
              <Select value={country} onValueChange={handleCountryChange}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Devise</Label>
              <Select value={currency} onValueChange={setCurrency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {currencies.map((c) => (
                    <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Mot de passe</Label>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            <p className="text-xs text-muted-foreground mt-1">8 caractères minimum</p>
          </div>
          <div>
            <Label>Confirmer le mot de passe</Label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••" />
            {confirmPassword && password !== confirmPassword && (
              <p className="text-xs text-destructive mt-1">Les mots de passe ne correspondent pas</p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!isValid || createOwner.isPending}>
            {createOwner.isPending ? "Création..." : "Créer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
