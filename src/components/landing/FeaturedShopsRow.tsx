import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface FeaturedShop {
  shop_name: string;
  address: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  logo_url: string | null;
  repair_count: number;
}

const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "RP";

export function FeaturedShopsRow() {
  const { data: shops = [] } = useQuery({
    queryKey: ["featured-shops"],
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_featured_shops");
      if (error) throw error;
      return (data || []) as FeaturedShop[];
    },
  });

  const top = shops.slice(0, 5);
  if (top.length === 0) return null;

  const goToPartners = () => {
    document.getElementById("partenaires")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="rp-container">
      <style>{`
        .rp-shoprow { display: flex; align-items: center; gap: 14px; padding: 10px 14px; margin-top: 14px;
          border: 1px solid var(--rp-line); border-radius: 14px; background: color-mix(in srgb, var(--rp-surface) 70%, transparent);
          backdrop-filter: blur(8px); cursor: pointer; overflow-x: auto; scrollbar-width: none; }
        .rp-shoprow::-webkit-scrollbar { display: none; }
        .rp-shoprow-label { display: flex; align-items: center; gap: 7px; font-size: 11px; letter-spacing: .08em;
          text-transform: uppercase; color: var(--rp-muted); white-space: nowrap; flex-shrink: 0; }
        .rp-shoprow-dot { width: 7px; height: 7px; border-radius: 999px; background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,.6); animation: rp-shoprow-pulse 2s infinite; flex-shrink: 0; }
        @keyframes rp-shoprow-pulse { 70% { box-shadow: 0 0 0 7px rgba(34,197,94,0); } 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); } }
        .rp-shoprow-items { display: flex; align-items: center; gap: 16px; }
        .rp-shoprow-item { display: flex; align-items: center; gap: 8px; white-space: nowrap; }
        .rp-shoprow-name { font-size: 13px; font-weight: 600; color: var(--rp-muted); }
        .rp-shoprow-logo { width: 26px; height: 26px; border-radius: 8px; flex-shrink: 0; display: grid;
          place-items: center; overflow: hidden; background: var(--rp-surface); border: 1px solid var(--rp-line);
          color: var(--rp-accent-2); font-weight: 700; font-size: 10px; }
        .rp-shoprow-logo img { width: 100%; height: 100%; object-fit: cover; }
        @media (prefers-reduced-motion: reduce) { .rp-shoprow-dot { animation: none; } }
        @media (max-width: 640px) { .rp-shoprow-name { display: none; } .rp-shoprow-items { gap: 10px; } }
      `}</style>
      <div
        className="rp-shoprow"
        role="button"
        tabIndex={0}
        onClick={goToPartners}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToPartners(); } }}
        aria-label="Voir nos ateliers partenaires"
      >
        <span className="rp-shoprow-label">
          <span className="rp-shoprow-dot" /> Ateliers partenaires
        </span>
        <div className="rp-shoprow-items">
          {top.map((s) => (
            <div className="rp-shoprow-item" key={s.shop_name}>
              <span className="rp-shoprow-logo">
                {s.logo_url ? (
                  <img src={s.logo_url} alt={s.shop_name} loading="lazy" />
                ) : (
                  initials(s.shop_name)
                )}
              </span>
              <span className="rp-shoprow-name">{s.shop_name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
