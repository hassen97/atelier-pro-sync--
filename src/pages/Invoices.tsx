import { useState } from "react";
import {
  Search,
  Plus,
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useInvoices, useUpdateInvoice, useDeleteInvoice, InvoiceWithRelations } from "@/hooks/useInvoices";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { getThermalPrintCss, printThermalHtml, thermalEscape } from "@/lib/receiptPdf";
import { toast } from "sonner";

const statusConfig = {
  paid: { label: "Payée", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  partial: { label: "Partielle", className: "bg-accent/10 text-accent border-accent/20" },
  cancelled: { label: "Annulée", className: "bg-muted text-muted-foreground border-muted" },
};

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithRelations | null>(null);

  const { data: invoices = [], isLoading } = useInvoices();
  const updateInvoice = useUpdateInvoice();
  const deleteInvoice = useDeleteInvoice();
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.customer?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.invoice_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0);
  const paidAmount = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  const handleView = (invoice: InvoiceWithRelations) => {
    setSelectedInvoice(invoice);
    setViewDialogOpen(true);
  };

  const handlePrint = (invoice: InvoiceWithRelations) => {
    const status = statusConfig[invoice.status as keyof typeof statusConfig]?.label || invoice.status;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Facture</title><style>${getThermalPrintCss("72mm", "12px")}</style></head>
      <body class="thermal-print-root"><main class="thermal-print-container">
        <p class="shop-name">${thermalEscape(settings.shop_name)}</p>
        <div class="sep-bold"></div>
        <p class="title">FACTURE</p>
        <p class="ticket-num">${thermalEscape(invoice.invoice_number)}</p>
        <div class="sep"></div>
        <p class="field">Date : ${new Date(invoice.created_at).toLocaleDateString("fr-TN")}</p>
        <p class="field">Client : ${thermalEscape(invoice.customer?.name || "Client passager")}</p>
        ${invoice.customer?.phone ? `<p class="field">Tél : ${thermalEscape(invoice.customer.phone)}</p>` : ""}
        <div class="sep"></div>
        <p class="field">Type : ${invoice.repair ? "Réparation" : "Vente"}</p>
        ${invoice.repair ? `<p class="field">Appareil : ${thermalEscape(invoice.repair.device_model)}</p>` : ""}
        ${invoice.sale ? `<p class="field">Vente : ${format(Number(invoice.sale.total_amount))}</p>` : ""}
        <div class="sep-bold"></div>
        <div class="total-row grand"><span>TOTAL :</span><span class="val">${format(Number(invoice.total_amount))}</span></div>
        <div class="total-row"><span>Statut :</span><span class="val">${status}</span></div>
        <div class="sep-bold"></div>
      </main></body></html>`;
    printThermalHtml(html, "width=400,height=600");
  };

  const handleDownloadPDF = (invoice: InvoiceWithRelations) => {
    const content = `
FACTURE: ${invoice.invoice_number}
${settings.shop_name}
================================
Date: ${new Date(invoice.created_at).toLocaleDateString("fr-TN")}
Client: ${invoice.customer?.name || "Client passager"}
${invoice.customer?.phone ? `Tél: ${invoice.customer.phone}` : ""}
================================
${invoice.repair ? `Réparation: ${invoice.repair.device_model}` : ""}
${invoice.sale ? `Vente - Montant: ${format(invoice.sale.total_amount)}` : ""}
================================
TOTAL: ${format(Number(invoice.total_amount))}
Statut: ${statusConfig[invoice.status as keyof typeof statusConfig]?.label || invoice.status}
================================
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${invoice.invoice_number}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Facture téléchargée");
  };

  const handleCancel = async (invoice: InvoiceWithRelations) => {
    try {
      await updateInvoice.mutateAsync({ id: invoice.id, status: "cancelled" });
      toast.success("Facture annulée");
    } catch (error) {
      toast.error("Erreur lors de l'annulation");
    }
  };

  const handleMarkAsPaid = async (invoice: InvoiceWithRelations) => {
    try {
      await updateInvoice.mutateAsync({ id: invoice.id, status: "paid" });
      toast.success("Facture marquée comme payée");
    } catch (error) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleExportExcel = () => {
    const headers = ["N° Facture", "Client", "Date", "Type", "Total", "Statut"];
    const rows = filteredInvoices.map((inv) => [
      inv.invoice_number,
      inv.customer?.name || "Client passager",
      new Date(inv.created_at).toLocaleDateString("fr-TN"),
      inv.repair ? "Réparation" : "Vente",
      Number(inv.total_amount).toFixed(3),
      statusConfig[inv.status as keyof typeof statusConfig]?.label || inv.status,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `factures_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Export Excel téléchargé");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Factures" description="Gestion et historique des factures">
        <Button variant="outline" onClick={handleExportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exporter Excel
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Total factures" value={totalInvoices} icon={FileText} variant="default" />
        <StatCard title="Montant total" value={format(totalAmount)} icon={FileText} variant="accent" />
        <StatCard title="Montant encaissé" value={format(paidAmount)} icon={FileText} variant="success" />
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Rechercher par N° ou client..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune facture trouvée</TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const status = statusConfig[invoice.status as keyof typeof statusConfig] || statusConfig.pending;
                  const type = invoice.repair ? "Réparation" : "Vente";
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-mono text-sm font-medium">{invoice.invoice_number}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          {invoice.customer?.name || "Client passager"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {new Date(invoice.created_at).toLocaleDateString("fr-TN")}
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="secondary">{type}</Badge></TableCell>
                      <TableCell className="text-right font-mono-numbers font-medium">{format(Number(invoice.total_amount))}</TableCell>
                      <TableCell><Badge className={status.className}>{status.label}</Badge></TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleView(invoice)}><Eye className="h-4 w-4 mr-2" />Voir</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDownloadPDF(invoice)}><Download className="h-4 w-4 mr-2" />Télécharger</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handlePrint(invoice)}><Printer className="h-4 w-4 mr-2" />Imprimer</DropdownMenuItem>
                            {invoice.status === "pending" && <DropdownMenuItem onClick={() => handleMarkAsPaid(invoice)}>Marquer payée</DropdownMenuItem>}
                            {invoice.status !== "cancelled" && <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(invoice)}>Annuler</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-md print:max-w-full print:m-0">
          <DialogHeader>
            <DialogTitle>Facture {selectedInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="text-center pb-4 border-b">
                <h2 className="text-xl font-bold">{settings.shop_name}</h2>
                <p className="text-sm text-muted-foreground">{new Date(selectedInvoice.created_at).toLocaleDateString("fr-TN")}</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between"><span className="text-muted-foreground">Client:</span><span className="font-medium">{selectedInvoice.customer?.name || "Client passager"}</span></div>
                {selectedInvoice.customer?.phone && <div className="flex justify-between"><span className="text-muted-foreground">Téléphone:</span><span>{selectedInvoice.customer.phone}</span></div>}
                <div className="flex justify-between"><span className="text-muted-foreground">Type:</span><span>{selectedInvoice.repair ? "Réparation" : "Vente"}</span></div>
                {selectedInvoice.repair && <div className="flex justify-between"><span className="text-muted-foreground">Appareil:</span><span>{selectedInvoice.repair.device_model}</span></div>}
              </div>
              <div className="pt-4 border-t">
                <div className="flex justify-between text-lg font-bold"><span>Total:</span><span>{format(Number(selectedInvoice.total_amount))}</span></div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Statut:</span>
                  <Badge className={statusConfig[selectedInvoice.status as keyof typeof statusConfig]?.className}>{statusConfig[selectedInvoice.status as keyof typeof statusConfig]?.label}</Badge>
                </div>
              </div>
              <div className="flex gap-2 pt-4 print:hidden">
                <Button variant="outline" className="flex-1" onClick={() => handleDownloadPDF(selectedInvoice)}><Download className="h-4 w-4 mr-2" />Télécharger</Button>
                <Button className="flex-1" onClick={() => handlePrint(selectedInvoice)}><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
