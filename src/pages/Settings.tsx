import { useState, useEffect, useRef } from "react";
import {
  Store,
  Save,
  Database,
  Shield,
  Bell,
  Users,
  Download,
  Upload,
  Cloud,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Key,
  Tag,
  Globe,
  Phone,
  Mail,
  Palette,
  Image,
  Trash2,
  Languages,
  Lock,
  Copy,
  Package,
  Settings2,
  CreditCard,
 } from "lucide-react";
import { Receipt } from "lucide-react";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useBackup } from "@/hooks/useBackup";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { ResetDataDialog } from "@/components/settings/ResetDataDialog";
import { CategoriesSettings } from "@/components/settings/CategoriesSettings";
import { ExpenseCategoriesSettings } from "@/components/settings/ExpenseCategoriesSettings";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { TaskManagement } from "@/components/settings/TaskManagement";
import { BillingDashboard } from "@/components/billing/BillingDashboard";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";
import { BRAND_COLOR_PRESETS, useBrandTheme } from "@/contexts/BrandThemeContext";
import { useI18n } from "@/contexts/I18nContext";
import { useIsMobile } from "@/hooks/use-mobile";

const TABS = [
  { value: "boutique", label: "Boutique", icon: Store },
  { value: "inventaire", label: "Inventaire", icon: Package },
  { value: "acces", label: "Accès", icon: Users },
  { value: "abonnement", label: "Abonnement", icon: CreditCard },
  { value: "systeme", label: "Système", icon: Settings2 },
] as const;

type TabValue = typeof TABS[number]["value"];

/* ─── Glassmorphism card wrapper ─── */
function GlassCard({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/80 backdrop-blur-md shadow-soft",
        "dark:bg-zinc-900/50 dark:border-zinc-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/* ─── Section sub-heading inside combined tabs ─── */
function SectionHeading({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description?: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <div className="p-2 rounded-lg bg-primary/10 text-primary shrink-0">
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <h3 className="font-semibold text-sm">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
    </div>
  );
}

/* ─── Animated tab content wrapper ─── */
function AnimatedPanel({ active, children }: { active: boolean; children: React.ReactNode }) {
  if (!active) return null;
  return (
    <div
      className="animate-fade-in space-y-6"
      style={{ animationDuration: "0.25s" }}
    >
      {children}
    </div>
  );
}

export default function Settings() {
  const { settings, loading, saving, saveSettings } = useShopSettingsContext();
  const { inventoryLocked, toggleInventoryLock, generateCode, generating, generatedCode } = useInventoryAccess();
  const { settings: notifSettings, saveSettings: saveNotifSettings, permissionStatus, requestBrowserPermission } = useNotificationSettings();
  const { 
    settings: backupSettings, 
    syncing, 
    saveSettings: saveBackupSettings, 
    exportJSON, 
    exportSQL, 
    exportExcel,
    restoreFromFile, 
    syncNow 
  } = useBackup();

  const {
    settings: securitySettings,
    resetting,
    saveSettings: saveSecuritySettings,
    resetAllData,
  } = useSecuritySettings();

  const { updatePassword, user } = useAuth();
  const { applyColor } = useBrandTheme();
  const { language, setLanguage, t } = useI18n();
  const isMobile = useIsMobile();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoSize, setLogoSize] = useState<"small" | "medium" | "large" | "xlarge">("medium");
  const [brandColor, setBrandColor] = useState("blue");
  const [customHex, setCustomHex] = useState("");
  const [activeTab, setActiveTab] = useState<TabValue>("boutique");
  
  const [shopName, setShopName] = useState("");
  const [shopCountry, setShopCountry] = useState("TN");
  const [shopCurrency, setShopCurrency] = useState("TND");
  const [stockThreshold, setStockThreshold] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopWhatsapp, setShopWhatsapp] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [receiptTerms, setReceiptTerms] = useState("");
  const [showReceiptNote, setShowReceiptNote] = useState(true);
  const [receiptMode, setReceiptMode] = useState("detailed");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [showPaymentOnTracking, setShowPaymentOnTracking] = useState(false);
  const [storeHours, setStoreHours] = useState("");

  // Loyalty
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(false);
  const [loyaltyEarnRate, setLoyaltyEarnRate] = useState("1");
  const [loyaltyRedeemPoints, setLoyaltyRedeemPoints] = useState("100");
  const [loyaltyRedeemValue, setLoyaltyRedeemValue] = useState("5");
  const [loyaltyMinRedeem, setLoyaltyMinRedeem] = useState("100");
  
  // Phone / WhatsApp state
  const [profilePhone, setProfilePhone] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [useSameWhatsapp, setUseSameWhatsapp] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error("Erreur lors du changement de mot de passe");
      } else {
        toast.success("Mot de passe modifié avec succès");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Sync local state with loaded settings
  useEffect(() => {
    if (!loading) {
      setShopName(settings.shop_name);
      setShopCountry(settings.country || "TN");
      setShopCurrency(settings.currency || "TND");
      setStockThreshold(String(settings.stock_alert_threshold));
      setBrandColor(settings.brand_color || "blue");
      setShopAddress(settings.address || "");
      setShopPhone(settings.phone || "");
      setShopWhatsapp(settings.whatsapp_phone || "");
      setShopEmail(settings.email || "");
      setReceiptTerms(settings.receipt_terms || "");
      setShowReceiptNote((settings as any).show_receipt_note ?? true);
      setReceiptMode(settings.receipt_mode || "detailed");
      setGoogleMapsUrl((settings as any).google_maps_url || "");
      setWarrantyDays(String((settings as any).warranty_days ?? 30));
      setShowPaymentOnTracking((settings as any).show_payment_on_tracking ?? false);
      setStoreHours((settings as any).store_hours || "");
      setLogoSize(((settings as any).logo_size as any) || "medium");
      setLoyaltyEnabled(!!(settings as any).loyalty_enabled);
      setLoyaltyEarnRate(String((settings as any).loyalty_earn_rate ?? 1));
      setLoyaltyRedeemPoints(String((settings as any).loyalty_redeem_points ?? 100));
      setLoyaltyRedeemValue(String((settings as any).loyalty_redeem_value ?? 5));
      setLoyaltyMinRedeem(String((settings as any).loyalty_min_redeem ?? 100));
    }
  }, [loading, settings]);

  // Load phone/whatsapp from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone, whatsapp_phone, email")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfilePhone(data.phone || "");
          setProfileWhatsapp((data as any).whatsapp_phone || "");
          setProfileEmail((data as any).email || "");
          const same = !data.phone || (data as any).whatsapp_phone === data.phone || !(data as any).whatsapp_phone;
          setUseSameWhatsapp(same);
        }
      });
  }, [user]);

  const handleSavePhone = async () => {
    if (!user) return;
    setSavingPhone(true);
    const whatsappPhone = useSameWhatsapp ? profilePhone.trim() : (profileWhatsapp.trim() || null);
    const { error } = await supabase
      .from("profiles")
      .update({
        phone: profilePhone.trim(),
        whatsapp_phone: whatsappPhone,
        email: profileEmail.trim() || null,
      } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Coordonnées mises à jour");
    }
    setSavingPhone(false);
  };

  const handleSaveGeneralSettings = async () => {
    await saveSettings({
      shop_name: shopName,
      country: shopCountry,
      currency: shopCurrency,
      tax_rate: 0,
      tax_enabled: false,
      stock_alert_threshold: parseInt(stockThreshold) || 5,
      address: shopAddress.trim() || null,
      phone: shopPhone.trim() || null,
      whatsapp_phone: shopWhatsapp.trim() || null,
      email: shopEmail.trim() || null,
      receipt_terms: receiptTerms.trim() || null,
      show_receipt_note: showReceiptNote,
      receipt_mode: receiptMode,
      google_maps_url: googleMapsUrl.trim() || null,
      warranty_days: parseInt(warrantyDays) || 30,
      show_payment_on_tracking: showPaymentOnTracking,
      store_hours: storeHours.trim() || null,
      loyalty_enabled: loyaltyEnabled,
      loyalty_earn_rate: parseFloat(loyaltyEarnRate) || 0,
      loyalty_redeem_points: parseInt(loyaltyRedeemPoints) || 100,
      loyalty_redeem_value: parseFloat(loyaltyRedeemValue) || 0,
      loyalty_min_redeem: parseInt(loyaltyMinRedeem) || 100,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 2 MB)");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("shop-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("shop-logos").getPublicUrl(path);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now();
      await saveSettings({ logo_url: logoUrl });
      toast.success("Logo mis à jour");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    await saveSettings({ logo_url: null });
    toast.success("Logo supprimé");
  };

  const handleLogoSizeChange = async (size: "small" | "medium" | "large" | "xlarge") => {
    setLogoSize(size);
    await saveSettings({ logo_size: size } as any);
  };

  const handleBrandColorChange = async (color: string) => {
    setBrandColor(color);
    applyColor(color);
    await saveSettings({ brand_color: color });
  };

  const formatLastSyncTime = (time: string | null) => {
    if (!time) return "Jamais";
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} heure${Math.floor(diffMins / 60) > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Paramètres" description="Configuration du système" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Paramètres" description="Configuration du système" />

      {/* ─── Segmented Control / Pill Navigation ─── */}
      <div className="relative">
        {/* Gradient fade hint on mobile (right side) */}
        {isMobile && (
          <div className="absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none bg-gradient-to-l from-background to-transparent" />
        )}
        <div
          className={cn(
            "flex gap-1 p-1 rounded-xl bg-muted/60 backdrop-blur-sm border border-border/40",
            "dark:bg-zinc-900/60 dark:border-zinc-800/60",
            isMobile && "overflow-x-auto scrollbar-hide flex-nowrap -mx-1 px-1"
          )}
        >
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 whitespace-nowrap shrink-0",
                  isActive
                    ? "bg-background text-foreground shadow-sm dark:bg-zinc-800 dark:text-zinc-100"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── TAB: Boutique (Général + Préférences + Suivi) ─── */}
      <AnimatedPanel active={activeTab === "boutique"}>
        {/* Shop Info */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Store} title="Détails de l'enseigne" description="Informations de base de votre atelier" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Nom du magasin</Label>
                  <Input id="shopName" value={shopName} onChange={(e) => setShopName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Select value={shopCountry} onValueChange={(val) => { setShopCountry(val); const curr = getCurrencyForCountry(val); if (curr) setShopCurrency(curr.code); }}>
                    <SelectTrigger id="country"><SelectValue /></SelectTrigger>
                    <SelectContent>{countries.map((c) => (<SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select value={shopCurrency} onValueChange={setShopCurrency}>
                    <SelectTrigger id="currency"><SelectValue /></SelectTrigger>
                    <SelectContent>{currencies.map((c) => (<SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</SelectItem>))}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Contact Info */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Phone} title="Coordonnées du magasin" description="Apparaîtront sur vos reçus et factures" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopAddress">Adresse</Label>
                <Input id="shopAddress" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} placeholder="Adresse du magasin" />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="shopPhoneNum">Téléphone</Label>
                  <Input id="shopPhoneNum" value={shopPhone} onChange={(e) => setShopPhone(e.target.value)} placeholder="+216 XX XXX XXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopWhatsappNum">WhatsApp</Label>
                  <Input id="shopWhatsappNum" value={shopWhatsapp} onChange={(e) => setShopWhatsapp(e.target.value)} placeholder="+216 XX XXX XXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopEmailAddr">Email</Label>
                  <Input id="shopEmailAddr" type="email" value={shopEmail} onChange={(e) => setShopEmail(e.target.value)} placeholder="contact@monmagasin.com" />
                </div>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Receipt Settings */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Receipt} title="Paramètres Reçus" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="receiptMode" className="flex items-center gap-2">Mode reçu par défaut</Label>
                <Select value={receiptMode} onValueChange={setReceiptMode}>
                  <SelectTrigger id="receiptMode"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Reçu détaillé (pièces + main d'œuvre)</SelectItem>
                    <SelectItem value="simple">Reçu simple (total seulement)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptTerms">Conditions / Garantie (reçu)</Label>
                <Textarea id="receiptTerms" value={receiptTerms} onChange={(e) => setReceiptTerms(e.target.value)} placeholder="Garantie de 90 jours sur toutes les pièces..." rows={3} />
                <p className="text-xs text-muted-foreground">Ce texte apparaîtra en bas de vos reçus.</p>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Afficher le message de remerciement</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Affiche “Merci de votre confiance !” en bas des reçus.</p>
                </div>
                <Switch checked={showReceiptNote} onCheckedChange={setShowReceiptNote} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Tracking Page */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Globe} title="Page de suivi public" description="Configuration de la page de suivi accessible par QR Code" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="googleMapsUrl">Lien Google Maps</Label>
                <Input id="googleMapsUrl" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="warrantyDays">Garantie réparation (jours)</Label>
                  <Input id="warrantyDays" type="number" min="0" value={warrantyDays} onChange={(e) => setWarrantyDays(e.target.value)} className="max-w-[120px]" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="storeHours">Horaires d'ouverture</Label>
                  <Input id="storeHours" value={storeHours} onChange={(e) => setStoreHours(e.target.value)} placeholder="Lun–Sam 9h–18h" />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Afficher le paiement sur la page de suivi</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Le client pourra voir le total et le reste dû</p>
                </div>
                <Switch checked={showPaymentOnTracking} onCheckedChange={setShowPaymentOnTracking} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Appearance: Logo + Brand Color + Language */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Palette} title="Apparence & Préférences" description="Logo, couleur et langue" />
            <div className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-4">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml" className="hidden" onChange={handleLogoUpload} />
                  <Button variant="outline" size="sm" onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}>
                    {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {t("settings.uploadLogo")}
                  </Button>
                  {settings.logo_url && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveLogo}>
                      <Trash2 className="h-4 w-4 mr-2" />{t("settings.removeLogo")}
                    </Button>
                  )}
                </div>
              </div>

              {/* Logo size on receipt — selector + live preview */}
              {settings.logo_url && (
                <div className="rounded-lg border border-border/50 p-4 bg-muted/20 space-y-3">
                  <div>
                    <p className="text-sm font-medium">Taille du logo sur le reçu</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Choisissez à quelle taille votre logo s'imprime en haut du reçu thermique.
                    </p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {([
                      { key: "small",  label: "S",  hint: "Petit" },
                      { key: "medium", label: "M",  hint: "Moyen" },
                      { key: "large",  label: "L",  hint: "Grand" },
                      { key: "xlarge", label: "XL", hint: "Très grand" },
                    ] as const).map((opt) => (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleLogoSizeChange(opt.key)}
                        className={cn(
                          "flex flex-col items-center justify-center rounded-md border-2 px-2 py-2 text-xs transition-all hover:border-primary/50",
                          logoSize === opt.key
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-background text-muted-foreground"
                        )}
                      >
                        <span className="font-bold text-sm">{opt.label}</span>
                        <span className="text-[10px] mt-0.5">{opt.hint}</span>
                      </button>
                    ))}
                  </div>

                  {/* Live preview — mock thermal receipt header */}
                  <div>
                    <p className="text-[11px] text-muted-foreground mb-2">Aperçu :</p>
                    <div
                      className="mx-auto rounded border border-dashed border-border bg-white text-black p-3 font-mono text-center"
                      style={{ width: "220px" }}
                    >
                      <img
                        src={settings.logo_url}
                        alt="Aperçu logo"
                        style={{
                          maxWidth:
                            logoSize === "small" ? "60px" :
                            logoSize === "medium" ? "100px" :
                            logoSize === "large" ? "140px" : "180px",
                          maxHeight:
                            logoSize === "small" ? "30px" :
                            logoSize === "medium" ? "45px" :
                            logoSize === "large" ? "70px" : "95px",
                          width: "auto",
                          height: "auto",
                          display: "block",
                          margin: "0 auto 4px",
                        }}
                      />
                      <p className="text-[12px] font-bold leading-tight">{shopName || settings.shop_name}</p>
                      <div className="border-t border-dashed border-black/40 my-1" />
                      <p className="text-[9px] leading-tight">REÇU DE VENTE</p>
                    </div>
                  </div>
                </div>
              )}

              <Separator />

              {/* Brand Color */}
              <div>
                <p className="text-sm font-medium mb-3">{t("settings.brandColor")}</p>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {BRAND_COLOR_PRESETS.map((preset) => (
                    <button key={preset.name} onClick={() => handleBrandColorChange(preset.hex)} className={cn("flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105", brandColor === preset.hex || brandColor === preset.name.toLowerCase() ? "border-foreground shadow-soft" : "border-transparent hover:border-muted-foreground/30")}>
                      <div className="w-10 h-10 rounded-full shadow-sm" style={{ backgroundColor: preset.hex }} />
                      <span className="text-[10px] text-muted-foreground text-center leading-tight">{preset.name}</span>
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-3">
                  <Label htmlFor="customHex" className="shrink-0">Code Hex</Label>
                  <Input id="customHex" placeholder="#1447b3" value={customHex} onChange={(e) => setCustomHex(e.target.value)} className="max-w-[140px] font-mono" />
                  <Button variant="outline" size="sm" disabled={!customHex.match(/^#[0-9a-fA-F]{6}$/)} onClick={() => { handleBrandColorChange(customHex); setCustomHex(""); }}>Appliquer</Button>
                  {customHex.match(/^#[0-9a-fA-F]{6}$/) && <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: customHex }} />}
                </div>
              </div>

              <Separator />

              {/* Language */}
              <div>
                <p className="text-sm font-medium mb-2">{t("settings.language")}</p>
                <Select value={language} onValueChange={(val) => setLanguage(val as "fr" | "en")}>
                  <SelectTrigger className="max-w-[200px]"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fr">🇫🇷 Français</SelectItem>
                    <SelectItem value="en">🇬🇧 English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Notifications */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Bell} title="Notifications" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Alertes stock faible</p>
                  <p className="text-xs text-muted-foreground">Notification quand le stock est bas</p>
                </div>
                <Switch checked={notifSettings.lowStockAlerts} onCheckedChange={(checked) => saveNotifSettings({ lowStockAlerts: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Rappels paiements</p>
                  <p className="text-xs text-muted-foreground">Notification pour les créances clients</p>
                </div>
                <Switch checked={notifSettings.paymentReminders} onCheckedChange={(checked) => saveNotifSettings({ paymentReminders: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium text-sm">Notifications navigateur</p>
                  <p className="text-xs text-muted-foreground">Alertes sur votre appareil</p>
                  <Badge variant={permissionStatus === "granted" ? "default" : permissionStatus === "denied" ? "destructive" : "secondary"} className={permissionStatus === "granted" ? "bg-success/10 text-success border-success/20" : ""}>
                    {permissionStatus === "granted" ? "Autorisé" : permissionStatus === "denied" ? "Bloqué" : permissionStatus === "unsupported" ? "Non supporté" : "Non demandé"}
                  </Badge>
                  {permissionStatus === "denied" && <p className="text-xs text-destructive">Modifiez l'autorisation dans les paramètres de votre navigateur</p>}
                </div>
                <Switch checked={notifSettings.browserNotifications} disabled={permissionStatus === "unsupported"} onCheckedChange={async (checked) => { if (checked) { const granted = await requestBrowserPermission(); if (granted) saveNotifSettings({ browserNotifications: true }); } else { saveNotifSettings({ browserNotifications: false }); } }} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Loyalty Program */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Tag} title="Programme de fidélité" description="Récompensez vos clients avec des points sur ventes et réparations" />
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border/50 p-3 bg-muted/30">
                <div>
                  <p className="font-medium text-sm">Activer la fidélité</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Les clients gagnent et peuvent dépenser des points</p>
                </div>
                <Switch checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
              </div>

              {loyaltyEnabled && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="loyaltyEarnRate">Taux de gain (points par {settings.currency || "TND"})</Label>
                    <Input id="loyaltyEarnRate" type="number" step="0.1" min="0" value={loyaltyEarnRate} onChange={(e) => setLoyaltyEarnRate(e.target.value)} className="max-w-[160px] font-mono-numbers" />
                    <p className="text-xs text-muted-foreground">Ex : 1 = 1 point par {settings.currency || "TND"} dépensé.</p>
                  </div>
                  <Separator />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="loyaltyRedeemPoints">Points par bloc d'échange</Label>
                      <Input id="loyaltyRedeemPoints" type="number" min="1" value={loyaltyRedeemPoints} onChange={(e) => setLoyaltyRedeemPoints(e.target.value)} className="font-mono-numbers" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loyaltyRedeemValue">Valeur du bloc ({settings.currency || "TND"})</Label>
                      <Input id="loyaltyRedeemValue" type="number" step="0.001" min="0" value={loyaltyRedeemValue} onChange={(e) => setLoyaltyRedeemValue(e.target.value)} className="font-mono-numbers" />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {loyaltyRedeemPoints} pts = {loyaltyRedeemValue} {settings.currency || "TND"} de réduction.
                  </p>
                  <div className="space-y-2">
                    <Label htmlFor="loyaltyMinRedeem">Solde minimum pour utiliser les points</Label>
                    <Input id="loyaltyMinRedeem" type="number" min="0" value={loyaltyMinRedeem} onChange={(e) => setLoyaltyMinRedeem(e.target.value)} className="max-w-[160px] font-mono-numbers" />
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassCard>

        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleSaveGeneralSettings} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          {saving ? "Enregistrement..." : "Enregistrer les paramètres boutique"}
        </Button>
      </AnimatedPanel>

      {/* ─── TAB: Inventaire (Catégories + Alertes Stock + Protection) ─── */}
      <AnimatedPanel active={activeTab === "inventaire"}>
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Tag} title="Catégories de produits" />
            <CategoriesSettings />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Tag} title="Catégories de dépenses" />
            <ExpenseCategoriesSettings />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={AlertTriangle} title="Alertes de stock" description="Seuil d'alerte pour le stock faible" />
            <div className="space-y-3">
              <div className="space-y-2 max-w-xs">
                <Label htmlFor="stockThresholdInv">Seuil alerte stock</Label>
                <Input id="stockThresholdInv" type="number" value={stockThreshold} onChange={(e) => setStockThreshold(e.target.value)} />
                <p className="text-xs text-muted-foreground">Vous serez alerté quand un produit passe en dessous de ce seuil.</p>
              </div>
              <Button className="bg-gradient-primary hover:opacity-90" onClick={handleSaveGeneralSettings} disabled={saving} size="sm">
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Enregistrer
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Lock} title="Protection de l'inventaire" description="Empêcher les modifications non autorisées" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Protéger l'inventaire</p>
                  <p className="text-xs text-muted-foreground">Code temporaire requis pour modifier les produits</p>
                </div>
                <Switch checked={inventoryLocked} onCheckedChange={toggleInventoryLock} />
              </div>
              {inventoryLocked && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Button variant="outline" onClick={generateCode} disabled={generating} className="gap-2">
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      Générer un code temporaire
                    </Button>
                    {generatedCode && (
                      <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-mono font-bold tracking-[0.3em]">{generatedCode.code}</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(generatedCode.code); toast.success("Code copié !"); }}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">Expire le {new Date(generatedCode.expires_at).toLocaleString("fr-FR")}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassCard>
      </AnimatedPanel>

      {/* ─── TAB: Accès (Utilisateurs + Sécurité) ─── */}
      <AnimatedPanel active={activeTab === "acces"}>
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Users} title="Gestion d'équipe" description="Ajoutez et gérez vos employés" />
            <TeamManagement />
          </div>
        </GlassCard>

        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Users} title="Tâches d'équipe" />
            <TaskManagement />
          </div>
        </GlassCard>

        {/* Password */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Key} title="Mon compte" description="Modifier votre mot de passe" />
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input id="newPassword" type="password" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input id="confirmPassword" type="password" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <Button onClick={handlePasswordChange} disabled={changingPassword || !newPassword || !confirmPassword}>
                {changingPassword ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Key className="h-4 w-4 mr-2" />}
                {changingPassword ? "Modification..." : "Modifier le mot de passe"}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Phone / WhatsApp */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Phone} title="Coordonnées personnelles" description="Numéro de téléphone, WhatsApp et email" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="profilePhone" type="tel" placeholder="+216 XX XXX XXX" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} className="pl-10" />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="same-whatsapp-settings" checked={useSameWhatsapp} onCheckedChange={(checked) => setUseSameWhatsapp(!!checked)} />
                <Label htmlFor="same-whatsapp-settings" className="text-sm cursor-pointer">Utiliser ce numéro pour WhatsApp</Label>
              </div>
              {!useSameWhatsapp && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="profileWhatsapp">Numéro WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="profileWhatsapp" type="tel" placeholder="+216 XX XXX XXX" value={profileWhatsapp} onChange={(e) => setProfileWhatsapp(e.target.value)} className="pl-10" />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input id="profileEmail" type="email" placeholder="exemple@email.com" value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} className="pl-10" />
                </div>
              </div>
              <Button onClick={handleSavePhone} disabled={savingPhone}>
                {savingPhone ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                {savingPhone ? "Enregistrement..." : "Enregistrer les coordonnées"}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Security */}
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={Shield} title="Sécurité" description="Chiffrement et journal d'activité" />
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Chiffrement des sauvegardes</p>
                  <p className="text-xs text-muted-foreground">Protéger avec un mot de passe</p>
                </div>
                <Switch checked={securitySettings.encryptBackups} onCheckedChange={(checked) => saveSecuritySettings({ encryptBackups: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Journal d'activité</p>
                  <p className="text-xs text-muted-foreground">Enregistrer toutes les actions</p>
                </div>
                <Switch checked={securitySettings.activityLog} onCheckedChange={(checked) => saveSecuritySettings({ activityLog: checked })} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Mode hors ligne</p>
                  <p className="text-xs text-muted-foreground">Fonctionnement sans internet</p>
                </div>
                <Switch checked={securitySettings.offlineMode} onCheckedChange={(checked) => saveSecuritySettings({ offlineMode: checked })} />
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Danger zone */}
        <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-warning">Zone dangereuse</p>
              <p className="text-sm text-muted-foreground mt-1">Action irréversible — supprimera toutes vos données.</p>
              <div className="flex gap-2 mt-3">
                <ResetDataDialog onConfirm={resetAllData} isResetting={resetting} />
              </div>
            </div>
          </div>
        </div>
      </AnimatedPanel>

      {/* ─── TAB: Abonnement ─── */}
      <AnimatedPanel active={activeTab === "abonnement"}>
        <GlassCard>
          <div className="p-5 sm:p-6">
            <SectionHeading icon={CreditCard} title="Abonnement & Facturation" description="Gérez votre plan et consultez vos paiements" />
            <BillingDashboard />
          </div>
        </GlassCard>
      </AnimatedPanel>

      {/* ─── TAB: Système (Sauvegarde) ─── */}
      <AnimatedPanel active={activeTab === "systeme"}>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Local Backup */}
          <GlassCard>
            <div className="p-5 sm:p-6">
              <SectionHeading icon={HardDrive} title="Sauvegarde locale" description="Exportez vos données sur votre appareil" />
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Sauvegarde automatique</p>
                    <p className="text-xs text-muted-foreground">Sauvegarde quotidienne</p>
                  </div>
                  <Switch checked={backupSettings.autoBackup} onCheckedChange={(checked) => saveBackupSettings({ autoBackup: checked })} />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" onClick={exportJSON}><Download className="h-4 w-4 mr-2" />Télécharger (JSON)</Button>
                  <Button variant="outline" className="w-full" onClick={exportSQL}><Download className="h-4 w-4 mr-2" />Télécharger (SQL)</Button>
                  <Button variant="outline" className="w-full" onClick={exportExcel}><Download className="h-4 w-4 mr-2" />Télécharger (Excel)</Button>
                  <Button variant="outline" className="w-full" onClick={restoreFromFile}><Upload className="h-4 w-4 mr-2" />Restaurer depuis fichier</Button>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Cloud Backup */}
          <GlassCard className="border-primary/30">
            <div className="p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <SectionHeading icon={Cloud} title="Sauvegarde Cloud" description="Synchronisation automatique sécurisée" />
                <Badge className={backupSettings.cloudSync ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                  {backupSettings.cloudSync ? "Activé" : "Désactivé"}
                </Badge>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-sm">Synchronisation auto</p>
                    <p className="text-xs text-muted-foreground">Sync toutes les 5 minutes</p>
                  </div>
                  <Switch checked={backupSettings.cloudSync} onCheckedChange={(checked) => saveBackupSettings({ cloudSync: checked })} />
                </div>
                <Separator />
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Dernière sync:</span>
                    <span className="font-medium">{formatLastSyncTime(backupSettings.lastSyncTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Statut:</span>
                    <span className={`font-medium flex items-center gap-1 ${backupSettings.cloudSync ? "text-success" : "text-muted-foreground"}`}>
                      {backupSettings.cloudSync && <span className="w-2 h-2 rounded-full bg-success animate-pulse" />}
                      {backupSettings.cloudSync ? "Auto-sync activé" : "Manuel uniquement"}
                    </span>
                  </div>
                </div>
                <Button className="w-full bg-gradient-primary hover:opacity-90" onClick={syncNow} disabled={syncing}>
                  {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                  {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
                </Button>
              </div>
            </div>
          </GlassCard>
        </div>
      </AnimatedPanel>
    </div>
  );
}


