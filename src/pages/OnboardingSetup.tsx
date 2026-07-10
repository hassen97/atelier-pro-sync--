import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Store, Phone, Mail, MapPin, Upload, ArrowRight, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STEPS = [
  { id: 1, label: "Identité", icon: Store },
  { id: 2, label: "Contact", icon: Phone },
  { id: 3, label: "Finalisation", icon: CheckCircle },
];

export default function OnboardingSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form state
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappPhone, setWhatsappPhone] = useState("");
  const [email, setEmail] = useState("");
  const [storeHours, setStoreHours] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // Pre-fill from existing shop_settings (from verification form)
  useEffect(() => {
    if (!user) return;
    supabase
      .from("shop_settings")
      .select("shop_name, address, phone, whatsapp_phone, email, google_maps_url, store_hours, logo_url")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          if (data.shop_name && data.shop_name !== "Mon Atelier") setShopName(data.shop_name);
          if (data.address) setAddress(data.address);
          if ((data as any).phone) setPhone((data as any).phone);
          if ((data as any).whatsapp_phone) setWhatsappPhone((data as any).whatsapp_phone);
          if ((data as any).email) setEmail((data as any).email);
          if ((data as any).google_maps_url) setGoogleMapsUrl((data as any).google_maps_url);
          if ((data as any).store_hours) setStoreHours((data as any).store_hours);
          if (data.logo_url) setLogoPreview(data.logo_url);
        }
      });
  }, [user]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("Le logo ne doit pas dépasser 2 Mo");
        return;
      }
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!shopName.trim()) {
      toast.error("Le nom de la boutique est obligatoire");
      return;
    }

    setSaving(true);
    try {
      // Guarantee the auth token is attached so RLS `auth.uid()` is populated.
      const uid = await ensureSession();

      // Save shop settings FIRST (the critical step). Upsert on user_id so it
      // works whether or not the trigger-created row exists, and always
      // satisfies the owner RLS check.
      await withSessionRetry(async () => {
        const { error } = await supabase
          .from("shop_settings")
          .upsert(
            {
              user_id: uid,
              shop_name: shopName.trim(),
              address: address.trim() || null,
              phone: phone.trim() || null,
              whatsapp_phone: whatsappPhone.trim() || null,
              email: email.trim() || null,
              google_maps_url: googleMapsUrl.trim() || null,
              store_hours: storeHours.trim() || null,
              onboarding_completed: true,
              updated_at: new Date().toISOString(),
            } as any,
            { onConflict: "user_id" }
          );
        if (error) throw error;
      });

      // Upload logo AFTER the shop is saved, and make it non-blocking so a
      // storage hiccup can never strand the user at the final step.
      if (logoFile) {
        try {
          const ext = logoFile.name.split(".").pop();
          const path = `${uid}/logo.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("shop-logos")
            .upload(path, logoFile, { upsert: true });
          if (uploadError) throw uploadError;
          const { data: urlData } = supabase.storage.from("shop-logos").getPublicUrl(path);
          await supabase
            .from("shop_settings")
            .update({ logo_url: urlData.publicUrl } as any)
            .eq("user_id", uid);
        } catch (logoErr) {
          console.error("[Onboarding] logo upload failed (non-blocking):", logoErr);
          toast.message("Boutique enregistrée. Le logo n'a pas pu être ajouté, vous pourrez le faire depuis les réglages.");
        }
      }

      toast.success("Configuration terminée ! Bienvenue sur RepairPro 🎉");
      // Navigate to plan selection
      navigate("/checkout?onboarding=true", { replace: true });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Store className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Configurez votre boutique
          </h1>
          <p className="text-muted-foreground mt-2">
            Dernière étape avant d'accéder à votre tableau de bord
          </p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  step >= s.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <s.icon className="h-3.5 w-3.5" />
                {s.label}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 ${step > s.id ? "bg-primary" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form Card */}
        <div className="bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nom de la boutique *</Label>
                <Input
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="Ex: TechFix Pro"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Logo de la boutique</Label>
                <div className="flex items-center gap-4">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Aperçu du logo de la boutique"
                      className="w-16 h-16 rounded-xl object-cover border border-border"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-muted flex items-center justify-center border border-dashed border-border">
                      <Upload className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div>
                    <label className="cursor-pointer">
                      <span className="text-sm text-primary hover:underline">
                        {logoPreview ? "Changer le logo" : "Ajouter un logo"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoChange}
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-0.5">PNG, JPG, max 2 Mo</p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="123 Rue de la République, Tunis"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Lien Google Maps</Label>
                <Input
                  value={googleMapsUrl}
                  onChange={(e) => setGoogleMapsUrl(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="h-11"
                />
              </div>

              <Button onClick={() => setStep(2)} className="w-full mt-4" size="lg">
                Continuer
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  type="tel"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input
                  value={whatsappPhone}
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  placeholder="+216 XX XXX XXX"
                  type="tel"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@maboutique.com"
                  type="email"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Horaires d'ouverture</Label>
                <Textarea
                  value={storeHours}
                  onChange={(e) => setStoreHours(e.target.value)}
                  placeholder="Lun-Sam: 9h-19h"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Continuer
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 text-primary mx-auto mb-3" />
                <h3 className="text-lg font-semibold">Récapitulatif</h3>
                <p className="text-sm text-muted-foreground">Vérifiez vos informations avant de continuer</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{shopName || "Non renseigné"}</span>
                </div>
                {address && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{address}</span>
                  </div>
                )}
                {phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{phone}</span>
                  </div>
                )}
                {email && (
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{email}</span>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  Retour
                </Button>
                <Button onClick={handleSubmit} disabled={saving} className="flex-1">
                  {saving ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Sauvegarde...</>
                  ) : (
                    <>Terminer la configuration</>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Vous pourrez modifier ces informations à tout moment dans les Paramètres.
        </p>
      </div>
    </div>
  );
}
