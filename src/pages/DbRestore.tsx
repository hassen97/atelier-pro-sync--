// TEMPORARY one-time page to restore the LIVE database from the test dump.
// Delete this page, its route, and the manifest file after use.
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { RESTORE_PAYLOAD_URL, RESTORE_FILES } from "./dbRestoreManifest";

export default function DbRestore() {
  const [loading, setLoading] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState("");

  const call = async (label: string, mode: "db" | "all", dryRun: boolean) => {
    setLoading(label);
    setResult(null);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("restore-live-db", {
        body: {
          mode,
          dryRun,
          sqlUrl: RESTORE_PAYLOAD_URL,
          files: mode === "all" ? RESTORE_FILES : undefined,
        },
      });
      if (error) throw error;
      setResult(data);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Live Database Restore (one-time)</h1>
      <p className="text-sm text-muted-foreground">
        Must be signed in as the platform admin. Step 1: run a dry run (executes everything
        against live, then rolls back — nothing changes). Step 2: only if the dry run reports
        success, run the full restore. The full restore <strong>permanently wipes live data</strong>{" "}
        and replaces it with the test dump (369 users, 1695 repairs, 4942 products, 1449 customers).
      </p>

      <div className="flex flex-col gap-3">
        <Button
          variant="secondary"
          disabled={loading !== null}
          onClick={() => call("dryrun", "db", true)}
        >
          {loading === "dryrun" ? "Running dry run…" : "1) Dry run (safe — rolls back)"}
        </Button>

        <div className="rounded-lg border border-destructive/40 p-4 space-y-3">
          <p className="text-sm">
            Type <code className="font-mono font-bold">REPLACE LIVE</code> to enable the destructive restore:
          </p>
          <input
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="REPLACE LIVE"
          />
          <Button
            variant="destructive"
            disabled={loading !== null || confirmText !== "REPLACE LIVE"}
            onClick={() => call("full", "all", false)}
          >
            {loading === "full" ? "Restoring… do not close" : "2) RUN FULL RESTORE (wipes live)"}
          </Button>
        </div>
      </div>

      {error && (
        <pre className="whitespace-pre-wrap rounded-md bg-destructive/10 text-destructive p-4 text-xs">
          {error}
        </pre>
      )}
      {result != null && (
        <pre className="whitespace-pre-wrap rounded-md bg-muted p-4 text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
