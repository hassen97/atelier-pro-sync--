// TEMPORARY page for the one-time Live database restore. Safe to delete afterwards.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string;

export default function DbRestore() {
  const [secret, setSecret] = useState("");
  const [payloadUrl, setPayloadUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [output, setOutput] = useState<string>("");

  const call = async (label: string, body: Record<string, unknown>) => {
    setBusy(label);
    setOutput("");
    try {
      const { data, error } = await supabase.functions.invoke("restore-live-db", { body });
      if (error) throw error;
      setOutput(JSON.stringify(data, null, 2));
      if ((data as any)?.payloadUrl) setPayloadUrl((data as any).payloadUrl);
    } catch (e: any) {
      setOutput(`ERROR: ${e?.message ?? String(e)}`);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Database restore bridge</h1>
          <p className="text-sm text-muted-foreground break-all">Connected backend: {ENV_URL}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Restore secret</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="password"
              placeholder="RESTORE_SECRET"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
            />
            <Button
              variant="outline"
              disabled={!secret || busy !== null}
              onClick={() => call("counts", { action: "counts", secret })}
            >
              {busy === "counts" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Show row counts for this backend
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 — Export (run on the preview / Test app)</CardTitle>
          </CardHeader>
          <CardContent>
            <Button
              disabled={!secret || busy !== null}
              onClick={() => call("export", { action: "export", secret })}
            >
              {busy === "export" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Export this backend
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 — Import (run on the published / Live app)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Payload URL from step 1"
              value={payloadUrl}
              onChange={(e) => setPayloadUrl(e.target.value)}
            />
            <p className="text-xs text-destructive">
              This erases every row in this backend and replaces it with the payload.
            </p>
            <Button
              variant="destructive"
              disabled={!secret || !payloadUrl || busy !== null}
              onClick={() =>
                call("import", { action: "import", secret, payloadUrl, confirm: "REPLACE_LIVE" })
              }
            >
              {busy === "import" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Replace this backend with the payload
            </Button>
          </CardContent>
        </Card>

        {output && (
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4 text-xs">{output}</pre>
        )}
      </div>
    </div>
  );
}
