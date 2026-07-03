// Excel export for the detailed cash-closing report.
// Mirrors the A4 PDF: summary + categories + products + payment methods +
// paid repairs + returns + expenses. xlsx is imported dynamically to keep it
// out of the main bundle (perf strategy).

export interface ClosingExcelData {
  shopName: string;
  dateTime: string;
  closedBy?: string | null;
  isDuplicate?: boolean;
  byCategory: { category: string; revenue: number; items: number }[];
  byProduct: { product_name: string; quantity: number; revenue: number }[];
  byPaymentMethod: { method: string; revenue: number; count?: number }[];
  repairs: { label: string; customer: string | null; amount: number }[];
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

export async function generateClosingReportExcel(
  data: ClosingExcelData,
  format: (n: number) => string
) {
  const XLSX = await import("xlsx");

  const rows: (string | number)[][] = [];
  const push = (...r: (string | number)[]) => rows.push(r);
  const blank = () => rows.push([]);

  // ---- Header ----
  push(data.shopName);
  push(data.isDuplicate ? "RAPPORT DE CLÔTURE (DUPLICATA)" : "RAPPORT DE CLÔTURE");
  push("Date de clôture", data.dateTime);
  if (data.closedBy) push("Clôturé par", data.closedBy);
  blank();

  // ---- Summary ----
  push("RÉSUMÉ");
  push("Total Ventes", format(data.totals.sales));
  push("Total Réparations", format(data.totals.repairs));
  push("Total Retours", `- ${format(data.totals.returns)}`);
  push("Total Dépenses", `- ${format(data.totals.expenses)}`);
  push("Articles vendus", data.totals.itemsSold);
  push("NET EN CAISSE", format(data.totals.net));
  blank();

  // ---- Categories ----
  if (data.byCategory.length) {
    push("VENTES PAR CATÉGORIE");
    push("Catégorie", "Articles", "Total");
    data.byCategory.forEach((c) => push(c.category, c.items, format(c.revenue)));
    blank();
  }

  // ---- Products ----
  if (data.byProduct.length) {
    push("VENTES PAR PRODUIT");
    push("Produit", "Qté", "Total");
    data.byProduct.forEach((p) => push(p.product_name, p.quantity, format(p.revenue)));
    blank();
  }

  // ---- Payment methods ----
  if (data.byPaymentMethod.length) {
    push("MODES DE PAIEMENT");
    push("Mode", "Nb", "Total");
    data.byPaymentMethod.forEach((p) =>
      push(p.method, p.count ?? "", format(p.revenue))
    );
    blank();
  }

  // ---- Paid repairs ----
  if (data.repairs.length) {
    push("RÉPARATIONS PAYÉES");
    push("Réparation", "Client", "Montant");
    data.repairs.forEach((r) => push(r.label, r.customer || "—", format(r.amount)));
    blank();
  }

  // ---- Returns ----
  if (data.returns.length) {
    push("RETOURS / REMBOURSEMENTS");
    push("Article", "Qté", "Remboursé");
    data.returns.forEach((r) =>
      push(r.product_name, r.quantity, `- ${format(r.refund_amount)}`)
    );
    blank();
  }

  // ---- Expenses ----
  if (data.expenses.length) {
    push("DÉPENSES");
    push("Catégorie", "Montant");
    data.expenses.forEach((e) => push(e.category, `- ${format(e.amount)}`));
    blank();
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 36 }, { wch: 18 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Clôture");

  const fileDate = data.dateTime.replace(/[^0-9]/g, "").slice(0, 8) || "rapport";
  XLSX.writeFile(wb, `cloture-${fileDate}.xlsx`);
}
