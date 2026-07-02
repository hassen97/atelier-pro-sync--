import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { usePresence } from "@/hooks/usePresence";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (username: string, password: string, fullName: string, country?: string, currency?: string, phone?: string, whatsappPhone?: string, email?: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Detect network-level failures consistently
function isNetworkError(err: unknown): boolean {
  if (!err) return false;
  const message = (err as Error).message || "";
  const name = (err as Error).name || "";
  return name === "AbortError" ||
    message.includes("Failed to fetch") ||
    message.includes("NetworkError") ||
    message.includes("Load failed") ||
    message.includes("aborted");
}

// Fallback: Direct fetch to Supabase Auth REST API with timeout + retries
async function authFetch(endpoint: string, body: Record<string, unknown>, maxRetries = 3): Promise<{ data: any; error: Error | null }> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
      clearTimeout(timeout);

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error_description || json?.error || json?.msg || "Erreur d'authentification";
        return { data: null, error: new Error(String(msg)) };
      }

      return { data: json, error: null };
    } catch (err) {
      clearTimeout(timeout);
      if (isNetworkError(err) && attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 500));
        continue;
      }
      if (isNetworkError(err)) {
        return { data: null, error: new Error("Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.") };
      }
      return { data: null, error: err as Error };
    }
  }
  return { data: null, error: new Error("Erreur inattendue") };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const signupMutex = useState({ inProgress: false })[0];

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error || !session) {
        console.log("[Auth] Clearing stale session data", error?.message);
        supabase.auth.signOut();
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const usernameToEmail = (username: string) => `${username.toLowerCase()}@repairpro.local`;

  const signUp = async (username: string, password: string, fullName: string, country?: string, currency?: string, phone?: string, whatsappPhone?: string, email?: string) => {
    const internalEmail = usernameToEmail(username);
    const metadata = {
      full_name: fullName,
      username: username.toLowerCase(),
      ...(country && { country }),
      ...(currency && { currency }),
      ...(phone && { phone }),
      ...(whatsappPhone && { whatsapp_phone: whatsappPhone }),
      ...(email && { email }),
    };

    // Mutex: prevent concurrent signup calls
    if (signupMutex.inProgress) {
      return { error: new Error("Inscription en cours, veuillez patienter.") };
    }
    signupMutex.inProgress = true;

    try {
      // Primary: Supabase JS client
      console.log("[Auth] signUp: attempting with Supabase client...");
      try {
        const { data, error } = await supabase.auth.signUp({
          email: internalEmail,
          password,
          options: { data: metadata },
        });
        console.log("[Auth] signUp: client result", { error: error?.message });
        if (!error) return { error: null };
        if (!isNetworkError(error)) return { error };
        // Network error → fall through to fallback
      } catch (err) {
        if (!isNetworkError(err)) return { error: err as Error };
      }

      // Fallback: direct REST fetch (single attempt only for signup)
      console.log("[Auth] signUp: falling back to REST (single attempt)...");
      const { data, error } = await authFetch("signup", {
        email: internalEmail,
        password,
        data: metadata,
      }, 1);

      if (error) return { error };

      if (data?.access_token && data?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        });
      }

      return { error: null };
    } finally {
      signupMutex.inProgress = false;
    }
  };

  const signIn = async (username: string, password: string) => {
    const internalEmail = usernameToEmail(username);

    // Primary: Supabase JS client
    console.log("[Auth] signIn: attempting with Supabase client...");
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password,
      });
      console.log("[Auth] signIn: client result", { error: error?.message });
      if (!error) return { error: null };
      if (!isNetworkError(error)) return { error };
      // Network error → fall through to fallback
    } catch (err) {
      if (!isNetworkError(err)) return { error: err as Error };
    }

    // Fallback: direct REST fetch
    console.log("[Auth] signIn: falling back to REST...");
    const { data, error } = await authFetch("token?grant_type=password", {
      email: internalEmail,
      password,
    });

    if (error) return { error };

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) return { error: sessionError };
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  // Track user presence (last_online_at)
  usePresence(user?.id);

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
