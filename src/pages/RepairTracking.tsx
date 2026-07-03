import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Package,
  Star,
  MapPin,
  QrCode,
  Stethoscope,
  TestTube2,
  MessageSquare,
  CalendarClock,
  ShieldCheck,
  CreditCard,
  History,
  Camera,
  Bell,
} from "lucide-react";
import { SEO } from "@/components/seo/SEO";

interface StatusHistoryEntry {
  id: string;
  status: string;
  note: string | null;
  created_at: string;
}

interface RepairTrackingData {
  id: string;
  tracking_token: string;
  device_model: string;
  problem_description: string;
  status: string;
  deposit_date: string;
  delivery_date: string | null;
  estimated_ready_date: string | null;
  technician_note: string | null;
  intake_photo_url: string | null;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  amount_paid: number;
  customer_name: string;
  shop_name: string;
  shop_phone: string | null;
  shop_whatsapp: string | null;
  brand_color: string;
  google_maps_url: string | null;
  warranty_days: number;
  show_payment_on_tracking: boolean;
  store_hours: string | null;
  status_history: StatusHistoryEntry[];
}

// 6-stage timeline
const TIMELINE_STAGES = [
  { key: "deposited", label: "Déposé", icon: Package },
  { key: "diagnosis", label: "Diagnostic", icon: Stethoscope },
  { key: "in_repair", label: "En réparation", icon: Wrench },
  { key: "testing", label: "Test final", icon: TestTube2 },
  { key: "ready", label: "Prêt", icon: CheckCircle2 },
  { key: "delivered", label: "Livré", icon: Star },
];

// Map DB status to stage index (0-based)
const STATUS_TO_STAGE: Record<string, number> = {
  pending: 0,
  in_progress: 2,
  completed: 4,
  delivered: 5,
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Déposé — En attente",
  in_progress: "En cours de réparation",
  completed: "Prêt à récupérer",
  delivered: "Livré",
};

const STATUS_MESSAGES: Record<string, string> = {
  pending: "Votre appareil a bien été reçu. Notre technicien va prendre en charge votre réparation dès que possible.",
  in_progress: "Votre appareil est actuellement entre les mains de notre technicien. Merci pour votre patience.",
  completed: "Bonne nouvelle ! Votre appareil est réparé et prêt à être récupéré. Passez nous rendre visite.",
  delivered: "Votre appareil vous a été remis. Merci de votre confiance !",
};

const HISTORY_STATUS_LABELS: Record<string, string> = {
  pending: "Appareil déposé",
  in_progress: "Réparation démarrée",
  completed: "Prêt à récupérer",
  delivered: "Appareil livré",
};

const COLOR_MAP: Record<string, string> = {
  "neon blue": "#1447b3",
  "emerald green": "#1f9d55",
  "crimson red": "#e02424",
  "amethyst purple": "#7c3aed",
  "sunset orange": "#f97316",
  teal: "#1d8c9e",
  blue: "#1447b3",
};

function getBrandHex(brandColor: string): string {
  return COLOR_MAP[brandColor?.toLowerCase()] ?? (brandColor?.startsWith("#") ? brandColor : "#1447b3");
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDate(dateStr: string, includeTime = false): string {
  const d = new Date(dateStr);
  if (includeTime) {
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" }) +
      " à " + d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "short" });
}

export default function RepairTracking() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<RepairTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    supabase
      .rpc("get_repair_by_token", { p_token: token })
      .then(({ data: result, error }) => {
        if (error || !result) {
          setNotFound(true);
        } else {
          setData(result as unknown as RepairTrackingData);
        }
        setLoading(false);
      });
  }, [token]);

  // Generate QR code for pickup using JSBarcode-style approach with SVG
  useEffect(() => {
    if (!data || !qrRef.current) return;
    // Use a simple QR via a free API - no library needed
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-5">
            <Package className="w-10 h-10 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">Réparation introuvable</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Veuillez vérifier votre QR code ou contacter l'atelier.</p>
        </div>
      </div>
    );
  }

  const brandHex = getBrandHex(data.brand_color);
  const stageIndex = STATUS_TO_STAGE[data.status] ?? 0;
  const progressPercent = Math.round(((stageIndex + 1) / TIMELINE_STAGES.length) * 100);
  const isReady = data.status === "completed";
  const isDelivered = data.status === "delivered";
  const isDone = isReady || isDelivered;
  const remaining = Math.max(0, Number(data.total_cost) - Number(data.amount_paid));
  const isPaid = Number(data.total_cost) > 0 && remaining <= 0;

  // Status history deduped display
  const history = (data.status_history || []);

  return (
    <main
      className="min-h-screen"
      style={{ backgroundColor: "#f8fafc" }}
    >
      <SEO
        title={`Suivi réparation ${data.device_model || ""} — RepairPro`}
        description={`Suivez l'état de votre réparation ${data.device_model || ""} en temps réel.`}
        path={`/track/${data.tracking_token}`}
      />
      {/* ——————————————————— HEADER ——————————————————— */}
      <div
        className="relative text-white px-4 pt-12 pb-14 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${brandHex} 0%, ${brandHex}cc 100%)` }}
      >
        {/* Decorative circles */}
        <div
          className="absolute -top-8 -right-8 w-40 h-40 rounded-full opacity-20"
          style={{ background: "white" }}
        />
        <div
          className="absolute top-4 right-12 w-16 h-16 rounded-full opacity-10"
          style={{ background: "white" }}
        />
        <div className="max-w-md mx-auto relative z-10">
          <p className="text-white/60 text-xs uppercase tracking-widest mb-1 font-medium">
            Suivi de réparation
          </p>
          <h1 className="text-2xl font-bold tracking-tight">Suivi de votre réparation chez {data.shop_name}</h1>
          <p className="text-white/85 text-base mt-1 font-medium">
            Bonjour {data.customer_name} 👋
          </p>
          <p className="text-white/50 text-xs mt-2 font-mono">
            Réf: #{data.id.slice(0, 8).toUpperCase()}
          </p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-6 pb-12 space-y-4">

        {/* ——————————————————— READY BANNER ——————————————————— */}
        {isReady && (
          <div
            className="rounded-2xl p-4 flex items-start gap-3 shadow-lg animate-fade-in"
            style={{ background: "linear-gradient(135deg, #16a34a, #15803d)" }}
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-base">Votre appareil est prêt !</p>
              <p className="text-white/80 text-sm mt-0.5">
                Vous pouvez passer au magasin pour le récupérer.
              </p>
              {data.store_hours && (
                <p className="text-white/70 text-xs mt-1">🕐 {data.store_hours}</p>
              )}
            </div>
          </div>
        )}

        {/* ——————————————————— PROGRESS + TIMELINE ——————————————————— */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          {/* Header row */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: hexToRgba(brandHex, 0.12) }}
              >
                {(() => {
                  const Stage = TIMELINE_STAGES[stageIndex];
                  const Icon = Stage?.icon ?? Wrench;
                  return <Icon className="w-5 h-5" style={{ color: brandHex }} />;
                })()}
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Statut</p>
                <p className="font-bold text-gray-900 text-base leading-tight">
                  {STATUS_LABELS[data.status] ?? data.status}
                </p>
              </div>
            </div>
            <div
              className="text-xl font-black tabular-nums"
              style={{ color: brandHex }}
            >
              {progressPercent}%
            </div>
          </div>

          {/* Status message */}
          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl px-3 py-2.5 leading-relaxed mb-5">
            {STATUS_MESSAGES[data.status] ?? "Suivi en cours..."}
          </p>

          {/* 6-stage timeline */}
          <div className="relative">
            {/* Connecting line */}
            <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-100" />
            <div
              className="absolute top-5 left-5 h-0.5 transition-all duration-700"
              style={{
                background: brandHex,
                width: stageIndex === 0
                  ? "0%"
                  : `calc(${(stageIndex / (TIMELINE_STAGES.length - 1)) * 100}% )`,
              }}
            />

            <div className="relative flex justify-between">
              {TIMELINE_STAGES.map((stage, i) => {
                const StageIcon = stage.icon;
                const isDone = i <= stageIndex;
                const isCurrent = i === stageIndex;
                return (
                  <div key={stage.key} className="flex flex-col items-center gap-1.5" style={{ width: "16%" }}>
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 relative z-10"
                      style={{
                        background: isDone ? brandHex : "#f1f5f9",
                        boxShadow: isCurrent ? `0 0 0 3px ${hexToRgba(brandHex, 0.25)}` : undefined,
                      }}
                    >
                      <StageIcon
                        className="w-4 h-4"
                        style={{ color: isDone ? "white" : "#94a3b8" }}
                      />
                    </div>
                    <span
                      className="text-[9px] text-center leading-tight font-medium"
                      style={{ color: isDone ? brandHex : "#94a3b8" }}
                    >
                      {stage.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${progressPercent}%`, background: `linear-gradient(90deg, ${brandHex}, ${brandHex}99)` }}
            />
          </div>
          <p className="text-xs text-gray-400 text-center mt-1">
            Réparation complétée à {progressPercent} %
          </p>
        </div>

        {/* ——————————————————— ESTIMATED READY DATE ——————————————————— */}
        {data.estimated_ready_date && !isDelivered && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3 shadow-sm border"
            style={{
              background: hexToRgba(brandHex, 0.06),
              borderColor: hexToRgba(brandHex, 0.2),
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: hexToRgba(brandHex, 0.15) }}
            >
              <CalendarClock className="w-5 h-5" style={{ color: brandHex }} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: brandHex }}>
                Temps estimé
              </p>
              <p className="text-gray-800 font-bold text-sm mt-0.5">
                {formatDate(data.estimated_ready_date)}
              </p>
            </div>
          </div>
        )}

        {/* ——————————————————— TECHNICIAN NOTE ——————————————————— */}
        {data.technician_note && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 text-amber-500" />
              </div>
              <p className="text-xs font-bold uppercase tracking-wide text-amber-600">Note du technicien</p>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed bg-amber-50/50 rounded-xl px-3 py-2.5 italic">
              "{data.technician_note}"
            </p>
          </div>
        )}

        {/* ——————————————————— STATUS HISTORY ——————————————————— */}
        {history.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: hexToRgba(brandHex, 0.1) }}
              >
                <History className="w-4 h-4" style={{ color: brandHex }} />
              </div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Historique
              </h2>
            </div>
            <div className="space-y-0">
              {history.map((entry, i) => (
                <div key={entry.id} className="flex gap-3">
                  {/* Timeline dot */}
                  <div className="flex flex-col items-center">
                    <div
                      className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                      style={{ background: i === history.length - 1 ? brandHex : "#cbd5e1" }}
                    />
                    {i < history.length - 1 && (
                      <div className="w-0.5 flex-1 bg-gray-100 my-1" />
                    )}
                  </div>
                  <div className="pb-3 flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {HISTORY_STATUS_LABELS[entry.status] ?? entry.status}
                      </p>
                      <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                        {formatShortDate(entry.created_at)}
                      </span>
                    </div>
                    {entry.note && (
                      <p className="text-xs text-gray-500 mt-0.5 italic">{entry.note}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ——————————————————— REPAIR DETAILS ——————————————————— */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Détails de la réparation
          </h2>
          <div className="space-y-3">
            <DetailRow label="Appareil" value={data.device_model} />
            <DetailRow label="Problème déclaré" value={data.problem_description} />
            <DetailRow label="Date de dépôt" value={formatDate(data.deposit_date)} />
            {data.delivery_date && (
              <DetailRow label="Date de livraison" value={formatDate(data.delivery_date)} highlight />
            )}
            <DetailRow label="N° réparation" value={`#${data.id.slice(0, 8).toUpperCase()}`} mono />
          </div>
        </div>

        {/* ——————————————————— PAYMENT ——————————————————— */}
        {data.show_payment_on_tracking && Number(data.total_cost) > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: hexToRgba(brandHex, 0.1) }}
              >
                <CreditCard className="w-4 h-4" style={{ color: brandHex }} />
              </div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Paiement</h2>
              {isPaid && (
                <span className="ml-auto text-xs font-semibold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                  ✓ Réglé
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total réparation</span>
                <span className="font-bold text-gray-800">{Number(data.total_cost).toFixed(3)} DT</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Payé</span>
                <span className="font-semibold text-green-600">{Number(data.amount_paid).toFixed(3)} DT</span>
              </div>
              {remaining > 0 && (
                <>
                  <div className="h-px bg-gray-100" />
                  <div className="flex justify-between text-sm">
                    <span className="font-semibold text-orange-600">Reste à payer</span>
                    <span className="font-bold text-orange-600">{remaining.toFixed(3)} DT</span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* ——————————————————— INTAKE PHOTO ——————————————————— */}
        {data.intake_photo_url && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Camera className="w-4 h-4 text-blue-500" />
              </div>
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Photo à la réception
              </h2>
            </div>
            <img
              src={data.intake_photo_url}
              alt="Photo de l'appareil à la réception"
              className="w-full rounded-xl object-cover max-h-64"
            />
          </div>
        )}

        {/* ——————————————————— WARRANTY ——————————————————— */}
        {isDone && data.warranty_days > 0 && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3 shadow-sm border"
            style={{
              background: "linear-gradient(135deg, #f0fdf4, #dcfce7)",
              borderColor: "#bbf7d0",
            }}
          >
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-green-700">
                Garantie réparation
              </p>
              <p className="text-gray-700 font-semibold text-sm mt-0.5">
                {data.warranty_days} jours à partir de la livraison
              </p>
            </div>
          </div>
        )}

        {/* ——————————————————— CONTACT ——————————————————— */}
        {(data.shop_phone || data.shop_whatsapp || data.google_maps_url) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
              Contacter l'atelier
            </h2>
            <div className="flex flex-col gap-2.5">
              {data.shop_whatsapp && (
                <a
                  href={`https://wa.me/${data.shop_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-semibold active:scale-95 transition-transform"
                  style={{ background: "linear-gradient(135deg, #25d366, #128c7e)" }}
                >
                  <MessageCircle className="w-5 h-5 shrink-0" />
                  WhatsApp : {data.shop_whatsapp}
                </a>
              )}
              {data.shop_phone && (
                <a
                  href={`tel:${data.shop_phone}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border border-gray-200 text-gray-700 active:scale-95 transition-transform"
                >
                  <Phone className="w-5 h-5 shrink-0 text-gray-400" />
                  Appeler : {data.shop_phone}
                </a>
              )}
              {data.google_maps_url && (
                <a
                  href={data.google_maps_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold border border-blue-200 text-blue-700 bg-blue-50 active:scale-95 transition-transform"
                >
                  <MapPin className="w-5 h-5 shrink-0 text-blue-500" />
                  Voir le magasin sur Google Maps
                </a>
              )}
            </div>
          </div>
        )}

        {/* ——————————————————— PICKUP QR CODE ——————————————————— */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center">
          <div className="flex items-center gap-2 mb-3 justify-center">
            <QrCode className="w-4 h-4 text-gray-400" />
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">
              QR Code de retrait
            </h2>
          </div>
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(data.id)}&bgcolor=ffffff&color=000000&margin=4`}
            alt="QR Code de retrait"
            className="w-40 h-40 mx-auto rounded-xl"
          />
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            Scanner ce QR code au magasin pour récupérer l'appareil.
          </p>
          <p className="text-xs font-mono text-gray-500 mt-1 font-bold">
            #{data.id.slice(0, 8).toUpperCase()}
          </p>
        </div>

        <p className="text-center text-xs text-gray-400 pb-2">
          Propulsé par <span className="font-bold">AtelierProSync</span>
        </p>
      </div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  highlight,
  mono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between items-start gap-3">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span
        className={`text-sm text-right font-semibold ${highlight ? "text-green-600" : "text-gray-800"} ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
