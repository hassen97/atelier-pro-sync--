import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Bug, Copy, Send, Check, Mail } from "lucide-react";
import { useCreateAnnouncement } from "@/hooks/useAnnouncements";
import { formatForFacebook } from "@/lib/changelogFormat";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function QuickChangelogDialog({ open, onOpenChange }: Props) {
  const create = useCreateAnnouncement();
  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const [title, setTitle] = useState(`Mise à jour du ${today}`);
  const [features, setFeatures] = useState("");
  const [fixes, setFixes] = useState("");
  const [justPublished, setJustPublished] = useState(false);
  const [alsoEmail, setAlsoEmail] = useState(false);

  useEffect(() => {
    if (open) {
      setTitle(`Mise à jour du ${today}`);
      setFeatures("");
      setFixes("");
      setJustPublished(false);
      setAlsoEmail(false);
    }
  }, [open]);

  const canSubmit = title.trim() && (features.trim() || fixes.trim());

  const copyForFacebook = async () => {
    const text = formatForFacebook({
      title,
      newFeatures: features,
      changesFixes: fixes,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copié — collez sur Facebook");
    } catch {
      toast.error("Impossible de copier");
    }
  };

  const publish = () => {
    if (!canSubmit) return;
    create.mutate(
      { title, new_features: features, changes_fixes: fixes, target_user_id: null },
      {
        onSuccess: async () => {
          setJustPublished(true);
          toast.success("Changelog envoyé à toutes les boutiques");
          if (alsoEmail) {
            try {
              const { data, error } = await supabase.functions.invoke("send-notification-email", {
                body: {
                  action: "broadcast_changelog",
                  variables: { version_date: title, features, fixes },
                },
              });
              if (error) throw error;
              toast.success(`E-mail envoyé à ${data?.sent ?? 0} boutique(s)`);
            } catch (e: any) {
              toast.error(e?.message ?? "Échec de l'envoi des e-mails");
            }
          }
        },
      }
    );
  };

  const publishAndCopy = async () => {
    await copyForFacebook();
    publish();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#00D4FF]" />
            Publier un changelog
          </DialogTitle>
          <p className="text-xs text-slate-500 mt-1">
            Apparaît automatiquement chez tous les propriétaires & employés à leur prochaine ouverture.
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-slate-300 text-xs">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <div>
            <Label className="text-slate-300 text-xs flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-emerald-400" />
              Nouveautés
            </Label>
            <Textarea
              value={features}
              onChange={(e) => setFeatures(e.target.value)}
              placeholder={"- Nouvelle fonctionnalité A\n- Nouvelle fonctionnalité B"}
              className="bg-white/5 border-white/10 text-white min-h-[90px] text-sm"
            />
          </div>

          <div>
            <Label className="text-slate-300 text-xs flex items-center gap-1.5">
              <Bug className="h-3 w-3 text-amber-400" />
              Corrections & améliorations
            </Label>
            <Textarea
              value={fixes}
              onChange={(e) => setFixes(e.target.value)}
              placeholder={"- Correction du bug X\n- Amélioration de Y"}
              className="bg-white/5 border-white/10 text-white min-h-[90px] text-sm"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 mt-3 cursor-pointer select-none">
          <Checkbox checked={alsoEmail} onCheckedChange={(v) => setAlsoEmail(v === true)} />
          <span className="text-sm text-slate-300 flex items-center gap-1.5">
            <Mail className="h-3.5 w-3.5 text-[#00D4FF]" />
            Envoyer aussi par e-mail à toutes les boutiques
          </span>
        </label>



        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={copyForFacebook}
            disabled={!canSubmit}
            className="border-white/10 bg-white/5 text-white hover:bg-white/10"
          >
            <Copy className="h-4 w-4 mr-2" /> Copier pour Facebook
          </Button>
          <Button
            onClick={publishAndCopy}
            disabled={!canSubmit || create.isPending}
            className="bg-[#00D4FF] text-slate-900 hover:bg-[#00D4FF]/80 font-semibold flex-1"
          >
            {justPublished ? (
              <>
                <Check className="h-4 w-4 mr-2" /> Publié & copié
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" /> Publier & copier
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
