import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const VAPID_KEY_CACHE_KEY = "rp_vapid_pub";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

async function fetchVapidPublicKey(): Promise<string> {
  const cached = sessionStorage.getItem(VAPID_KEY_CACHE_KEY);
  if (cached) return cached;
  const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
  const url = `https://${projectId}.supabase.co/functions/v1/send-web-push?action=public-key`;
  const res = await fetch(url, {
    headers: {
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
  });
  if (!res.ok) throw new Error("Failed to fetch VAPID key");
  const json = await res.json();
  if (!json.publicKey) throw new Error("VAPID public key not configured");
  sessionStorage.setItem(VAPID_KEY_CACHE_KEY, json.publicKey);
  return json.publicKey;
}

export type PushStatus =
  | "unsupported"
  | "denied"
  | "default"
  | "subscribed"
  | "loading";

export function usePushSubscription() {
  const [status, setStatus] = useState<PushStatus>("loading");
  const [busy, setBusy] = useState(false);

  const supported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  const refresh = useCallback(async () => {
    if (!supported) {
      setStatus("unsupported");
      return;
    }
    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub && Notification.permission === "granted") {
        setStatus("subscribed");
      } else {
        setStatus(Notification.permission === "granted" ? "default" : "default");
      }
    } catch {
      setStatus("default");
    }
  }, [supported]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error("Notifications push non supportées sur ce navigateur");
      return false;
    }
    setBusy(true);
    try {
      // Ensure SW is registered (in production it's auto-registered by main.tsx)
      let reg = await navigator.serviceWorker.getRegistration();
      if (!reg) {
        reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
        await navigator.serviceWorker.ready;
      }

      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "default");
        toast.error("Permission refusée");
        return false;
      }

      const publicKey = await fetchVapidPublicKey();

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        const keyArr = urlBase64ToUint8Array(publicKey);
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyArr.buffer.slice(
            keyArr.byteOffset,
            keyArr.byteOffset + keyArr.byteLength
          ) as ArrayBuffer,
        });
      }

      const json = sub.toJSON() as {
        endpoint?: string;
        keys?: { p256dh?: string; auth?: string };
      };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Invalid push subscription");
      }

      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Non authentifié");

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: uid,
          endpoint: json.endpoint,
          p256dh: json.keys.p256dh,
          auth: json.keys.auth,
          user_agent: navigator.userAgent,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;

      setStatus("subscribed");
      toast.success("Notifications push activées");
      return true;
    } catch (e: any) {
      console.error("[usePushSubscription] subscribe error:", e);
      toast.error(`Erreur: ${e?.message ?? e}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return false;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
      }
      setStatus("default");
      toast.success("Notifications push désactivées");
      return true;
    } catch (e: any) {
      toast.error(`Erreur: ${e?.message ?? e}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, [supported]);

  const sendTest = useCallback(async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-web-push", {
        body: {
          test: true,
          title: "🧪 Test RepairPro",
          body: "Si vous voyez ceci, les notifications push fonctionnent !",
          url: "/admin",
        },
      });
      if (error) throw error;
      const sent = (data as any)?.sent ?? 0;
      if (sent > 0) {
        toast.success(`Notification de test envoyée (${sent} appareil${sent > 1 ? "s" : ""})`);
      } else {
        toast.error(
          "Aucun appareil abonné. Activez d'abord les notifications dans ce navigateur."
        );
      }
      return sent > 0;
    } catch (e: any) {
      toast.error(`Erreur d'envoi: ${e?.message ?? e}`);
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    supported,
    status,
    busy,
    subscribe,
    unsubscribe,
    sendTest,
    refresh,
  };
}
