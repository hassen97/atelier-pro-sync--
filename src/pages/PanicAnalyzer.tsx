import { useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  Upload,
  Wrench,
  Cpu,
  RotateCcw,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/seo/SEO";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  analyzePanicLog,
  type PanicResult,
  type PanicPattern,
} from "@/lib/panicPatterns";

const FALLBACK_MESSAGE =
  "Log Panic non reconnu. Probable défaut de carte mère nécessitant un diagnostic en micro-soudure. Veuillez vérifier le texte complet du log.";

export default function PanicAnalyzer() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<PanicResult | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    const name = file.name.toLowerCase();
    if (!name.endsWith(".ips") && !name.endsWith(".txt")) {
      toast({
        title: "Format non supporté",
        description: "Veuillez importer un fichier .ips ou .txt.",
        variant: "destructive",
      });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = String(e.target?.result ?? "");
      setText(content);
      setResult(null);
      toast({
        title: "Fichier chargé",
        description: `${file.name} a été importé. Cliquez sur « Analyser ».`,
      });
    };
    reader.onerror = () => {
      toast({
        title: "Erreur de lecture",
        description: "Impossible de lire le fichier.",
        variant: "destructive",
      });
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) readFile(file);
  };

  const handleAnalyze = () => {
    if (!text.trim()) return;
    setResult(analyzePanicLog(text));
  };

  const handleReset = () => {
    setText("");
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const match = result?.match ?? null;
  const secondary =
    result?.matches.filter((m) => m !== match) ?? ([] as PanicPattern[]);

  return (
    <div className="space-y-6">
      <SEO
        title="Analyseur Panic — RepairPro"
        description="Analysez les logs Panic iPhone (.ips) et identifiez instantanément le composant matériel défaillant."
        path="/panic-analyzer"
      />
      <PageHeader
        title="Analyseur Panic"
        description="Importez ou collez un log Panic Apple (.ips) pour identifier la panne matérielle et la réparation recommandée."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Cpu className="h-5 w-5 text-primary" />
              Log Panic
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setResult(null);
              }}
              placeholder="Collez ici le contenu brut de votre log Panic (.ips ou texte)…"
              className="min-h-[220px] font-mono text-xs"
            />

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-muted/50"
              )}
            >
              <Upload className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">
                Glissez-déposez un fichier ici
              </p>
              <p className="text-xs text-muted-foreground">
                ou cliquez pour parcourir — formats .ips ou .txt
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ips,.txt,text/plain"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) readFile(file);
                }}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                onClick={handleAnalyze}
                disabled={!text.trim()}
                className="flex-1"
              >
                <Activity className="h-4 w-4 mr-2" />
                Analyser le log
              </Button>
              <Button
                variant="outline"
                onClick={handleReset}
                disabled={!text && !result}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Réinitialiser
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results section */}
        <div>
          {result === null ? (
            <Card className="flex h-full min-h-[300px] items-center justify-center border-dashed">
              <div className="flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
                <FileText className="h-10 w-10 opacity-40" />
                <p className="text-sm">
                  Les résultats du diagnostic apparaîtront ici après l'analyse.
                </p>
              </div>
            </Card>
          ) : match ? (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  Faute détectée
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Code d'erreur détecté
                  </p>
                  <Badge variant="destructive" className="text-sm">
                    Erreur détectée : {match.pattern}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Cause probable
                  </p>
                  <p className="text-base font-semibold text-foreground">
                    {match.component}
                  </p>
                </div>

                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                  <p className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-green-600 dark:text-green-400">
                    <Wrench className="h-4 w-4" />
                    Solution recommandée
                  </p>
                  <p className="text-sm text-foreground">{match.solution}</p>
                </div>

                {secondary.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Autres correspondances
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {secondary.map((s) => (
                        <Badge key={s.pattern} variant="outline">
                          {s.pattern}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-amber-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="h-5 w-5" />
                  Log non reconnu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <p className="text-sm text-foreground">{FALLBACK_MESSAGE}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
