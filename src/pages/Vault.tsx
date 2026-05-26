import { useState } from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import { VaultTable } from "@/components/vault/VaultTable";
import { VaultEntryDialog } from "@/components/vault/VaultEntryDialog";
import { useVaultEntries, type VaultEntry } from "@/hooks/useCustomerVault";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";

export default function Vault() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);
  const { user } = useAuth();
  const effectiveUserId = useEffectiveUserId();
  const { data: entries = [] } = useVaultEntries();

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (entry: VaultEntry) => {
    setEditing(entry);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <SEO
        title="Coffre-fort de comptes — RepairPro"
        description="Enregistrez en toute sécurité les identifiants iCloud, Google et Samsung de vos clients."
        path="/vault"
      />
      <PageHeader
        title="Coffre-fort de comptes"
        description="Identifiants iCloud, Google et Samsung de vos clients, sécurisés et liés à leur fiche."
      >
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau compte
        </Button>
      </PageHeader>

      <div className="rounded-md border border-dashed bg-muted/30 p-3 text-xs font-mono break-all">
        <div><b>DEBUG (à retirer)</b></div>
        <div>auth.uid: {user?.id ?? "—"}</div>
        <div>effectiveUserId: {effectiveUserId ?? "—"}</div>
        <div>rows returned: {entries.length}</div>
      </div>

      <VaultTable search={search} onSearchChange={setSearch} onEdit={openEdit} />

      <VaultEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
    </div>
  );
}
