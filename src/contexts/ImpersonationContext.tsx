import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ImpersonationContextType {
  impersonatedUserId: string | null;
  isImpersonating: boolean;
  isReadOnly: boolean;
  isVerifying: boolean;
  impersonatedShopName: string | null;
  exitImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedUserId: null,
  isImpersonating: false,
  isReadOnly: false,
  isVerifying: false,
  impersonatedShopName: null,
  exitImpersonation: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const impersonateParam = searchParams.get("impersonate");
  const modeParam = searchParams.get("mode");

  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!impersonateParam || !user) {
      setImpersonatedUserId(null);
      setShopName(null);
      setVerified(false);
      setIsVerifying(false);
      return;
    }

    setIsVerifying(true);

    const verify = async () => {
      try {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "platform_admin")
          .maybeSingle();

        if (!roleData) {
          toast.error("Accès non autorisé");
          navigate("/", { replace: true });
          return;
        }

        const { data: settings } = await supabase
          .from("shop_settings")
          .select("shop_name")
          .eq("user_id", impersonateParam)
          .maybeSingle();

        setImpersonatedUserId(impersonateParam);
        setShopName(settings?.shop_name || "Boutique");
        setVerified(true);
      } finally {
        setIsVerifying(false);
      }
    };

    verify();
  }, [impersonateParam, user, navigate]);

  const exitImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    setShopName(null);
    setVerified(false);
    navigate("/admin", { replace: true });
  }, [navigate]);

  const isImpersonating = verified && !!impersonatedUserId;
  const isReadOnly = isImpersonating && modeParam === "readonly";

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId: isImpersonating ? impersonatedUserId : null,
        isImpersonating,
        isReadOnly,
        isVerifying,
        impersonatedShopName: shopName,
        exitImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation(): ImpersonationContextType {
  return useContext(ImpersonationContext);
}
