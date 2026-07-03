import * as XLSX from "xlsx";
import type { AdminReportsData } from "@/hooks/useAdminReports";

const today = () => new Date().toISOString().slice(0, 10);
const fmtMoney = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} TND`;

/* ────────────────────────────── Excel ────────────────────────────── */

export function exportReportsToExcel(data: AdminReportsData, range: string) {
  const wb = XLSX.utils.book_new();

  // KPIs sheet
  const kpiRows = [
    ["Indicateur", "Valeur", "Tendance"],
    ["Revenu total (TND)", Math.round(data.kpis.totalRevenue), data.kpis.revenueTrend],
    ["Total réparations", data.kpis.totalRepairs, data.kpis.repairsTrend],
    ["Valeur moyenne du ticket (TND)", Number(data.kpis.avgTicket.toFixed(2)), ""],
    ["Boutiques actives", data.kpis.activeShops, ""],
    [],
    ["Période", data.rangeLabel],
    ["Généré le", new Date().toLocaleString("fr-FR")],
  ];
  const kpiSheet = XLSX.utils.aoa_to_sheet(kpiRows);
  kpiSheet["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, kpiSheet, "KPIs");

  // Revenue monthly
  const revRows = [
    ["Mois", "Revenu (TND)", "Réparations"],
    ...data.revenueSeries.map(p => [p.month, Math.round(p.revenue), p.repairs]),
  ];
  const revSheet = XLSX.utils.aoa_to_sheet(revRows);
  revSheet["!cols"] = [{ wch: 14 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, revSheet, "Revenu mensuel");

  // Top shops
  const shopRows = [
    ["Rang", "Boutique", "Ville", "Réparations", "Revenu (TND)", "Statut"],
    ...data.topShops.map(s => [s.rank, s.name, s.city, s.repairs, Math.round(s.revenue), s.status]),
  ];
  const shopSheet = XLSX.utils.aoa_to_sheet(shopRows);
  shopSheet["!cols"] = [{ wch: 6 }, { wch: 30 }, { wch: 22 }, { wch: 14 }, { wch: 16 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, shopSheet, "Top boutiques");

  // Repair types
  const typeRows = [
    ["Type", "Nombre", "Revenu (TND)"],
    ...data.repairTypes.map(t => [t.type, t.count, Math.round(t.revenue)]),
  ];
  const typeSheet = XLSX.utils.aoa_to_sheet(typeRows);
  typeSheet["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, typeSheet, "Types de réparation");

  // Device mix
  const devRows = [
    ["Appareil", "Nombre", "Part (%)"],
    ...data.deviceMix.map(d => [d.name, d.count, d.value]),
  ];
  const devSheet = XLSX.utils.aoa_to_sheet(devRows);
  devSheet["!cols"] = [{ wch: 16 }, { wch: 12 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, devSheet, "Appareils");

  XLSX.writeFile(wb, `rapport-plateforme-${range}-${today()}.xlsx`);
}

/* ────────────────────────────── PDF ────────────────────────────── */

export async function exportReportsToPdf(data: AdminReportsData, range: string) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 36;
  let y = margin;

  // Header
  doc.setFillColor(8, 14, 26);
  doc.rect(0, 0, pageW, 60, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text("Centre de Commande — Rapport plateforme", margin, 28);
  doc.setFontSize(10);
  doc.setTextColor(160, 175, 195);
  doc.text(`Période : ${data.rangeLabel}   ·   Généré le ${new Date().toLocaleString("fr-FR")}`, margin, 46);

  y = 90;

  // KPI grid (4 boxes)
  const kpiBoxes = [
    { label: "Revenu total", value: fmtMoney(data.kpis.totalRevenue), trend: data.kpis.revenueTrend },
    { label: "Total réparations", value: String(data.kpis.totalRepairs), trend: data.kpis.repairsTrend },
    { label: "Ticket moyen", value: fmtMoney(data.kpis.avgTicket), trend: "" },
    { label: "Boutiques actives", value: String(data.kpis.activeShops), trend: "" },
  ];
  const boxW = (pageW - margin * 2 - 30) / 4;
  const boxH = 70;
  kpiBoxes.forEach((k, i) => {
    const x = margin + i * (boxW + 10);
    doc.setDrawColor(220, 226, 236);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(x, y, boxW, boxH, 6, 6, "FD");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(9);
    doc.text(k.label.toUpperCase(), x + 12, y + 18);
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(16);
    doc.text(k.value, x + 12, y + 42);
    if (k.trend) {
      doc.setTextColor(k.trend.startsWith("-") ? 220 : 16, k.trend.startsWith("-") ? 38 : 185, k.trend.startsWith("-") ? 38 : 129);
      doc.setFontSize(9);
      doc.text(k.trend, x + 12, y + 60);
    }
  });

  y += boxH + 24;

  // Top shops table (manual)
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(13);
  doc.text("Performance par boutique", margin, y);
  y += 14;

  const cols = [
    { label: "#",            w: 28,  align: "left" as const },
    { label: "Boutique",     w: 220, align: "left" as const },
    { label: "Ville",        w: 150, align: "left" as const },
    { label: "Réparations",  w: 80,  align: "right" as const },
    { label: "Revenu",       w: 110, align: "right" as const },
    { label: "Statut",       w: 80,  align: "left" as const },
  ];
  const tableW = cols.reduce((s, c) => s + c.w, 0);
  const tableX = margin;
  const rowH = 18;

  // Header
  doc.setFillColor(15, 23, 42);
  doc.rect(tableX, y, tableW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  let cx = tableX;
  cols.forEach(c => {
    const tx = c.align === "right" ? cx + c.w - 8 : cx + 8;
    doc.text(c.label, tx, y + 12, { align: c.align });
    cx += c.w;
  });
  y += rowH;

  doc.setTextColor(30, 41, 59);
  doc.setFontSize(9);
  data.topShops.forEach((s, i) => {
    if (y > pageH - 60) {
      doc.addPage();
      y = margin;
    }
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(tableX, y, tableW, rowH, "F");
    }
    const cells = [
      `#${s.rank}`,
      s.name.length > 38 ? s.name.slice(0, 36) + "…" : s.name,
      s.city.length > 26 ? s.city.slice(0, 24) + "…" : s.city,
      String(s.repairs),
      fmtMoney(s.revenue),
      s.status === "active" ? "Actif" : s.status === "pending" ? "En attente" : "Suspendu",
    ];
    cx = tableX;
    cells.forEach((val, j) => {
      const c = cols[j];
      const tx = c.align === "right" ? cx + c.w - 8 : cx + 8;
      doc.text(val, tx, y + 12, { align: c.align });
      cx += c.w;
    });
    y += rowH;
  });

  // Revenue summary table
  y += 18;
  if (y > pageH - 100) { doc.addPage(); y = margin; }
  doc.setFontSize(13);
  doc.setTextColor(15, 23, 42);
  doc.text("Évolution mensuelle", margin, y);
  y += 14;

  const mCols = [
    { label: "Mois",        w: 120, align: "left" as const },
    { label: "Revenu",      w: 140, align: "right" as const },
    { label: "Réparations", w: 120, align: "right" as const },
  ];
  const mW = mCols.reduce((s, c) => s + c.w, 0);

  doc.setFillColor(15, 23, 42);
  doc.rect(margin, y, mW, rowH, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(9);
  cx = margin;
  mCols.forEach(c => {
    const tx = c.align === "right" ? cx + c.w - 8 : cx + 8;
    doc.text(c.label, tx, y + 12, { align: c.align });
    cx += c.w;
  });
  y += rowH;
  doc.setTextColor(30, 41, 59);
  data.revenueSeries.forEach((p, i) => {
    if (y > pageH - 40) { doc.addPage(); y = margin; }
    if (i % 2 === 0) {
      doc.setFillColor(245, 247, 250);
      doc.rect(margin, y, mW, rowH, "F");
    }
    const cells = [p.month, fmtMoney(p.revenue), String(p.repairs)];
    cx = margin;
    cells.forEach((val, j) => {
      const c = mCols[j];
      const tx = c.align === "right" ? cx + c.w - 8 : cx + 8;
      doc.text(val, tx, y + 12, { align: c.align });
      cx += c.w;
    });
    y += rowH;
  });

  doc.save(`rapport-plateforme-${range}-${today()}.pdf`);
}
