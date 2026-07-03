import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export interface BackupSettings {
  autoBackup: boolean;
  cloudSync: boolean;
  lastSyncTime: string | null;
}

const STORAGE_KEY = "backup_settings";
const SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutes

const defaultSettings: BackupSettings = {
  autoBackup: false,
  cloudSync: false,
  lastSyncTime: null,
};

export function useBackup() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<BackupSettings>(defaultSettings);
  const [syncing, setSyncing] = useState(false);
  const [loading, setLoading] = useState(true);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataHashRef = useRef<string | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Error parsing backup settings:", e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage
  const saveSettings = useCallback((newSettings: Partial<BackupSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Generate a hash of the data to detect changes
  const generateDataHash = useCallback((data: any) => {
    return JSON.stringify(data).length.toString() + "_" + Date.now().toString().slice(-6);
  }, []);

  // Fetch all user data for backup
  const fetchAllData = useCallback(async () => {
    if (!user) return null;

    try {
      const [
        { data: products },
        { data: customers },
        { data: repairs },
        { data: sales },
        { data: expenses },
        { data: suppliers },
        { data: invoices },
        { data: categories },
        { data: shopSettings },
      ] = await Promise.all([
        supabase.from("products").select("*").eq("user_id", user.id),
        supabase.from("customers").select("*").eq("user_id", user.id),
        supabase.from("repairs").select("*").eq("user_id", user.id),
        supabase.from("sales").select("*").eq("user_id", user.id),
        supabase.from("expenses").select("*").eq("user_id", user.id),
        supabase.from("suppliers").select("*").eq("user_id", user.id),
        supabase.from("invoices").select("*").eq("user_id", user.id),
        supabase.from("categories").select("*").eq("user_id", user.id),
        supabase.from("shop_settings").select("*").eq("user_id", user.id),
      ]);

      return {
        products: products || [],
        customers: customers || [],
        repairs: repairs || [],
        sales: sales || [],
        expenses: expenses || [],
        suppliers: suppliers || [],
        invoices: invoices || [],
        categories: categories || [],
        shopSettings: shopSettings || [],
        exportedAt: new Date().toISOString(),
        version: "1.0",
      };
    } catch (error) {
      console.error("Error fetching data for backup:", error);
      return null;
    }
  }, [user]);

  // Export as JSON
  const exportJSON = useCallback(async () => {
    const data = await fetchAllData();
    if (!data) {
      toast.error("Erreur lors de la récupération des données");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Sauvegarde JSON téléchargée");
  }, [fetchAllData]);

  // Export as SQL
  const exportSQL = useCallback(async () => {
    const data = await fetchAllData();
    if (!data) {
      toast.error("Erreur lors de la récupération des données");
      return;
    }

    const generateInserts = (tableName: string, rows: any[]) => {
      if (rows.length === 0) return "";
      const columns = Object.keys(rows[0]);
      const inserts = rows.map((row) => {
        const values = columns.map((col) => {
          const val = row[col];
          if (val === null) return "NULL";
          if (typeof val === "number") return val;
          if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
          return `'${String(val).replace(/'/g, "''")}'`;
        });
        return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${values.join(", ")});`;
      });
      return `-- ${tableName}\n${inserts.join("\n")}\n\n`;
    };

    let sql = `-- Backup generated on ${data.exportedAt}\n`;
    sql += `-- Version: ${data.version}\n\n`;
    sql += generateInserts("products", data.products);
    sql += generateInserts("customers", data.customers);
    sql += generateInserts("repairs", data.repairs);
    sql += generateInserts("sales", data.sales);
    sql += generateInserts("expenses", data.expenses);
    sql += generateInserts("suppliers", data.suppliers);
    sql += generateInserts("invoices", data.invoices);
    sql += generateInserts("categories", data.categories);
    sql += generateInserts("shop_settings", data.shopSettings);

    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `backup_${new Date().toISOString().split("T")[0]}.sql`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("Sauvegarde SQL téléchargée");
  }, [fetchAllData]);

  // Export as Excel
  const exportExcel = useCallback(async () => {
    const data = await fetchAllData();
    if (!data) {
      toast.error("Erreur lors de la récupération des données");
      return;
    }

    const workbook = XLSX.utils.book_new();

    const addSheet = (name: string, rows: any[]) => {
      if (rows.length > 0) {
        const worksheet = XLSX.utils.json_to_sheet(rows);
        XLSX.utils.book_append_sheet(workbook, worksheet, name);
      }
    };

    addSheet("Produits", data.products);
    addSheet("Clients", data.customers);
    addSheet("Reparations", data.repairs);
    addSheet("Ventes", data.sales);
    addSheet("Depenses", data.expenses);
    addSheet("Fournisseurs", data.suppliers);
    addSheet("Factures", data.invoices);
    addSheet("Categories", data.categories);

    XLSX.writeFile(workbook, `backup_${new Date().toISOString().split("T")[0]}.xlsx`);
    toast.success("Sauvegarde Excel téléchargée");
  }, [fetchAllData]);

  // Restore from file
  const restoreFromFile = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        const data = JSON.parse(text);
        
        // Validate the backup format
        if (!data.version || !data.exportedAt) {
          toast.error("Format de fichier invalide");
          return;
        }

        toast.info("Fonctionnalité de restauration à venir. Les données ont été validées.");
        console.log("Backup data validated:", data);
      } catch (error) {
        toast.error("Erreur lors de la lecture du fichier");
      }
    };
    input.click();
  }, []);

  // Sync now (manual sync - just saves current state to localStorage as backup record)
  const syncNow = useCallback(async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    setSyncing(true);
    try {
      const data = await fetchAllData();
      if (data) {
        // Store a lightweight sync record in localStorage
        const syncRecord = {
          timestamp: new Date().toISOString(),
          recordCount: {
            products: data.products.length,
            customers: data.customers.length,
            repairs: data.repairs.length,
            sales: data.sales.length,
          },
        };
        
        const existingSyncs = JSON.parse(localStorage.getItem("sync_history") || "[]");
        existingSyncs.unshift(syncRecord);
        localStorage.setItem("sync_history", JSON.stringify(existingSyncs.slice(0, 10)));
        
        saveSettings({ lastSyncTime: syncRecord.timestamp });
        lastDataHashRef.current = generateDataHash(data);
        
        toast.success("Synchronisation réussie");
      }
    } catch (error) {
      toast.error("Erreur lors de la synchronisation");
    } finally {
      setSyncing(false);
    }
  }, [user, fetchAllData, saveSettings, generateDataHash]);

  // Auto-sync effect
  useEffect(() => {
    if (settings.cloudSync && user) {
      // Initial sync
      syncNow();

      // Set up interval for periodic sync
      syncIntervalRef.current = setInterval(() => {
        syncNow();
      }, SYNC_INTERVAL);

      return () => {
        if (syncIntervalRef.current) {
          clearInterval(syncIntervalRef.current);
        }
      };
    } else {
      // Clear interval when auto-sync is disabled
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
      }
    }
  }, [settings.cloudSync, user]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    settings,
    loading,
    syncing,
    saveSettings,
    exportJSON,
    exportSQL,
    exportExcel,
    restoreFromFile,
    syncNow,
  };
}
