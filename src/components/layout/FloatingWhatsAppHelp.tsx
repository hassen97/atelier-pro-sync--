import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useSupportWhatsapp, buildWhatsappLink } from "@/hooks/useSupportWhatsapp";

/** Floating "Besoin d'aide ?" WhatsApp button shown inside the shop app. */
export function FloatingWhatsAppHelp() {
  const { user } = useAuth();
  const { settings } = useShopSettingsContext();
  const { data: phone } = useSupportWhatsapp();
  const location = useLocation();

  // The POS has its own dense bottom area (cart / pay button) — stay out of the way.
  if (location.pathname.startsWith("/pos")) return null;

  const username = user?.email?.split("@")[0] ?? "";
  const shop = settings?.shop_name || "ma boutique";
  const href = buildWhatsappLink(
    phone,
    `Bonjour, je suis ${shop}${username ? ` (@${username})` : ""}. J'utilise RepairPro et j'ai une question : `,
  );
  if (!href) return null;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Besoin d'aide ? Écrivez-nous sur WhatsApp"
      title="Besoin d'aide ? Écrivez-nous sur WhatsApp"
      className="print:hidden fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-success px-4 py-3 text-sm font-semibold text-success-foreground shadow-lg transition-transform hover:scale-105"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Besoin d'aide ?</span>
    </a>
  );
}
