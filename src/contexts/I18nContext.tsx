import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";

// Translation dictionaries
const translations = {
  fr: {
    // Sidebar
    "nav.dashboard": "Tableau de bord",
    "nav.pos": "Point de Vente",
    "nav.repairs": "Réparations",
    "nav.inventory": "Stock",
    "nav.customers": "Clients",
    "nav.suppliers": "Fournisseurs",
    "nav.expenses": "Dépenses",
    "nav.debts": "Dettes Clients",
    "nav.invoices": "Factures",
    "nav.statistics": "Statistiques",
    "nav.profit": "Profit",
    "nav.warranty": "Garantie",
    "nav.settings": "Paramètres",
    "nav.feedback": "Signaler / Suggérer",
    "nav.community": "Entraide",
    "nav.messages": "Messages",
    "nav.team": "Équipe",
    "nav.services": "Services & Outils",

    // Common
    "common.save": "Enregistrer",
    "common.cancel": "Annuler",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.add": "Ajouter",
    "common.search": "Rechercher",
    "common.loading": "Chargement...",
    "common.all": "Tout",
    "common.none": "Aucun",
    "common.actions": "Actions",
    "common.print": "Imprimer",
    "common.export": "Exporter",
    "common.back": "Retour",
    "common.confirm": "Confirmer",
    "common.close": "Fermer",
    "common.yes": "Oui",
    "common.no": "Non",

    // POS
    "pos.title": "Point de Vente",
    "pos.description": "Encaissement et ventes",
    "pos.searchProduct": "Rechercher un produit...",
    "pos.cart": "Panier",
    "pos.emptyCart": "Panier vide",
    "pos.clearCart": "Vider",
    "pos.subtotal": "Sous-total",
    "pos.tax": "TVA",
    "pos.total": "Total",
    "pos.card": "Carte",
    "pos.cash": "Espèces",
    "pos.anonymousClient": "Client anonyme",
    "pos.noProducts": "Aucun produit dans l'inventaire.",
    "pos.noResults": "Aucun produit trouvé pour cette recherche.",

    // Repairs
    "repairs.title": "Réparations",
    "repairs.description": "Gestion des réparations en cours",
    "repairs.new": "Nouvelle réparation",
    "repairs.pending": "En attente",
    "repairs.inProgress": "En cours",
    "repairs.completed": "Terminé",
    "repairs.delivered": "Livré",
    "repairs.device": "Appareil",
    "repairs.issue": "Problème",
    "repairs.customer": "Client",

    // Inventory
    "inventory.title": "Stock",
    "inventory.description": "Gestion des produits et pièces",
    "inventory.addProduct": "Nouveau produit",
    "inventory.lowStock": "Stock faible",
    "inventory.outOfStock": "Rupture",

    // Customers
    "customers.title": "Gestion des Clients",
    "customers.description": "Fiches clients et historique",
    "customers.new": "Nouveau client",
    "customers.totalClients": "Total clients",
    "customers.withCredit": "Clients avec crédit",
    "customers.totalDebts": "Total créances",
    "customers.searchPlaceholder": "Rechercher par nom ou téléphone...",
    "customers.viewDossier": "Voir dossier",
    "customers.noCustomers": "Aucun client enregistré.",

    // Settings
    "settings.title": "Paramètres",
    "settings.description": "Configuration du système",
    "settings.general": "Général",
    "settings.categories": "Catégories",
    "settings.backup": "Sauvegarde",
    "settings.users": "Utilisateurs",
    "settings.security": "Sécurité",
    "settings.preferences": "Préférences",
    "settings.shopName": "Nom du magasin",
    "settings.country": "Pays",
    "settings.currency": "Devise",
    "settings.taxRate": "Taux TVA (%)",
    "settings.enableTax": "Activer TVA",
    "settings.stockThreshold": "Seuil alerte stock",
    "settings.language": "Langue",
    "settings.brandColor": "Couleur de marque",
    "settings.shopLogo": "Logo de la boutique",
    "settings.uploadLogo": "Télécharger un logo",
    "settings.removeLogo": "Supprimer le logo",
    "settings.logoHint": "PNG, JPG ou SVG. Max 2 MB.",
    "settings.shopInfo": "Informations du magasin",
    "settings.shopInfoDesc": "Configurez les informations de base de votre atelier",
    "settings.appearanceTitle": "Apparence & Langue",
    "settings.appearanceDesc": "Personnalisez l'interface de votre boutique",

    // Dashboard
    "dashboard.title": "Tableau de bord",
    "dashboard.description": "Vue d'ensemble de votre activité",
  },
  en: {
    // Sidebar
    "nav.dashboard": "Dashboard",
    "nav.pos": "Point of Sale",
    "nav.repairs": "Repairs",
    "nav.inventory": "Inventory",
    "nav.customers": "Customers",
    "nav.suppliers": "Suppliers",
    "nav.expenses": "Expenses",
    "nav.debts": "Customer Debts",
    "nav.invoices": "Invoices",
    "nav.statistics": "Statistics",
    "nav.profit": "Profit",
    "nav.warranty": "Warranty",
    "nav.community": "Community",
    "nav.messages": "Messages",
    "nav.team": "Team",
    "nav.services": "Services & Tools",
    "nav.settings": "Settings",
    "nav.feedback": "Report / Suggest",

    // Common
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.add": "Add",
    "common.search": "Search",
    "common.loading": "Loading...",
    "common.all": "All",
    "common.none": "None",
    "common.actions": "Actions",
    "common.print": "Print",
    "common.export": "Export",
    "common.back": "Back",
    "common.confirm": "Confirm",
    "common.close": "Close",
    "common.yes": "Yes",
    "common.no": "No",

    // POS
    "pos.title": "Point of Sale",
    "pos.description": "Checkout and sales",
    "pos.searchProduct": "Search product...",
    "pos.cart": "Cart",
    "pos.emptyCart": "Cart is empty",
    "pos.clearCart": "Clear",
    "pos.subtotal": "Subtotal",
    "pos.tax": "Tax",
    "pos.total": "Total",
    "pos.card": "Card",
    "pos.cash": "Cash",
    "pos.anonymousClient": "Walk-in customer",
    "pos.noProducts": "No products in inventory.",
    "pos.noResults": "No products found.",

    // Repairs
    "repairs.title": "Repairs",
    "repairs.description": "Manage ongoing repairs",
    "repairs.new": "New Repair",
    "repairs.pending": "Pending",
    "repairs.inProgress": "In Progress",
    "repairs.completed": "Completed",
    "repairs.delivered": "Delivered",
    "repairs.device": "Device",
    "repairs.issue": "Issue",
    "repairs.customer": "Customer",

    // Inventory
    "inventory.title": "Inventory",
    "inventory.description": "Products and parts management",
    "inventory.addProduct": "New Product",
    "inventory.lowStock": "Low Stock",
    "inventory.outOfStock": "Out of Stock",

    // Customers
    "customers.title": "Customer Management",
    "customers.description": "Customer profiles and history",
    "customers.new": "New Customer",
    "customers.totalClients": "Total Customers",
    "customers.withCredit": "Customers with Credit",
    "customers.totalDebts": "Total Outstanding",
    "customers.searchPlaceholder": "Search by name or phone...",
    "customers.viewDossier": "View Profile",
    "customers.noCustomers": "No customers registered.",

    // Settings
    "settings.title": "Settings",
    "settings.description": "System configuration",
    "settings.general": "General",
    "settings.categories": "Categories",
    "settings.backup": "Backup",
    "settings.users": "Users",
    "settings.security": "Security",
    "settings.preferences": "Preferences",
    "settings.shopName": "Shop Name",
    "settings.country": "Country",
    "settings.currency": "Currency",
    "settings.taxRate": "Tax Rate (%)",
    "settings.enableTax": "Enable Tax",
    "settings.stockThreshold": "Stock Alert Threshold",
    "settings.language": "Language",
    "settings.brandColor": "Brand Color",
    "settings.shopLogo": "Shop Logo",
    "settings.uploadLogo": "Upload Logo",
    "settings.removeLogo": "Remove Logo",
    "settings.logoHint": "PNG, JPG or SVG. Max 2 MB.",
    "settings.shopInfo": "Shop Information",
    "settings.shopInfoDesc": "Configure your shop's basic information",
    "settings.appearanceTitle": "Appearance & Language",
    "settings.appearanceDesc": "Customize your shop's interface",

    // Dashboard
    "dashboard.title": "Dashboard",
    "dashboard.description": "Overview of your activity",
  },
} as const;

type Language = "fr" | "en";
type TranslationKey = keyof typeof translations.fr;

interface I18nContextType {
  language: Language;
  t: (key: TranslationKey) => string;
  setLanguage: (lang: Language) => void;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const { settings, saveSettings } = useShopSettingsContext();
  const [language, setLanguageState] = useState<Language>(
    (settings.language as Language) || "fr"
  );

  // Sync language from settings
  useEffect(() => {
    if (settings.language && settings.language !== language) {
      setLanguageState(settings.language as Language);
    }
  }, [settings.language]);

  const setLanguage = useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await saveSettings({ language: lang } as any);
  }, [saveSettings]);

  const t = useCallback((key: TranslationKey): string => {
    return translations[language]?.[key] || translations.fr[key] || key;
  }, [language]);

  return (
    <I18nContext.Provider value={{ language, t, setLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return context;
}
