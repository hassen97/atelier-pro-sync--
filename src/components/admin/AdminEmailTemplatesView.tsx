import { useEffect, useMemo, useState } from "react";
import {
  useEmailTemplates,
  useUpdateEmailTemplate,
  previewEmailTemplate,
  sendTestEmail,
  TEMPLATE_META,
  type EmailTemplate,
} from "@/hooks/useEmailTemplates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Mail, Save, Eye, Send, Bell, KeyRound, Clock, Sparkles } from "lucide-react";
import { toast } from "sonner";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  signup_admin: Bell,
  password_reset: KeyRound,
  subscription_expiry: Clock,
  changelog: Sparkles,
};

const FIELD_LABELS: Record<string, string> = {
  subject: "Objet de l'e-mail",
  preheader: "Aperçu (preheader)",
  heading: "Titre principal",
  intro: "Introduction",
  body: "Corps du message",
  button_label: "Texte du bouton",
  footer: "Pied de page",
};

const inputCls =
  "bg-slate-800/60 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#00D4FF]/40";

export function AdminEmailTemplatesView() {
  const { data: templates, isLoading } = useEmailTemplates();
  const update = useUpdateEmailTemplate();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>("");
  const [previewing, setPreviewing] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [sendingTest, setSendingTest] = useState(false);

  const selected = useMemo(
    () => templates?.find((t) => t.template_key === selectedKey) ?? null,
    [templates, selectedKey],
  );

  // Initialize selection + draft.
  useEffect(() => {
    if (templates && templates.length && !selectedKey) {
      setSelectedKey(templates[0].template_key);
    }
  }, [templates, selectedKey]);

  useEffect(() => {
    if (selected) setDraft({ ...selected });
  }, [selected?.id]);

  // Debounced live preview reflecting unsaved edits.
  useEffect(() => {
    if (!draft) return;
    let active = true;
    setPreviewing(true);
    const t = setTimeout(async () => {
      try {
        const res = await previewEmailTemplate(draft.template_key, {
          subject: draft.subject,
          preheader: draft.preheader,
          heading: draft.heading,
          intro: draft.intro,
          body: draft.body,
          button_label: draft.button_label,
          footer: draft.footer,
          accent_color: draft.accent_color,
        });
        if (active) setPreviewHtml(res.html);
      } catch {
        /* ignore preview errors */
      } finally {
        if (active) setPreviewing(false);
      }
    }, 450);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [draft]);

  const dirty = useMemo(() => {
    if (!draft || !selected) return false;
    return (
      ["subject", "preheader", "heading", "intro", "body", "button_label", "footer", "accent_color"] as const
    ).some((k) => draft[k] !== selected[k]);
  }, [draft, selected]);

  const setField = (k: keyof EmailTemplate, v: string) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  const handleSave = () => {
    if (!draft) return;
    update.mutate({
      id: draft.id,
      subject: draft.subject,
      preheader: draft.preheader,
      heading: draft.heading,
      intro: draft.intro,
      body: draft.body,
      button_label: draft.button_label,
      footer: draft.footer,
      accent_color: draft.accent_color,
    });
  };

  const handleToggle = (val: boolean) => {
    if (!draft) return;
    setDraft({ ...draft, is_enabled: val });
    update.mutate({ id: draft.id, is_enabled: val });
  };

  const handleTest = async () => {
    if (!draft || !testEmail.trim()) {
      toast.error("Saisissez une adresse e-mail de test");
      return;
    }
    setSendingTest(true);
    try {
      await sendTestEmail(draft.template_key, testEmail.trim());
      toast.success(`E-mail de test envoyé à ${testEmail.trim()}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Échec de l'envoi du test");
    } finally {
      setSendingTest(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Mail className="h-5 w-5 text-[#00D4FF]" /> Modèles d'e-mails
        </h2>
        <p className="text-sm text-slate-400 mt-1">
          Personnalisez le texte de chaque e-mail de notification. Chaque type garde son
          design. Utilisez {"{{variable}}"} pour insérer des données dynamiques.
        </p>
      </div>

      {/* Template selector */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(templates ?? []).map((t) => {
          const meta = TEMPLATE_META[t.template_key];
          const Icon = ICONS[t.template_key] ?? Mail;
          const active = t.template_key === selectedKey;
          return (
            <button
              key={t.id}
              onClick={() => setSelectedKey(t.template_key)}
              className={`text-left rounded-xl p-4 border transition-all ${
                active
                  ? "border-[#00D4FF]/60 bg-[#00D4FF]/10"
                  : "border-white/10 bg-slate-800/40 hover:bg-slate-800/70"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className="h-5 w-5 text-[#00D4FF]" />
                <span
                  className={`h-2 w-2 rounded-full ${t.is_enabled ? "bg-emerald-400" : "bg-slate-500"}`}
                />
              </div>
              <div className="text-sm font-medium text-white leading-tight">
                {meta?.label ?? t.template_key}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">{meta?.recipient}</div>
            </button>
          );
        })}
      </div>

      {draft && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor */}
          <div className="admin-glass-card rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-white font-medium">
                  {TEMPLATE_META[draft.template_key]?.label}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {TEMPLATE_META[draft.template_key]?.description}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Actif</span>
                <Switch checked={draft.is_enabled} onCheckedChange={handleToggle} />
              </div>
            </div>

            {(["subject", "preheader", "heading", "intro", "body", "button_label", "footer"] as const).map(
              (field) => (
                <div key={field} className="space-y-1.5">
                  <Label className="text-slate-300 text-xs">{FIELD_LABELS[field]}</Label>
                  {field === "body" || field === "intro" ? (
                    <Textarea
                      value={draft[field]}
                      onChange={(e) => setField(field, e.target.value)}
                      className={inputCls}
                      rows={field === "body" ? 3 : 2}
                    />
                  ) : (
                    <Input
                      value={draft[field]}
                      onChange={(e) => setField(field, e.target.value)}
                      className={inputCls}
                    />
                  )}
                </div>
              ),
            )}

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Couleur d'accent</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={draft.accent_color}
                  onChange={(e) => setField("accent_color", e.target.value)}
                  className="h-9 w-12 rounded border border-white/10 bg-transparent cursor-pointer"
                />
                <Input
                  value={draft.accent_color}
                  onChange={(e) => setField("accent_color", e.target.value)}
                  className={`${inputCls} w-32`}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!dirty || update.isPending}
                className="bg-[#00D4FF] text-slate-900 hover:bg-[#00D4FF]/90"
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </div>

            {/* Test send */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <Label className="text-slate-300 text-xs flex items-center gap-1">
                <Send className="h-3.5 w-3.5" /> Envoyer un test
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  className={inputCls}
                />
                <Button
                  variant="outline"
                  onClick={handleTest}
                  disabled={sendingTest}
                  className="border-white/10 text-white hover:bg-white/10 shrink-0"
                >
                  {sendingTest ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Envoyer"
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="admin-glass-card rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white font-medium flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#00D4FF]" /> Aperçu
              </div>
              {previewing && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
            </div>
            <div className="rounded-lg overflow-hidden border border-white/10 bg-white">
              <iframe
                title="preview"
                srcDoc={previewHtml}
                className="w-full h-[560px] bg-white"
                sandbox=""
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
