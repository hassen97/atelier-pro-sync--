import { useEffect, useState } from "react";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const isRealEmail = (v?: string | null) =>
  !!v && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && !v.toLowerCase().endsWith("@repairpro.local");

/**
 * Lets the signed-in owner store a real e-mail address on their profile so the
 * "forgot password" flow can reach them. Own row only — no admin powers.
 */
export function RecoveryEmailCard() {
  const { user } = useAuth();
  const [current, setCurrent] = useState<string | null>(null);
  const [value, setValue] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("email")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        const email = data?.email ?? null;
        setCurrent(isRealEmail(email) ? email : null);
        setValue(isRealEmail(email) ? String(email) : "");
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const save = async () => {
    const email = value.trim().toLowerCase();
    if (!isRealEmail(email)) {
      toast.error("Veuillez saisir une adresse e-mail valide");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email })
      .eq("user_id", user!.id);
    setSaving(false);
    if (error) {
      toast.error("Enregistrement impossible. Réessayez.");
      return;
    }
    setCurrent(email);
    toast.success("Adresse e-mail de récupération enregistrée");
  };

  if (!loaded || !user?.id) return null;

  return (
    <div className="space-y-3">
      {!current && (
        <Alert className="border-amber-500/30 bg-amber-500/10">
          <AlertDescription className="text-sm">
            Aucune adresse e-mail n'est enregistrée sur votre compte. Sans e-mail,
            vous ne pouvez pas réinitialiser votre mot de passe vous-même.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="recovery-email">Adresse e-mail de récupération</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="recovery-email"
              type="email"
              placeholder="vous@exemple.com"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="pl-10"
              disabled={saving}
              autoComplete="email"
            />
          </div>
          <Button onClick={save} disabled={saving || !value.trim()}>
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enregistrement...
              </>
            ) : (
              "Enregistrer"
            )}
          </Button>
        </div>
        {current && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Récupération de mot de passe active sur {current}
          </p>
        )}
      </div>
    </div>
  );
}
