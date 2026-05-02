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
${data.repairedBy ? `<p class="field"><span class="bold">Tech:</span> ${escHtml(data.repairedBy)}</p>` : ""}


</main></body>
</html>`;

  printThermalHtml(html, "width=350,height=400");
}
