import { useState, useEffect, useCallback } from "react";
import { Search, Store, Users, Wrench, X, Megaphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAdminData } from "@/hooks/useAdmin";

interface AdminCommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: (view: string) => void;
  onPublishChangelog?: () => void;
}

const quickCommands = [
  { label: "Publier un changelog", icon: Megaphone, view: "__changelog__", hint: "Annoncer une mise à jour à toutes les boutiques" },
  { label: "Dashboard", icon: Store, view: "overview", hint: "Vue globale" },
  { label: "Boutiques", icon: Store, view: "shops", hint: "Gérer les boutiques" },
  { label: "Employés", icon: Users, view: "employees", hint: "Gérer les employés" },
  { label: "Réparations", icon: Wrench, view: "shops", hint: "Voir les réparations" },
];

export function AdminCommandPalette({ open, onClose, onNavigate, onPublishChangelog }: AdminCommandPaletteProps) {
  const [query, setQuery] = useState("");
  const { data } = useAdminData();

  const handleSelect = useCallback((view: string) => {
    if (view === "__changelog__") {
      onClose();
      setQuery("");
      onPublishChangelog?.();
      return;
    }
    onNavigate?.(view);
    onClose();
    setQuery("");
  }, [onNavigate, onClose, onPublishChangelog]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const shops = (data?.owners || []).filter(o =>
    query.length > 1 && (
      o.shop_name.toLowerCase().includes(query.toLowerCase()) ||
      o.username?.toLowerCase().includes(query.toLowerCase()) ||
      o.full_name?.toLowerCase().includes(query.toLowerCase())
    )
  ).slice(0, 6);

  const filteredCommands = quickCommands.filter(c =>
    !query || c.label.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Palette */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 z-50 w-full max-w-xl"
          >
            <div
              className="rounded-2xl border border-white/10 overflow-hidden"
              style={{
                background: "hsla(215, 28%, 12%, 0.95)",
                backdropFilter: "blur(32px)",
                boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,212,255,0.1), 0 0 40px rgba(0,212,255,0.05)",
              }}
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
                <Search className="h-4 w-4 text-slate-500 shrink-0" />
                <input
                  autoFocus
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Rechercher boutiques, utilisateurs, vues..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-600 outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="p-0.5 rounded text-slate-600 hover:text-slate-400">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
                <kbd className="text-[10px] text-slate-600 border border-white/10 rounded px-1.5 py-0.5 font-mono">ESC</kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto py-1.5">
                {shops.length > 0 && (
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 px-4 py-1.5">Boutiques</p>
                    {shops.map(shop => (
                      <button
                        key={shop.user_id}
                        onClick={() => handleSelect("shops")}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center shrink-0">
                          <Store className="h-3.5 w-3.5 text-[#00D4FF]" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white truncate">{shop.shop_name}</p>
                          <p className="text-xs text-slate-500 truncate">@{shop.username} · {shop.country}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">↵</span>
                      </button>
                    ))}
                  </div>
                )}

                {filteredCommands.length > 0 && (
                  <div>
                    {shops.length > 0 && <div className="h-px bg-white/5 mx-3 my-1" />}
                    <p className="text-[10px] uppercase tracking-widest text-slate-600 px-4 py-1.5">Navigation</p>
                    {filteredCommands.map(cmd => (
                      <button
                        key={cmd.view + cmd.label}
                        onClick={() => handleSelect(cmd.view)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                      >
                        <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                          <cmd.icon className="h-3.5 w-3.5 text-slate-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-white">{cmd.label}</p>
                          <p className="text-xs text-slate-500">{cmd.hint}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 group-hover:text-slate-400 transition-colors">↵</span>
                      </button>
                    ))}
                  </div>
                )}

                {shops.length === 0 && filteredCommands.length === 0 && (
                  <div className="py-10 text-center">
                    <p className="text-sm text-slate-600">Aucun résultat pour « {query} »</p>
                  </div>
                )}
              </div>

              {/* Footer hint */}
              <div className="border-t border-white/5 px-4 py-2 flex items-center gap-3">
                <span className="text-[10px] text-slate-700">↑↓ naviguer</span>
                <span className="text-[10px] text-slate-700">↵ sélectionner</span>
                <span className="text-[10px] text-slate-700">ESC fermer</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
