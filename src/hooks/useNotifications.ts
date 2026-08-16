import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "repair" | "stock" | "alert";
  title: string;
  description: string;
  time: string;
  read: boolean;
  createdAt: number;
  /** Shop (owner) id this notification belongs to — used as a second guard. */
  shopId?: string;
}

// Keys are scoped per shop so notifications of one shop never leak into
// another (same browser, account switch, or admin impersonation).
const STORAGE_KEY = "app_notifications";
const NOTIFIED_PRODUCTS_KEY = "notified_low_stock_products";
const NOTIFIED_REPAIRS_KEY = "notified_completed_repairs";

// Legacy global keys held merged notifications from every shop that ever
// used this browser profile — purge them once on upgrade.
const LEGACY_KEYS = [STORAGE_KEY, NOTIFIED_PRODUCTS_KEY, NOTIFIED_REPAIRS_KEY];
const PREFIXES = [STORAGE_KEY, NOTIFIED_PRODUCTS_KEY, NOTIFIED_REPAIRS_KEY];

const scopedKey = (prefix: string, shopId: string) => `${prefix}:${shopId}`;

/** Remove every notification blob that does not belong to `shopId`. */
function purgeForeignShopKeys(shopId: string) {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const prefix = PREFIXES.find((p) => key === p || key.startsWith(`${p}:`));
      if (!prefix) continue;
      if (key !== scopedKey(prefix, shopId)) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error("Error purging foreign notification keys:", e);
  }
}

/** Clear all notification storage (used on sign-out / shared devices). */
export function clearAllNotificationStorage() {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (PREFIXES.some((p) => key === p || key.startsWith(`${p}:`))) toRemove.push(key);
    }
    toRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.error("Error clearing notification storage:", e);
  }
}

interface ShopScopedList {
  shopId: string | null;
  items: Notification[];
}

interface ShopScopedSet {
  shopId: string | null;
  ids: Set<string>;
}

// Generate notifications based on real data
export function useNotifications(shopId: string | null) {
  // The list carries its own shop stamp: saves always write to the shop the
  // items belong to, even if `shopId` already moved (account switch race).
  const [notifState, setNotifState] = useState<ShopScopedList>({ shopId: null, items: [] });

  // Persisted tracking for already-notified items (per shop)
  const [productsState, setProductsState] = useState<ShopScopedSet>({ shopId: null, ids: new Set() });
  const [repairsState, setRepairsState] = useState<ShopScopedSet>({ shopId: null, ids: new Set() });

  // One-time cleanup of the legacy unscoped keys (cross-shop leak source).
  useEffect(() => {
    LEGACY_KEYS.forEach((k) => localStorage.removeItem(k));
  }, []);

  // Load the notifications and tracking sets of the current shop
  useEffect(() => {
    if (!shopId) {
      setNotifState({ shopId: null, items: [] });
      setProductsState({ shopId: null, ids: new Set() });
      setRepairsState({ shopId: null, ids: new Set() });
      return;
    }

    // Drop any blob belonging to another shop before reading ours.
    purgeForeignShopKeys(shopId);

    let items: Notification[] = [];
    try {
      const stored = localStorage.getItem(scopedKey(STORAGE_KEY, shopId));
      if (stored) {
        const parsed = JSON.parse(stored);
        // Second guard: never render an item stamped with another shop.
        items = Array.isArray(parsed)
          ? parsed.filter((n: Notification) => !n?.shopId || n.shopId === shopId)
          : [];
      }
    } catch (e) {
      console.error("Error parsing notifications:", e);
      items = [];
    }

    const readIds = (key: string): Set<string> => {
      try {
        const stored = localStorage.getItem(key);
        return stored ? new Set(JSON.parse(stored)) : new Set();
      } catch {
        return new Set();
      }
    };

    setNotifState({ shopId, items });
    setProductsState({ shopId, ids: readIds(scopedKey(NOTIFIED_PRODUCTS_KEY, shopId)) });
    setRepairsState({ shopId, ids: readIds(scopedKey(NOTIFIED_REPAIRS_KEY, shopId)) });
  }, [shopId]);


  // Persist — always under the shop the state belongs to
  useEffect(() => {
    if (!notifState.shopId) return;
    localStorage.setItem(scopedKey(STORAGE_KEY, notifState.shopId), JSON.stringify(notifState.items));
  }, [notifState]);

  useEffect(() => {
    if (!productsState.shopId) return;
    localStorage.setItem(scopedKey(NOTIFIED_PRODUCTS_KEY, productsState.shopId), JSON.stringify([...productsState.ids]));
  }, [productsState]);

  useEffect(() => {
    if (!repairsState.shopId) return;
    localStorage.setItem(scopedKey(NOTIFIED_REPAIRS_KEY, repairsState.shopId), JSON.stringify([...repairsState.ids]));
  }, [repairsState]);

  const addNotifiedProduct = useCallback((productId: string) => {
    setProductsState((prev) => ({ ...prev, ids: new Set([...prev.ids, productId]) }));
  }, []);

  const removeNotifiedProduct = useCallback((productId: string) => {
    setProductsState((prev) => {
      const next = new Set(prev.ids);
      next.delete(productId);
      return { ...prev, ids: next };
    });
  }, []);

  const hasNotifiedProduct = useCallback((productId: string) => {
    return productsState.ids.has(productId);
  }, [productsState.ids]);

  const addNotifiedRepair = useCallback((repairId: string) => {
    setRepairsState((prev) => ({ ...prev, ids: new Set([...prev.ids, repairId]) }));
  }, []);

  const hasNotifiedRepair = useCallback((repairId: string) => {
    return repairsState.ids.has(repairId);
  }, [repairsState.ids]);

  const markAsRead = useCallback((id: string) => {
    setNotifState((prev) => ({
      ...prev,
      items: prev.items.map((n) => (n.id === id ? { ...n, read: true } : n)),
    }));
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifState((prev) => ({ ...prev, items: prev.items.map((n) => ({ ...n, read: true })) }));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setNotifState((prev) => ({
      ...prev,
      items: [newNotification, ...prev.items].slice(0, 50), // Keep max 50 notifications
    }));
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifState((prev) => ({ ...prev, items: prev.items.filter((n) => n.id !== id) }));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifState((prev) => ({ ...prev, items: [] }));
  }, []);

  const notifications = notifState.items;
  const unreadCount = notifications.filter((n) => !n.read).length;

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications,
    // Tracking functions
    addNotifiedProduct,
    removeNotifiedProduct,
    hasNotifiedProduct,
    addNotifiedRepair,
    hasNotifiedRepair,
  };
}
