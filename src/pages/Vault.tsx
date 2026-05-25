import { useState } from "react";
import { KeyRound, Plus } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { SEO } from "@/components/seo/SEO";
import { VaultTable } from "@/components/vault/VaultTable";
import { VaultEntryDialog } from "@/components/vault/VaultEntryDialog";
import type { VaultEntry } from "@/hooks/useCustomerVault";

export default function Vault() {
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<VaultEntry | null>(null);

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
        icon={KeyRound}
        action={
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-2" />
            Nouveau compte
          </Button>
        }
      />

      <VaultTable search={search} onSearchChange={setSearch} onEdit={openEdit} />

      <VaultEntryDialog open={dialogOpen} onOpenChange={setDialogOpen} entry={editing} />
    </div>
  );
}
