import { createContext, useContext, ReactNode, useEffect, useCallback } from "react";
import { useNotifications, type Notification as AppNotification } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useAllProducts } from "@/hooks/useProducts";
import { useRepairs } from "@/hooks/useRepairs";

interface NotificationsContextType {
  notifications: AppNotification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<AppNotification, "id" | "createdAt">) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications,
    // Persisted tracking functions
    addNotifiedProduct,
    removeNotifiedProduct,
    hasNotifiedProduct,
    addNotifiedRepair,
    hasNotifiedRepair,
  } = useNotifications();
  
  const { settings: notifSettings } = useNotificationSettings();
  const { data: products } = useAllProducts();
  const { data: repairsResult } = useRepairs();
  const repairs = repairsResult?.data;

  // Helper to send browser notification
  const sendBrowserNotification = useCallback((title: string, body: string) => {
    if (notifSettings.browserNotifications && "Notification" in window && Notification.permission === "granted") {
      new Notification(title, {
        body,
        icon: "/favicon.png",
      });
    }
  }, [notifSettings.browserNotifications]);

  // Check for low stock products - uses persisted tracking
  useEffect(() => {
    if (!notifSettings.lowStockAlerts || !products) return;

    products.forEach((product) => {
      if (product.quantity <= product.min_quantity && !hasNotifiedProduct(product.id)) {
        addNotifiedProduct(product.id);
        const title = "Stock faible";
        const description = `${product.name} - ${product.quantity} unité(s) restante(s)`;
        addNotification({
          type: "stock",
          title,
          description,
          time: "À l'instant",
          read: false,
        });
        sendBrowserNotification(title, description);
      } else if (product.quantity > product.min_quantity && hasNotifiedProduct(product.id)) {
        removeNotifiedProduct(product.id);
      }
    });
  }, [products, notifSettings.lowStockAlerts, addNotification, hasNotifiedProduct, addNotifiedProduct, removeNotifiedProduct, sendBrowserNotification]);

  // Check for completed/delivered repairs - uses persisted tracking
  useEffect(() => {
    if (!repairs) return;

    repairs.forEach((repair) => {
      if (
        (repair.status === "completed" || repair.status === "delivered") &&
        !hasNotifiedRepair(repair.id)
      ) {
        addNotifiedRepair(repair.id);
        const customerName = (repair as any).customer?.name || "Client anonyme";
        const title = repair.status === "completed" ? "Réparation terminée" : "Réparation livrée";
        const description = `${repair.device_model} - ${customerName}`;
        addNotification({
          type: "repair",
          title,
          description,
          time: "À l'instant",
          read: false,
        });
        sendBrowserNotification(title, description);
      }
    });
  }, [repairs, addNotification, hasNotifiedRepair, addNotifiedRepair, sendBrowserNotification]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}
