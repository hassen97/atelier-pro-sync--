import { supabase } from "@/integrations/supabase/client";
import { generateThermalReceipt, generatePhoneLabel } from "@/lib/receiptPdf";
import { getShopInitials, formatTicketNumberPadded } from "@/lib/utils";
import type { ShopSettings } from "@/hooks/useShopSettings";

export type PrinterWidth = "80mm" | "58mm";

// Everything the thermal receipt + phone label need, regardless of where the
// repair object comes from (card list, freshly inserted DB row, ...).
export interface PrintableRepair {
  id: string;
  ticket_number?: number | null;
  tracking_token?: string | null;
  customer: string;
  phone?: string;
  device: string;
  imei?: string;
  issue: string;
  parts: { name: string; cost: number }[];
  labor: number;
  total: number;
  paid: number;
  depositDate: string;
  received_by?: string;
  repaired_by?: string;
  device_condition?: string;
  category?: string | null;
  device_unlock_code?: string;
}

export interface RepairPrintOptions {
  settings: ShopSettings;
  formatCurrency: (n: number) => string;
  isEmployee?: boolean;
  // "detailed" | "simple" — falls back to the shop's configured receipt mode
  receiptMode?: string;
  printerWidth?: PrinterWidth;
  // resolved once and reused when printing both documents together
  publicDomain?: string;
}

async function resolvePublicDomain(): Promise<string> {
  try {
    const { data } = await supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "public_site_domain")
      .maybeSingle();
    return data?.value || "";
  } catch {
    return "";
  }
}

export async function printRepairReceipt(repair: PrintableRepair, opts: RepairPrintOptions) {
  const { settings, formatCurrency, isEmployee, printerWidth = "80mm" } = opts;
  const receiptMode = opts.receiptMode || settings.receipt_mode || "detailed";

  const remaining = repair.total - repair.paid;
  let items: { name: string; qty: number; unitPrice: number; total: number }[] = [];

  // Employees see only total (simple mode) — parts/labor costs are confidential
  const effectiveMode = isEmployee ? "simple" : receiptMode;

  if (effectiveMode === "detailed") {
    items = repair.parts.map((p) => ({ name: p.name, qty: 1, unitPrice: p.cost, total: p.cost }));
    items.push({ name: "Main d'œuvre", qty: 1, unitPrice: repair.labor, total: repair.labor });
  }

  const token = repair.tracking_token || repair.id;
  const domain = opts.publicDomain ?? (await resolvePublicDomain());
  const trackingUrl = `${domain || window.location.origin}/r/${token}`;

  const initials = getShopInitials(settings.shop_name);
  const ticketLabel = formatTicketNumberPadded(initials, repair.ticket_number ?? null);

  await generateThermalReceipt(
    {
      type: "repair",
      id: repair.id,
      ticketNumber: repair.ticket_number ?? null,
      ticketLabel: ticketLabel || null,
      date: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
      time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
      customer: { name: repair.customer, phone: repair.phone },
      device: repair.device,
      imei: repair.imei,
      problem: receiptMode === "simple" ? repair.issue : undefined,
      items,
      subtotal: repair.total,
      taxEnabled: settings.tax_enabled,
      total: repair.total,
      paid: repair.paid,
      remaining,
      trackingUrl,
      receivedBy: repair.received_by || undefined,
      repairedBy: repair.repaired_by || undefined,
      deviceCondition: repair.device_condition || undefined,
      category: repair.category || null,
    },
    settings,
    formatCurrency,
    printerWidth
  );
}

export async function printRepairLabel(repair: PrintableRepair, opts: RepairPrintOptions) {
  const { settings, printerWidth = "80mm" } = opts;

  const initials = getShopInitials(settings.shop_name);
  const ticketLabel = formatTicketNumberPadded(initials, repair.ticket_number ?? null);

  await generatePhoneLabel(
    {
      ticketNumber: repair.ticket_number ?? null,
      ticketLabel: ticketLabel || null,
      customer: repair.customer,
      phone: repair.phone,
      device: repair.device,
      category: repair.category || null,
      problem: repair.issue,
      depositDate: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
      receivedBy: repair.received_by || undefined,
      repairedBy: repair.repaired_by || undefined,
      unlockCode: repair.device_unlock_code || undefined,
    },
    settings.shop_name,
    printerWidth
  );
}

// Rush-hour shortcut: fire BOTH print jobs (customer receipt + phone label)
// from a single click. Each opens its own popup window and auto-prints once
// its images (QR/logo) are decoded.
export async function printRepairReceiptAndLabel(repair: PrintableRepair, opts: RepairPrintOptions) {
  // Label first: it has no images and no awaits before window.open, so its
  // popup opens synchronously inside the original user gesture (popup-blocker
  // safe). The receipt popup follows as soon as its QR code is generated
  // (still within the browser's user-activation window).
  const labelJob = printRepairLabel(repair, opts);
  const publicDomain = opts.publicDomain ?? (await resolvePublicDomain());
  const receiptJob = printRepairReceipt(repair, { ...opts, publicDomain });
  await Promise.all([labelJob, receiptJob]);
}
