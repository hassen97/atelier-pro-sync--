import { useState, useEffect, useCallback } from "react";

export interface NotificationSettings {
  lowStockAlerts: boolean;
  paymentReminders: boolean;
  browserNotifications: boolean;
}

const STORAGE_KEY = "notification_settings";

const defaultSettings: NotificationSettings = {
  lowStockAlerts: true,
  paymentReminders: true,
  browserNotifications: false,
};

export function getPermissionStatus(): "granted" | "denied" | "default" | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<ReturnType<typeof getPermissionStatus>>(getPermissionStatus);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Error parsing notification settings:", e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const requestBrowserPermission = useCallback(async (): Promise<boolean> => {
    if (!("Notification" in window)) {
      setPermissionStatus("unsupported");
      return false;
    }

    if (Notification.permission === "granted") {
      setPermissionStatus("granted");
      return true;
    }

    if (Notification.permission === "denied") {
      setPermissionStatus("denied");
      return false;
    }

    const result = await Notification.requestPermission();
    setPermissionStatus(result === "granted" ? "granted" : "denied");
    return result === "granted";
  }, []);

  return {
    settings,
    loading,
    saveSettings,
    permissionStatus,
    requestBrowserPermission,
  };
}
