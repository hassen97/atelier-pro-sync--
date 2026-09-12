// TEMPORARY page for the one-time Live database restore. Safe to delete afterwards.
import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const ENV_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string;

type LogLine = { at: string; level: "info" | "ok" | "error"; text: string };

export default function DbRestore() {
  const [secret, setSecret] = useState("");
  const [payloadUrl, setPayloadUrl] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [log, setLog] = useState<LogLine[]>([]);
  const [output, setOutput] = useState<string>("");
  const timer = useRef<number | null>(null);

  const push = (level: LogLine["level"], text: string) =>
    setLog((l) => [...l, { at: new Date().toLocaleTimeString(), level, text }]);

  const call = async (label: string, body: Record<string, unknown>) => {
    setBusy(label);
    setOutput("");
    setLog([]);
    setElapsed(0);
    const started = Date.now();
    timer.current = window.setInterval(
      () => setElapsed(Math.round((Date.now() - started) / 1000)),
      1000,
    );

    try {
      push("info", `Starting "${label}" against ${ENV_URL}`);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("No active session — sign in again as platform admin.");
      push("ok", "Session found, calling restore-live-db…");

      const res = await fetch(`${ENV_URL}/functions/v1/restore-live-db`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: ANON_KEY,
        },
        body: JSON.stringify(body),
      });

      const text = await res.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch {
        /* non-JSON response */
      }
      push(res.ok ? "ok" : "error", `HTTP ${res.status} ${res.statusText}`);

      if (parsed?.stage) push(res.ok ? "info" : "error", `Last stage reached: ${parsed.stage}`);
      if (Array.isArray(parsed?.steps)) {
        for (const s of parsed.steps) push("info", `• ${s}`);
      }
      if (parsed?.error) push("error", String(parsed.error));
      if (parsed?.fileFailures?.length) {
        push("error", `${parsed.fileFailures.length} storage file(s) failed`);
        for (const f of parsed.fileFailures.slice(0, 10)) push("error", `  ${f}`);
      }
      if (parsed?.payloadUrl) {
        setPayloadUrl(parsed.payloadUrl);
        push("ok", "Payload URL captured into step 2 below.");
      }
      if (res.ok && parsed?.ok) push("ok", `"${label}" completed`);

      setOutput(parsed ? JSON.stringify(parsed, null, 2) : text);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      push("error", `Request failed before a response arrived: ${msg}`);
      setOutput(`ERROR: ${msg}`);
    } finally {
      if (timer.current) window.clearInterval(timer.current);
      timer.current = null;
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

        {(busy || log.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Progress {busy ? `— running "${busy}" (${elapsed}s)` : "— finished"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-72 space-y-1 overflow-auto rounded-lg bg-muted p-3 font-mono text-xs">
                {log.map((l, i) => (
                  <div
                    key={i}
                    className={
                      l.level === "error"
                        ? "text-destructive"
                        : l.level === "ok"
                          ? "text-primary"
                          : "text-muted-foreground"
                    }
                  >
                    [{l.at}] {l.text}
                  </div>
                ))}
                {busy && <div className="text-muted-foreground">…working, keep this tab open</div>}
              </div>
            </CardContent>
          </Card>
        )}

        {output && (
          <pre className="max-h-[420px] overflow-auto rounded-lg bg-muted p-4 text-xs">{output}</pre>
        )}
      </div>
    </div>
  );
}
