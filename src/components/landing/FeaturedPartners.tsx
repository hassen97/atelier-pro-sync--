import { useQuery } from "@tanstack/react-query";
import { Phone, MessageCircle, MapPin, BadgeCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Reveal } from "@/components/landing/Reveal";

interface FeaturedShop {
  shop_name: string;
  address: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  logo_url: string | null;
  repair_count: number;
}

const digits = (v: string | null) => (v || "").replace(/\D/g, "");
const waNumber = (v: string | null) => {
  const d = digits(v);
  if (!d) return "";
  return d.length === 8 ? `216${d}` : d;
};
const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "RP";
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(Math.floor(n / 10) * 10);

function Logo({ shop, size }: { shop: FeaturedShop; size: number }) {
  const style = {
    width: size, height: size, borderRadius: 12, flexShrink: 0,
    display: "grid", placeItems: "center", overflow: "hidden",
    background: "var(--rp-surface)", border: "1px solid var(--rp-line)",
    color: "var(--rp-accent-2)", fontWeight: 700, fontSize: size * 0.36,
  } as const;
  return (
    <span style={style}>
      {shop.logo_url ? (
        <img src={shop.logo_url} alt={shop.shop_name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        initials(shop.shop_name)
      )}
    </span>
  );
}

export function FeaturedPartners() {
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
  const loop = shops.length ? [...shops, ...shops, ...shops] : [];

  return (
    <section id="partenaires" className="rp-section" style={{ paddingTop: 32 }}>
      <style>{`
        @keyframes rp-fp-scroll { from { transform: translateX(0); } to { transform: translateX(-33.333%); } }
        .rp-fp-track { display: flex; gap: 14px; width: max-content; animation: rp-fp-scroll 40s linear infinite; }
        .rp-fp-marquee:hover .rp-fp-track { animation-play-state: paused; }
        @media (prefers-reduced-motion: reduce) { .rp-fp-track { animation: none; } }
        .rp-fp-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 28px; }
        .rp-fp-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 14px; margin-top: 28px; }
        .rp-fp-card { background: var(--rp-surface); border: 1px solid var(--rp-line); border-radius: 16px; padding: 18px; display: flex; flex-direction: column; gap: 12px; }
        .rp-fp-stat { border: 1px solid var(--rp-line); border-radius: 14px; padding: 16px; text-align: center; background: var(--rp-surface); }
        .rp-fp-stat b { display: block; font-size: clamp(20px, 3vw, 28px); color: var(--rp-accent-2); }
        .rp-fp-stat span { font-size: 12px; color: var(--rp-muted); }
        @media (max-width: 640px) { .rp-fp-stats { grid-template-columns: 1fr; } }
      `}</style>
      <div className="rp-container">
        <Reveal>
          <div className="rp-section-head">
            <span className="rp-eyebrow">Ils nous font confiance</span>
            <h2>Des ateliers réels, partout en Tunisie.</h2>
          </div>
          <div className="rp-fp-stats">
            <div className="rp-fp-stat"><b>3 500+</b><span>réparations gérées avec succès</span></div>
            <div className="rp-fp-stat"><b>60+</b><span>ateliers partenaires</span></div>
            <div className="rp-fp-stat"><b>99,9 %</b><span>de disponibilité</span></div>
          </div>
        </Reveal>

        {loop.length > 0 && (
          <div className="rp-fp-marquee" style={{ overflow: "hidden", maskImage: "linear-gradient(90deg, transparent, #000 8%, #000 92%, transparent)" }}>
            <div className="rp-fp-track">
              {loop.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px 8px 8px", border: "1px solid var(--rp-line)", borderRadius: 999, whiteSpace: "nowrap" }}>
                  <Logo shop={s} size={32} />
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{s.shop_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {top.length > 0 && (
          <div className="rp-fp-grid">
            {top.map((s) => {
              const wa = waNumber(s.whatsapp_phone || s.phone);
              const tel = digits(s.phone || s.whatsapp_phone);
              return (
                <div key={s.shop_name} className="rp-fp-card">
                  <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                    <Logo shop={s} size={52} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.shop_name}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--rp-accent-2)" }}>
                        <BadgeCheck size={13} /> Atelier vérifié
                      </div>
                    </div>
                  </div>
                  {s.address && (
                    <div style={{ display: "flex", gap: 6, fontSize: 13, color: "var(--rp-muted)" }}>
                      <MapPin size={14} style={{ flexShrink: 0, marginTop: 2 }} />
                      <span>{s.address}</span>
                    </div>
                  )}
                  {s.repair_count >= 10 && (
                    <div style={{ fontSize: 13 }}>
                      <b style={{ color: "var(--rp-accent-2)" }}>+{fmt(Number(s.repair_count))}</b> réparations
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto" }}>
                    {wa && (
                      <a className="rp-btn rp-btn-primary rp-btn-sm" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                    {tel && (
                      <a className="rp-btn rp-btn-ghost rp-btn-sm" href={`tel:${tel}`}>
                        <Phone size={14} /> Appeler
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
