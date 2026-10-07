import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Platform support WhatsApp number (publicly readable `admin_whatsapp` setting). */
export function useSupportWhatsapp() {
  return useQuery({
    queryKey: ["support-whatsapp"],
    staleTime: 10 * 60_000,
    queryFn: async () => {
      const { data } = await supabase
        .from("platform_settings" as any)
        .select("value")
        .eq("key", "admin_whatsapp")
        .maybeSingle();
      return ((data as any)?.value as string | undefined)?.trim() || null;
    },
  });
}

/** Builds a wa.me link; returns null when no usable number is configured. */
export function buildWhatsappLink(phone: string | null | undefined, message: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 8) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
