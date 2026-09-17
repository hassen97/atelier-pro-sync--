import { ShieldCheck, DatabaseBackup, WifiOff, MessageCircle, Coins, Languages } from "lucide-react";
import { Reveal } from "@/components/landing/Reveal";

const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Isolation par boutique",
    desc: "Vos données ne sont visibles que par vous et votre équipe.",
  },
  {
    icon: DatabaseBackup,
    title: "Sauvegardes quotidiennes",
    desc: "Copies automatiques + export à tout moment.",
  },
  {
    icon: WifiOff,
    title: "Fonctionne hors-ligne",
    desc: "PWA installable, synchro dès le retour du réseau.",
  },
  {
    icon: MessageCircle,
    title: "Support WhatsApp",
    desc: "Réponse moyenne < 2 h en heures ouvrées.",
  },
  {
    icon: Coins,
    title: "Prix en dinars",
    desc: "Tarification locale, sans frais cachés.",
  },
  {
    icon: Languages,
    title: "FR · AR · EN",
    desc: "Interface arabe RTL native incluse.",
  },
];

/**
 * Trust bar: surfaces guarantees that are already true in the product
 * (per-tenant isolation, backups, offline PWA, WhatsApp support, TND, i18n)
 * but were previously only buried in the FAQ.
 */
export function TrustBar() {
  return (
    <section className="rp-section" style={{ paddingTop: 0, paddingBottom: 0 }}>
      <div className="rp-container">
        <Reveal>
          <div className="rp-trust">
            {ITEMS.map((it, i) => (
              <div className="rp-trust-item" key={it.title} style={{ transitionDelay: `${i * 40}ms` }}>
                <span className="rp-trust-ic">
                  <it.icon size={18} strokeWidth={1.75} />
                </span>
                <b>{it.title}</b>
                <span>{it.desc}</span>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
