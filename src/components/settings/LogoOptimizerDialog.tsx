import { useRef, useState, useCallback } from "react";
import { Sparkles, Loader2, Upload, Download, Check, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LogoOptimizerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  currentLogoUrl?: string | null;
  onSaved: (url: string) => Promise<void> | void;
}

/** Read a File into a data URL. */
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Fetch a remote image (e.g. existing logo) and convert to data URL. */
async function urlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

const checkerboard =
  "linear-gradient(45deg, #e5e7eb 25%, transparent 25%), linear-gradient(-45deg, #e5e7eb 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e5e7eb 75%), linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)";

export function LogoOptimizerDialog({
  open,
  onOpenChange,
  userId,
  currentLogoUrl,
  onSaved,
}: LogoOptimizerDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [sourceDataUrl, setSourceDataUrl] = useState<string | null>(null);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [saving, setSaving] = useState(false);

  const reset = useCallback(() => {
    setSourceDataUrl(null);
    setResultDataUrl(null);
    setProcessing(false);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const optimize = useCallback(async (dataUrl: string) => {
    setProcessing(true);
    setResultDataUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("optimize-logo", {
        body: { imageDataUrl: dataUrl },
      });
      if (error) {
        // Try to surface the function's JSON error message
        let msg = "Échec de l'optimisation";
        try {
          const ctx = await (error as any).context?.json?.();
          if (ctx?.error) msg = ctx.error;
        } catch { /* ignore */ }
        throw new Error(msg);
      }
      if (!data?.dataUrl) throw new Error("Aucune image générée");
      setResultDataUrl(data.dataUrl as string);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Échec de l'optimisation IA");
    } finally {
      setProcessing(false);
    }
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 5 MB)");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setSourceDataUrl(dataUrl);
    await optimize(dataUrl);
  };

  const handleUseExisting = async () => {
    if (!currentLogoUrl) return;
    try {
      const dataUrl = await urlToDataUrl(currentLogoUrl);
      setSourceDataUrl(dataUrl);
      await optimize(dataUrl);
    } catch (err) {
      console.error(err);
      toast.error("Impossible de charger le logo actuel");
    }
  };

  const handleUse = async () => {
    if (!resultDataUrl) return;
    setSaving(true);
    try {
      const res = await fetch(resultDataUrl);
      const blob = await res.blob();
      const path = `${userId}/logo-optimized-${Date.now()}.png`;
      const { error: uploadError } = await supabase.storage
        .from("shop-logos")
        .upload(path, blob, { upsert: true, contentType: "image/png" });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("shop-logos").getPublicUrl(path);
      const finalUrl = urlData.publicUrl + "?t=" + Date.now();
      await onSaved(finalUrl);
      toast.success("Logo optimisé enregistré");
      handleClose(false);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = () => {
    if (!resultDataUrl) return;
    const a = document.createElement("a");
    a.href = resultDataUrl;
    a.download = "logo-optimise.png";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Optimisation du logo (IA)
          </DialogTitle>
          <DialogDescription>
            Nettoie, upscale et supprime l'arrière-plan de votre logo pour un rendu parfait.
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFile}
        />

        {/* Source picker */}
        {!sourceDataUrl && !processing && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Button onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Choisir une image
            </Button>
            {currentLogoUrl && (
              <Button variant="outline" onClick={handleUseExisting}>
                <RefreshCw className="h-4 w-4 mr-2" /> Optimiser le logo actuel
              </Button>
            )}
          </div>
        )}

        {/* Loading */}
        {processing && (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Optimisation en cours…</p>
          </div>
        )}

        {/* Comparison */}
        {sourceDataUrl && !processing && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-medium text-center text-muted-foreground">Original</p>
                <div
                  className="aspect-square rounded-lg border flex items-center justify-center overflow-hidden"
                  style={{
                    backgroundImage: checkerboard,
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  <img src={sourceDataUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-center text-primary">Optimisé (PNG transparent)</p>
                <div
                  className={cn(
                    "aspect-square rounded-lg border flex items-center justify-center overflow-hidden",
                    resultDataUrl ? "border-primary" : "border-dashed",
                  )}
                  style={{
                    backgroundImage: checkerboard,
                    backgroundSize: "20px 20px",
                    backgroundPosition: "0 0, 0 10px, 10px -10px, -10px 0px",
                  }}
                >
                  {resultDataUrl ? (
                    <img src={resultDataUrl} alt="Optimisé" className="max-w-full max-h-full object-contain" />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </div>
              </div>
            </div>

            {resultDataUrl && (
              <DialogFooter className="gap-2 sm:gap-2">
                <Button variant="outline" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" /> Télécharger
                </Button>
                <Button onClick={handleUse} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                  Utiliser ce logo
                </Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default LogoOptimizerDialog;
