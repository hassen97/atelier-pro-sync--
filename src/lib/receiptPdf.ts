import type { ShopSettings } from "@/hooks/useShopSettings";

interface ReceiptItem {
  name: string;
  qty: number;
  unitPrice: number;
  total: number;
}

interface ReceiptData {
  type: "repair" | "sale";
  id: string;
  ticketNumber?: number | null;
  ticketLabel?: string | null; // e.g. "CS-00451" — preferred display value
  date: string;
  time?: string;
  customer?: { name: string; phone?: string };
  device?: string;
  imei?: string;
  problem?: string;
  category?: string | null;
  items: ReceiptItem[];
  subtotal: number;
  taxRate?: number;
  taxEnabled?: boolean;
  taxAmount?: number;
  total: number;
  paid: number;
  remaining: number;
  paymentMethod?: string;
  trackingUrl?: string;
  discountItems?: { name: string; discount: string }[];
  receivedBy?: string;
  repairedBy?: string;
  deviceCondition?: string;
  // Loyalty footer
  loyaltyPointsEarned?: number;
  loyaltyPointsUsed?: number;
  loyaltyDiscount?: number;
  loyaltyBalanceAfter?: number | null;
}

function escHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export const thermalEscape = escHtml;

export function getThermalPrintCss(pageW = "72mm", fontSize = "12px") {
  return `
    @page { size: ${pageW} auto; margin: 0; }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-weight: bold !important;
      color: #000000 !important;
      background: #FFFFFF !important;
      box-shadow: none !important;
      text-shadow: none !important;
      filter: none !important;
      opacity: 1 !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    html, body {
      margin: 0;
      padding: 5mm;
      color: #000000 !important;
      background: #FFFFFF !important;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
      font-size: ${fontSize};
      line-height: 1.35;
      letter-spacing: 0;
      text-rendering: optimizeSpeed;
      -webkit-font-smoothing: none;
      -moz-osx-font-smoothing: unset;
    }
    .thermal-print-root { width: 100%; }
    .thermal-print-container {
      width: ${pageW};
      max-width: ${pageW};
      margin: 0 auto;
      padding-bottom: 5mm;
      font-family: "Courier New", Courier, "Liberation Mono", monospace;
    }
    img, svg, canvas, .thermal-qr {
      image-rendering: pixelated;
      image-rendering: crisp-edges;
    }
    .thermal-qr {
      display: block;
      margin: 2mm auto;
      height: auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .shop-name { font-size: 16px; font-weight: bold; text-align: center; margin-bottom: 1px; }
    .shop-info { font-size: 10px; text-align: center; }
    .title { font-size: 14px; font-weight: bold; text-align: center; margin: 3px 0 1px; }
    .ticket-num { font-size: 12px; font-weight: bold; text-align: center; margin-bottom: 2px; }
    .ticket-label-small { font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 4px 0 0; }
    .ticket-big { font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 0 0 4px; line-height: 1.35; }
    .sep { border-top: 1px dashed #000000; margin: 3px 0; }
    .sep-bold { border-top: 2px solid #000000; margin: 3px 0; }
    .field { font-size: 12px; margin: 1px 0; }
    .label { font-weight: bold; font-size: 12px; margin: 2px 0 1px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin: 2px 0; font-family: inherit; }
    th, td { padding: 1px 0; vertical-align: top; text-align: left; }
    th { font-weight: bold; border-bottom: 1px solid #000000; }
    th.center, td.center { text-align: center; }
    th.right, td.right { text-align: right; }
    .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 1px 0; gap: 3mm; }
    .total-row.grand { font-size: 14px; font-weight: bold; }
    .total-row .val { text-align: right; }
    .terms { font-size: 9px; text-align: center; margin: 1px 0; }
    .qr-section { text-align: center; margin: 3px 0; }
    .qr-label { font-size: 10px; font-weight: bold; }
    .barcode-section, .barcode { text-align: center; margin: 3px 0; }
    .barcode-section img, .barcode img { display: block; margin: 0 auto; }
    .footer { font-size: 10px; text-align: center; font-weight: bold; margin-top: 4px; }
    @media print { body { width: auto; } }
  `;
}

export function printThermalHtml(html: string, windowSize = "width=400,height=600") {
  const printWindow = window.open("", "_blank", windowSize);
  if (!printWindow) return;
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();

  // Wait for all images (QR, barcode, logo) to fully load before triggering
  // the print dialog. Without this, slow networks or remote images caused
  // the print to fire before the image was decoded → blank QR/logo.
  const triggerPrint = () => {
    try {
      printWindow.focus();
      printWindow.print();
    } catch {
      /* noop */
    }
  };

  const waitForImages = () => {
    const imgs = Array.from(printWindow.document.images);
    if (imgs.length === 0) {
      setTimeout(triggerPrint, 150);
      return;
    }
    let remaining = imgs.length;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      // Small extra delay to let layout settle after the last image decodes
      setTimeout(triggerPrint, 100);
    };
    const onOne = () => {
      remaining -= 1;
      if (remaining <= 0) finish();
    };
    imgs.forEach((img) => {
      if (img.complete && img.naturalWidth > 0) {
        onOne();
      } else {
        img.addEventListener("load", onOne, { once: true });
        img.addEventListener("error", onOne, { once: true });
      }
    });
    // Hard safety net: never wait more than 4s
    setTimeout(finish, 4000);
  };

  if (printWindow.document.readyState === "complete") {
    waitForImages();
  } else {
    printWindow.addEventListener("load", waitForImages, { once: true });
    // Fallback in case 'load' never fires (some popup blockers / WebView)
    setTimeout(waitForImages, 600);
  }
}

async function generateQrDataUrl(value: string): Promise<string | null> {
  try {
    const mod = await import("qrcode");
    const QRCode = (mod as any).default ?? mod;
    return await QRCode.toDataURL(value, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
      color: { dark: "#000000", light: "#FFFFFF" },
    });
  } catch {
    return null;
  }
}

export async function generateThermalReceipt(
  data: ReceiptData,
  settings: ShopSettings,
  formatCurrency: (n: number) => string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";

  // Build ticket display label: prefer explicit ticketLabel ("CS-00451"),
  // else fall back to legacy "REP-00451" from ticketNumber.
  const ticketDisplayLabel = data.ticketLabel
    ?? (data.ticketNumber ? `REP-${String(data.ticketNumber).padStart(5, "0")}` : "");



  // QR code — generated locally as a base64 PNG so it always prints, even
  // offline or on slow networks. Falls back to plain-text URL if generation fails.
  let qrImgTag = "";
  if (data.trackingUrl) {
    const qrDataUrl = await generateQrDataUrl(data.trackingUrl);
    const qrSize = printerWidth === "58mm" ? "19mm" : "24mm";
    if (qrDataUrl) {
      qrImgTag = `<img class="thermal-qr" src="${qrDataUrl}" style="width:${qrSize};" alt="QR" />`;
    } else {
      qrImgTag = `<p class="terms" style="word-break:break-all;">${escHtml(data.trackingUrl)}</p>`;
    }
  }

  // Logo — size is configurable per shop via settings.logo_size
  let logoTag = "";
  if (settings.logo_url) {
    const sizeMap: Record<string, { w: string; h: string }> = {
      small:  { w: "30mm", h: "15mm" },
      medium: { w: "50mm", h: "20mm" },
      large:  { w: "65mm", h: "30mm" },
      xlarge: { w: "72mm", h: "40mm" },
    };
    const sizeKey = ((settings as any).logo_size as string) || "medium";
    const { w, h } = sizeMap[sizeKey] || sizeMap.medium;
    logoTag = `<img src="${escHtml(settings.logo_url)}" style="max-width:${w};max-height:${h};width:auto;height:auto;display:block;margin:0 auto 2mm;" alt="logo" crossorigin="anonymous" />`;
  }

  // Items table
  let itemsHtml = "";
  if (data.items.length > 0) {
    const rows = data.items.map(item =>
      `<tr><td>${escHtml(item.name)}</td><td class="center">${item.qty}</td><td class="right">${escHtml(formatCurrency(item.unitPrice))}</td><td class="right">${escHtml(formatCurrency(item.total))}</td></tr>`
    ).join("");
    itemsHtml = `
      <div class="sep"></div>
      <table>
        <thead><tr><th>Article</th><th class="center">Qté</th><th class="right">P.U.</th><th class="right">Tot.</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>`;
  }

  // Problem block removed: the category IS the problem and is already
  // rendered in the customer/device block above as "Catégorie : ...".
  const problemHtml = "";

  // Terms
  const defaultTerms = [
    "Garantie de 90 jours sur toutes les pièces.",
    "Appareils non récupérés après 30 jours non garantis.",
    "Présentez ce ticket pour récupérer votre appareil.",
  ];
  const termsRaw: string = (settings as any).receipt_terms || "";
  const terms = termsRaw.trim() ? termsRaw.split("\n").filter((l: string) => l.trim()) : defaultTerms;
  const termsHtml = terms.map(t => `<p class="terms">${escHtml(t)}</p>`).join("");
  const thankYouHtml = (settings as any).show_receipt_note !== false
    ? `<p class="footer">Merci de votre confiance !</p>`
    : "";

  // Phones
  const phones = [settings.phone, settings.whatsapp_phone].filter(Boolean);

  // Ticket label is computed earlier as `ticketDisplayLabel`

  // Loyalty footer block (only when there is something to show)
  const showLoyalty = (data.loyaltyPointsEarned ?? 0) > 0 || (data.loyaltyPointsUsed ?? 0) > 0 || (data.loyaltyBalanceAfter !== null && data.loyaltyBalanceAfter !== undefined);
  let loyaltyHtml = "";
  if (showLoyalty) {
    const lines: string[] = [];
    if ((data.loyaltyPointsEarned ?? 0) > 0) {
      lines.push(`<div class="total-row"><span>Points gagnés :</span><span class="val">+${data.loyaltyPointsEarned}</span></div>`);
    }
    if ((data.loyaltyPointsUsed ?? 0) > 0) {
      const moneyPart = data.loyaltyDiscount ? ` (-${escHtml(formatCurrency(data.loyaltyDiscount))})` : "";
      lines.push(`<div class="total-row"><span>Points utilisés :</span><span class="val">-${data.loyaltyPointsUsed}${moneyPart}</span></div>`);
    }
    if (data.loyaltyBalanceAfter !== null && data.loyaltyBalanceAfter !== undefined) {
      lines.push(`<div class="total-row bold"><span>Nouveau solde :</span><span class="val">${data.loyaltyBalanceAfter} pts</span></div>`);
    }
    loyaltyHtml = `
<div class="sep-bold"></div>
<p class="label center">FIDÉLITÉ</p>
${lines.join("\n")}
<div class="sep-bold"></div>`;
  }

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Reçu</title>
<style>
  ${getThermalPrintCss(pageW, "12px")}
</style>
</head>
<body class="thermal-print-root"><main class="thermal-print-container">

${logoTag}
<p class="shop-name">${escHtml(settings.shop_name)}</p>
${settings.address ? `<p class="shop-info">${escHtml(settings.address)}</p>` : ""}
${phones.length ? `<p class="shop-info">Tél : ${escHtml(phones.join(" / "))}</p>` : ""}
${settings.email ? `<p class="shop-info">${escHtml(settings.email)}</p>` : ""}

<div class="sep-bold"></div>

<p class="title">${data.type === "repair" ? "BON DE RÉPARATION" : "REÇU DE VENTE"}</p>
${ticketDisplayLabel ? `<p class="ticket-label-small">TICKET N°</p><p class="ticket-big">${escHtml(ticketDisplayLabel)}</p>` : ""}

<div class="sep"></div>

<p class="field">Date dépôt : ${escHtml(data.date)}</p>
${data.time ? `<p class="field">Heure : ${escHtml(data.time)}</p>` : ""}

<div class="sep"></div>

${data.customer ? `<p class="field">Client : ${escHtml(data.customer.name)}</p>` : ""}
${data.customer?.phone ? `<p class="field">Tél : ${escHtml(data.customer.phone)}</p>` : ""}
${data.type === "repair" && data.device ? `<p class="field">Appareil : ${escHtml(data.device)}</p>` : ""}
${data.type === "repair" && data.category ? `<p class="field">Catégorie : ${escHtml(data.category)}</p>` : ""}
${data.type === "repair" && data.imei ? `<p class="field">IMEI : ${escHtml(data.imei)}</p>` : ""}
${data.deviceCondition ? `<p class="field">État à réception : ${escHtml(data.deviceCondition)}</p>` : ""}
${data.receivedBy ? `<p class="field">Reçu par : ${escHtml(data.receivedBy)}</p>` : ""}
${data.repairedBy ? `<p class="field">Réparé par : ${escHtml(data.repairedBy)}</p>` : ""}

${problemHtml}
${itemsHtml}

<div class="sep"></div>

<div class="total-row"><span>Sous-total :</span><span class="val">${escHtml(formatCurrency(data.subtotal))}</span></div>

<div class="total-row"><span>Payé :</span><span class="val">${escHtml(formatCurrency(data.paid))}</span></div>
${data.remaining > 0 ? `<div class="total-row"><span>Reste :</span><span class="val bold">${escHtml(formatCurrency(data.remaining))}</span></div>` : ""}
${data.paymentMethod ? `<div class="total-row"><span>Paiement :</span><span class="val">${data.paymentMethod === "card" ? "Carte" : "Espèces"}</span></div>` : ""}

<div class="sep-bold"></div>
<div class="total-row grand"><span>TOTAL :</span><span class="val">${escHtml(formatCurrency(data.total))}</span></div>
<div class="sep-bold"></div>

${loyaltyHtml}

${termsHtml}

${data.trackingUrl ? `
<div class="sep"></div>
<div class="qr-section">
  <p class="qr-label">Suivre votre réparation</p>
  <p class="terms">Scannez le QR code ci-dessous</p>
  ${qrImgTag}
</div>
` : ""}



<p class="footer">Présentez ce ticket pour récupérer<br>votre appareil.</p>
${thankYouHtml}

</main></body>
</html>`;

  printThermalHtml(html, "width=400,height=600");
}

// ── Phone Label (compact sticker for attaching to device) ──────────────

interface PhoneLabelData {
  ticketNumber?: number | null;
  ticketLabel?: string | null;
  customer: string;
  phone?: string;
  device: string;
  category?: string | null;
  problem: string;
  depositDate: string;
  receivedBy?: string;
  repairedBy?: string;
  unlockCode?: string;
}

export async function generatePhoneLabel(
  data: PhoneLabelData,
  shopName: string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";
  const ticketDisplayLabel = data.ticketLabel
    ?? (data.ticketNumber ? `REP-${String(data.ticketNumber).padStart(5, "0")}` : "");



  const problemTruncated = data.problem.length > 60 ? data.problem.slice(0, 57) + "..." : data.problem;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Étiquette</title>
<style>
  ${getThermalPrintCss(pageW, "11px")}
  .shop { font-size: 12px; font-weight: bold; text-align: center; }
  .ticket-label-tiny { font-size: 10px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 2px 0 0; }
  .ticket-huge { font-size: 10px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 0 0 3px; line-height: 1.35; }
  .field { font-size: 11px; margin: 1px 0; }
</style>
</head>
<body class="thermal-print-root"><main class="thermal-print-container">

<p class="shop">${escHtml(shopName)}</p>
${ticketDisplayLabel ? `<p class="ticket-label-tiny">TICKET N°</p><p class="ticket-huge">${escHtml(ticketDisplayLabel)}</p>` : ""}
<div class="sep"></div>
<p class="field"><span class="bold">Client:</span> ${escHtml(data.customer)}</p>
${data.phone ? `<p class="field"><span class="bold">Tél:</span> ${escHtml(data.phone)}</p>` : ""}
<p class="field"><span class="bold">Appareil:</span> ${escHtml(data.device)}</p>
${data.category ? `<p class="field"><span class="bold">Catégorie:</span> ${escHtml(data.category)}</p>` : ""}

<p class="field"><span class="bold">Dépôt:</span> ${escHtml(data.depositDate)}</p>
${data.receivedBy ? `<p class="field"><span class="bold">Reçu par:</span> ${escHtml(data.receivedBy)}</p>` : ""}
${data.unlockCode ? `<p class="field"><span class="bold">Code déverr.:</span> ${escHtml(data.unlockCode)}</p>` : ""}
${data.repairedBy ? `<p class="field"><span class="bold">Tech:</span> ${escHtml(data.repairedBy)}</p>` : ""}


</main></body>
</html>`;

  printThermalHtml(html, "width=350,height=400");
}

// ── Vault Credential (client saved account: iCloud / Google / Samsung) ──

export interface VaultCredentialData {
  customer: string;
  phone?: string;
  accountType: string; // already-localized label, e.g. "iCloud"
  emailId: string;
  password: string;
  createdAt: string; // formatted date
}

export function printVaultCredential(
  data: VaultCredentialData,
  shopName: string,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Identifiants client</title>
<style>
  ${getThermalPrintCss(pageW, "12px")}
  .shop { font-size: 14px; font-weight: bold; text-align: center; }
  .title { font-size: 11px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 2px 0 4px; }
  .field { font-size: 12px; margin: 2px 0; word-break: break-all; }
  .pass { font-size: 13px; margin: 3px 0; word-break: break-all; }
  .footer { font-size: 9px; text-align: center; margin-top: 6px; }
</style>
</head>
<body class="thermal-print-root"><main class="thermal-print-container">

<p class="shop">${escHtml(shopName)}</p>
<p class="title">IDENTIFIANTS DU COMPTE</p>
<div class="sep"></div>
<p class="field"><span class="bold">Client:</span> ${escHtml(data.customer)}</p>
${data.phone ? `<p class="field"><span class="bold">Tél:</span> ${escHtml(data.phone)}</p>` : ""}
<p class="field"><span class="bold">Type:</span> ${escHtml(data.accountType)}</p>
<div class="sep"></div>
<p class="field"><span class="bold">Email / ID:</span> ${escHtml(data.emailId)}</p>
<p class="pass"><span class="bold">Mot de passe:</span> ${escHtml(data.password)}</p>
<div class="sep"></div>
<p class="field"><span class="bold">Créé le:</span> ${escHtml(data.createdAt)}</p>
<p class="footer">Conservez ces informations en lieu sûr.</p>

</main></body>
</html>`;

  printThermalHtml(html, "width=350,height=450");
}

// ── Register Z-Report (Clôture de caisse / end-of-day closing) ──

export interface ClosingBreakdownRow {
  label: string;
  value: string; // pre-formatted currency
  meta?: string; // optional extra (e.g. item count)
}

export interface RegisterZReportData {
  shopName: string;
  dateTime: string; // formatted date & time
  sales: string; // pre-formatted currency strings
  repairs: string;
  expenses: string;
  net: string;
  isReprint?: boolean; // when true, prints a duplicate marker
  closedBy?: string | null;
  returns?: string | null; // pre-formatted refund total
  itemsSold?: number;
  byCategory?: ClosingBreakdownRow[];
  byPaymentMethod?: ClosingBreakdownRow[];
}

export function printRegisterZReport(
  data: RegisterZReportData,
  printerWidth: "80mm" | "58mm" = "80mm"
) {
  const pageW = printerWidth === "80mm" ? "72mm" : "48mm";

  const title = data.isReprint
    ? "RAPPORT DE CLÔTURE (DUPLICATA)"
    : "RAPPORT DE CLÔTURE";

  const catRows = (data.byCategory || [])
    .map(
      (r) =>
        `<div class="z-row"><span>${escHtml(r.label)}${
          r.meta ? ` (${escHtml(r.meta)})` : ""
        }</span><span class="val">${escHtml(r.value)}</span></div>`
    )
    .join("");

  const payRows = (data.byPaymentMethod || [])
    .map(
      (r) =>
        `<div class="z-row"><span>${escHtml(r.label)}</span><span class="val">${escHtml(
          r.value
        )}</span></div>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Rapport de clôture</title>
<style>
  ${getThermalPrintCss(pageW, "12px")}
  .z-shop { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 2px; }
  .z-title { font-size: 15px; font-weight: bold; text-align: center; letter-spacing: 1px; margin: 2px 0; }
  .z-meta { font-size: 11px; text-align: center; margin: 1px 0; }
  .z-section { font-size: 11px; font-weight: bold; text-align: left; margin: 3px 0 1px; text-transform: uppercase; }
  .z-row { display: flex; justify-content: space-between; font-size: 13px; margin: 2px 0; gap: 3mm; }
  .z-row .val { text-align: right; white-space: nowrap; }
  .z-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: bold; margin: 3px 0; gap: 3mm; }
  .z-status { font-size: 13px; font-weight: bold; text-align: center; margin: 3px 0; }
  .z-sign { font-size: 12px; margin-top: 8mm; }
  .z-sign-line { border-top: 1px solid #000; margin-top: 10mm; padding-top: 1mm; }
</style>
</head>
<body class="thermal-print-root"><main class="thermal-print-container">

<div class="sep-bold"></div>
<p class="z-title">${escHtml(title)}</p>
<div class="sep-bold"></div>
<p class="z-shop">${escHtml(data.shopName)}</p>
<p class="z-meta">${escHtml(data.dateTime)}</p>
<div class="sep"></div>
${
  catRows
    ? `<p class="z-section">Ventes par catégorie</p>${catRows}<div class="sep"></div>`
    : ""
}
${
  payRows
    ? `<p class="z-section">Modes de paiement</p>${payRows}<div class="sep"></div>`
    : ""
}
<div class="z-row"><span>VENTES:</span><span class="val">${escHtml(data.sales)}</span></div>
<div class="z-row"><span>RÉPARATIONS:</span><span class="val">${escHtml(data.repairs)}</span></div>
${
  data.returns
    ? `<div class="z-row"><span>RETOURS:</span><span class="val">-${escHtml(data.returns)}</span></div>`
    : ""
}
<div class="z-row"><span>DÉPENSES:</span><span class="val">-${escHtml(data.expenses)}</span></div>
${
  typeof data.itemsSold === "number"
    ? `<div class="z-row"><span>ARTICLES VENDUS:</span><span class="val">${data.itemsSold}</span></div>`
    : ""
}
<div class="sep"></div>
<div class="z-total"><span>TOTAL EN CAISSE:</span><span class="val">${escHtml(data.net)}</span></div>
<div class="sep-bold"></div>
<p class="z-status">Statut: Clôturé</p>
<div class="sep"></div>
${data.closedBy ? `<p class="z-meta">Clôturé par: ${escHtml(data.closedBy)}</p>` : ""}
<div class="z-sign">
  <span>Signature de l'employé:</span>
  <div class="z-sign-line"></div>
</div>
<div class="sep-bold"></div>

</main></body>
</html>`;

  printThermalHtml(html, "width=380,height=720");
}

// ── A4 PDF closing report (jsPDF) ──

export interface ClosingPdfData {
  shopName: string;
  address?: string | null;
  phone?: string | null;
  logoUrl?: string | null;
  dateTime: string;
  closedBy?: string | null;
  isDuplicate?: boolean;
  byCategory: { category: string; revenue: number; items: number }[];
  byPaymentMethod: { method: string; revenue: number }[];
  returns: { product_name: string; quantity: number; refund_amount: number }[];
  expenses: { category: string; amount: number }[];
  totals: {
    sales: number;
    repairs: number;
    returns: number;
    expenses: number;
    net: number;
    itemsSold: number;
  };
}

async function loadImageDataUrl(
  url: string
): Promise<{ dataUrl: string; w: number; h: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    const dataUrl: string = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = dataUrl;
    });
    return { dataUrl, w: dims.w, h: dims.h };
  } catch {
    return null;
  }
}

export async function generateClosingReportPdf(
  data: ClosingPdfData,
  format: (n: number) => string
) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = 210;
  const margin = 16;
  const contentW = pageW - margin * 2;
  let y = margin;

  const black = (): [number, number, number] => [17, 17, 17];
  const grey = (): [number, number, number] => [110, 110, 110];

  // ---- Header: logo + shop details ----
  if (data.logoUrl) {
    const img = await loadImageDataUrl(data.logoUrl);
    if (img && img.w && img.h) {
      const maxH = 18;
      const ratio = img.w / img.h;
      const h = maxH;
      const w = Math.min(h * ratio, 40);
      try {
        doc.addImage(img.dataUrl, "PNG", margin, y, w, h);
      } catch {
        /* ignore unsupported image */
      }
    }
  }

  doc.setTextColor(...black());
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(data.shopName, pageW - margin, y + 6, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grey());
  let infoY = y + 11;
  if (data.address) {
    doc.text(data.address, pageW - margin, infoY, { align: "right" });
    infoY += 4;
  }
  if (data.phone) {
    doc.text(`Tél: ${data.phone}`, pageW - margin, infoY, { align: "right" });
    infoY += 4;
  }

  y = Math.max(y + 20, infoY + 2);

  // ---- Title ----
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);
  y += 8;
  doc.setTextColor(...black());
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(
    data.isDuplicate ? "RAPPORT DE CLÔTURE (DUPLICATA)" : "RAPPORT DE CLÔTURE",
    margin,
    y
  );
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...grey());
  doc.text(`Date de clôture: ${data.dateTime}`, margin, y);
  y += 8;

  // ---- Summary box ----
  const summary: [string, string][] = [
    ["Total Ventes", format(data.totals.sales)],
    ["Total Réparations", format(data.totals.repairs)],
    ["Total Retours", `- ${format(data.totals.returns)}`],
    ["Total Dépenses", `- ${format(data.totals.expenses)}`],
    ["Articles vendus", String(data.totals.itemsSold)],
  ];
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.2);
  const boxTop = y;
  const rowH = 7;
  summary.forEach(([label, value], i) => {
    const ry = boxTop + i * rowH;
    doc.setTextColor(...black());
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(label, margin + 2, ry + 5);
    doc.setFont("helvetica", "bold");
    doc.text(value, pageW - margin - 2, ry + 5, { align: "right" });
    doc.line(margin, ry + rowH, pageW - margin, ry + rowH);
  });
  y = boxTop + summary.length * rowH + 4;

  // Net highlight
  doc.setFillColor(17, 17, 17);
  doc.rect(margin, y, contentW, 10, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("NET EN CAISSE", margin + 3, y + 6.7);
  doc.text(format(data.totals.net), pageW - margin - 3, y + 6.7, { align: "right" });
  y += 16;

  // ---- Generic table renderer ----
  const drawTable = (
    titleText: string,
    headers: string[],
    rows: string[][],
    aligns: ("left" | "right")[]
  ) => {
    if (!rows.length) return;
    if (y > 250) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(...black());
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(titleText, margin, y);
    y += 5;

    const colW = contentW / headers.length;
    doc.setFontSize(9);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, contentW, 6, "F");
    headers.forEach((h, i) => {
      const align = aligns[i];
      const x = align === "right" ? margin + colW * (i + 1) - 2 : margin + colW * i + 2;
      doc.text(h, x, y + 4, { align });
    });
    y += 6;

    doc.setFont("helvetica", "normal");
    rows.forEach((r) => {
      if (y > 280) {
        doc.addPage();
        y = margin;
      }
      r.forEach((cell, i) => {
        const align = aligns[i];
        const x = align === "right" ? margin + colW * (i + 1) - 2 : margin + colW * i + 2;
        doc.text(cell, x, y + 4, { align });
      });
      doc.setDrawColor(230, 230, 230);
      doc.line(margin, y + 5.5, pageW - margin, y + 5.5);
      y += 6;
    });
    y += 6;
  };

  drawTable(
    "Ventes par catégorie",
    ["Catégorie", "Articles", "Total"],
    data.byCategory.map((c) => [c.category, String(c.items), format(c.revenue)]),
    ["left", "right", "right"]
  );

  drawTable(
    "Modes de paiement",
    ["Mode", "Total"],
    data.byPaymentMethod.map((p) => [p.method, format(p.revenue)]),
    ["left", "right"]
  );

  drawTable(
    "Retours / Remboursements",
    ["Article", "Qté", "Remboursé"],
    data.returns.map((r) => [r.product_name, String(r.quantity), format(r.refund_amount)]),
    ["left", "right", "right"]
  );

  drawTable(
    "Dépenses",
    ["Catégorie", "Montant"],
    data.expenses.map((e) => [e.category, format(e.amount)]),
    ["left", "right"]
  );

  // ---- Signature footer ----
  if (y > 250) {
    doc.addPage();
    y = margin;
  }
  y = Math.max(y, 255);
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageW - margin, y);
  y += 7;
  doc.setTextColor(...black());
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Clôturé par: ${data.closedBy || "—"}`, margin, y);
  y += 14;
  doc.setDrawColor(120, 120, 120);
  doc.line(margin, y, margin + 70, y);
  doc.setFontSize(9);
  doc.setTextColor(...grey());
  doc.text("Signature de l'employé", margin, y + 4);

  const fileDate = data.dateTime.replace(/[^0-9]/g, "").slice(0, 8) || "rapport";
  doc.save(`cloture-${fileDate}.pdf`);
}

export interface OrderReceiptItem {
  name: string;
  sku?: string | null;
  quantity: number;
  orderQty: number;
}

export interface OrderReceiptData {
  shopName: string;
  address?: string;
  phone?: string;
  dateTime: string;
  items: OrderReceiptItem[];
}

/**
 * 80mm thermal "Bon de commande" for out-of-stock / critical items.
 * Reuses the same layout as the inventory shortage print flow so a shop
 * owner can hand the ticket to a supplier.
 */
export function printOrderReceipt(data: OrderReceiptData) {
  const rows = data.items
    .map(
      (p) => `
        <tr>
          <td class="name">${escHtml(p.name)}${p.sku ? `<br/><span class="sku">${escHtml(p.sku)}</span>` : ""}</td>
          <td class="center">${p.quantity}</td>
          <td class="center qty">${p.orderQty}</td>
        </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bon de commande — ${escHtml(data.shopName)}</title>
<style>
  @page { size: 80mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 80mm; }
  body {
    padding: 4mm 3mm;
    font-family: 'Courier New', Courier, monospace;
    color: #000; background: #fff; font-size: 12px; line-height: 1.4;
    -webkit-font-smoothing: none; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .shop { text-align: center; font-weight: bold; font-size: 15px; }
  .meta { text-align: center; font-size: 10.5px; margin-bottom: 1mm; word-break: break-word; }
  .title { text-align: center; font-weight: bold; font-size: 12.5px; margin: 2mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 1.5mm 0; }
  .date { text-align: center; font-size: 10.5px; margin-bottom: 2mm; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  th { font-size: 11px; text-align: left; border-bottom: 1px solid #000; padding: 1mm 0.5mm; }
  th.center, td.center { text-align: center; width: 21%; }
  td { font-size: 11px; padding: 1.4mm 0.5mm; border-bottom: 1px dotted #999; vertical-align: top; overflow-wrap: break-word; word-break: break-word; }
  td.name { width: 58%; }
  .sku { font-size: 9.5px; color: #333; }
  td.qty { font-weight: bold; }
  .total { margin-top: 2mm; font-size: 12px; font-weight: bold; text-align: right; }
  .sign { margin-top: 8mm; font-size: 10.5px; }
  .sign-line { margin-top: 6mm; border-top: 1px solid #000; width: 50mm; max-width: 100%; padding-top: 1mm; }
  .footer { text-align: center; font-size: 9.5px; margin-top: 4mm; word-break: break-word; }
</style>
</head>
<body>
  <div class="shop">${escHtml(data.shopName)}</div>
  ${data.address ? `<div class="meta">${escHtml(data.address)}</div>` : ""}
  ${data.phone ? `<div class="meta">Tél: ${escHtml(data.phone)}</div>` : ""}
  <div class="title">BON DE COMMANDE / RUPTURE</div>
  <div class="date">${escHtml(data.dateTime)}</div>
  <table>
    <thead><tr><th>Produit</th><th class="center">Stock</th><th class="center">À cmd</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total">Total articles : ${data.items.length}</div>
  <div class="sign"><div class="sign-line">Signature / Cachet</div></div>
  <div class="footer">Généré par ${escHtml(data.shopName)}</div>
</body>
</html>`;

  printThermalHtml(html, "width=400,height=600");
}
