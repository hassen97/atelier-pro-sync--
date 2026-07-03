import { useState, useEffect, useCallback } from "react";

export interface Notification {
  id: string;
  type: "repair" | "stock" | "alert";
  title: string;
  description: string;
  time: string;
  read: boolean;
  createdAt: number;
}

const STORAGE_KEY = "app_notifications";
const NOTIFIED_PRODUCTS_KEY = "notified_low_stock_products";
const NOTIFIED_REPAIRS_KEY = "notified_completed_repairs";

// Generate notifications based on real data
export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  
  // Persisted tracking for already-notified items
  const [notifiedProductIds, setNotifiedProductIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(NOTIFIED_PRODUCTS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });
  
  const [notifiedRepairIds, setNotifiedRepairIds] = useState<Set<string>>(() => {
    const stored = localStorage.getItem(NOTIFIED_REPAIRS_KEY);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Load notifications from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } catch (e) {
        console.error("Error parsing notifications:", e);
        setNotifications([]);
      }
    }
  }, []);

  // Save notifications to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);
  
  // Persist notified product IDs
  useEffect(() => {
    localStorage.setItem(NOTIFIED_PRODUCTS_KEY, JSON.stringify([...notifiedProductIds]));
  }, [notifiedProductIds]);
  
  // Persist notified repair IDs
  useEffect(() => {
    localStorage.setItem(NOTIFIED_REPAIRS_KEY, JSON.stringify([...notifiedRepairIds]));
  }, [notifiedRepairIds]);
  
  const addNotifiedProduct = useCallback((productId: string) => {
    setNotifiedProductIds((prev) => new Set([...prev, productId]));
  }, []);
  
  const removeNotifiedProduct = useCallback((productId: string) => {
    setNotifiedProductIds((prev) => {
      const next = new Set(prev);
      next.delete(productId);
      return next;
    });
  }, []);
  
  const hasNotifiedProduct = useCallback((productId: string) => {
    return notifiedProductIds.has(productId);
  }, [notifiedProductIds]);
  
  const addNotifiedRepair = useCallback((repairId: string) => {
    setNotifiedRepairIds((prev) => new Set([...prev, repairId]));
  }, []);
  
  const hasNotifiedRepair = useCallback((repairId: string) => {
    return notifiedRepairIds.has(repairId);
  }, [notifiedRepairIds]);

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, "id" | "createdAt">) => {
    const newNotification: Notification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    };
    setNotifications((prev) => [newNotification, ...prev].slice(0, 50)); // Keep max 50 notifications
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

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
