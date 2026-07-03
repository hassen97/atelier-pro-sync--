import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, RefreshCw, Shield, Trash2 } from "lucide-react";

interface SignupAttempt {
  id: string;
  ip_address: string;
  created_at: string;
}

export function AdminSignupAttemptsView() {
  const [attempts, setAttempts] = useState<SignupAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [ipFilter, setIpFilter] = useState("");

  const fetchAttempts = async () => {
    setLoading(true);
    let query = supabase
      .from("signup_attempts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (ipFilter.trim()) {
      query = query.ilike("ip_address", `%${ipFilter.trim()}%`);
    }

    const { data } = await query;
    setAttempts((data as any as SignupAttempt[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAttempts(); }, []);

  const handleSearch = () => fetchAttempts();

  const handleCleanup = async () => {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    await supabase.from("signup_attempts" as any).delete().lt("created_at", oneDayAgo);
    fetchAttempts();
  };

  // Group by IP for summary
  const ipCounts = attempts.reduce<Record<string, number>>((acc, a) => {
    acc[a.ip_address] = (acc[a.ip_address] || 0) + 1;
    return acc;
  }, {});

  const suspiciousIPs = Object.entries(ipCounts)
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Shield className="h-6 w-6 text-[#00D4FF]" />
          <h2 className="text-xl font-bold text-white">Tentatives d'inscription</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCleanup}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
            Nettoyer +24h
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAttempts}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Rafraîchir
          </Button>
        </div>
      </div>

      {/* Suspicious IPs summary */}
      {suspiciousIPs.length > 0 && (
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <h3 className="text-sm font-semibold text-amber-400 mb-2">⚠️ IPs suspectes (3+ tentatives)</h3>
          <div className="flex flex-wrap gap-2">
            {suspiciousIPs.map(([ip, count]) => (
              <button
                key={ip}
                onClick={() => { setIpFilter(ip); fetchAttempts(); }}
                className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs font-mono hover:bg-amber-500/20 transition-colors"
              >
                {ip} ({count}x)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Filtrer par adresse IP..."
            value={ipFilter}
            onChange={(e) => setIpFilter(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
          />
        </div>
        <Button onClick={handleSearch} size="sm" className="bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20 border border-[#00D4FF]/20">
          Rechercher
        </Button>
        {ipFilter && (
          <Button onClick={() => { setIpFilter(""); setTimeout(fetchAttempts, 0); }} size="sm" variant="ghost" className="text-slate-400">
            Effacer
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="text-left p-3 text-slate-400 font-medium">IP</th>
                <th className="text-left p-3 text-slate-400 font-medium">Date</th>
                <th className="text-right p-3 text-slate-400 font-medium">Nb tentatives (IP)</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={3} className="p-6 text-center text-slate-500">Chargement...</td></tr>
              ) : attempts.length === 0 ? (
                <tr><td colSpan={3} className="p-6 text-center text-slate-500">Aucune tentative trouvée</td></tr>
              ) : (
                attempts.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 font-mono text-white text-xs">{a.ip_address}</td>
                    <td className="p-3 text-slate-300 text-xs">
                      {new Date(a.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        (ipCounts[a.ip_address] || 0) >= 5
                          ? "bg-red-500/10 text-red-400"
                          : (ipCounts[a.ip_address] || 0) >= 3
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-white/5 text-slate-400"
                      }`}>
                        {ipCounts[a.ip_address] || 0}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Affichage des 200 dernières tentatives. Le nettoyage automatique supprime les entrées de +24h.
      </p>
    </div>
  );
}
