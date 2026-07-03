import { useState } from "react";
import { useAnnouncements, useCreateAnnouncement, useDeleteAnnouncement } from "@/hooks/useAnnouncements";
import { useAdminData } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Megaphone, Sparkles, Bug, Globe, Store, Copy } from "lucide-react";
import { formatForFacebook } from "@/lib/changelogFormat";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AdminAnnouncementsView() {
  const { data: announcements } = useAnnouncements();
  const { data: adminData } = useAdminData();
  const createAnnouncement = useCreateAnnouncement();
  const deleteAnnouncement = useDeleteAnnouncement();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [newFeatures, setNewFeatures] = useState("");
  const [changesFixes, setChangesFixes] = useState("");
  const [targetUserId, setTargetUserId] = useState<string>("broadcast");

  const owners = adminData?.owners || [];

  const handleSubmit = () => {
    if (!title.trim()) return;
    createAnnouncement.mutate(
      {
        title,
        new_features: newFeatures,
        changes_fixes: changesFixes,
        target_user_id: targetUserId === "broadcast" ? null : targetUserId,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setTitle("");
          setNewFeatures("");
          setChangesFixes("");
          setTargetUserId("broadcast");
        },
      }
    );
  };

  const getTargetLabel = (targetUserId: string | null) => {
    if (!targetUserId) return null;
    const owner = owners.find((o) => o.user_id === targetUserId);
    return owner?.shop_name || owner?.full_name || owner?.username || "Boutique inconnue";
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Notes de mise à jour</h2>
        <Button
          onClick={() => setOpen(true)}
          className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouvelle annonce
        </Button>
      </div>

      <div className="space-y-3">
        {(announcements || []).map((a) => (
          <div key={a.id} className="admin-glass-card rounded-xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Megaphone className="h-4 w-4 text-[#00D4FF]" />
                <h3 className="font-semibold text-white">{a.title}</h3>
                {a.target_user_id ? (
                  <Badge className="text-[10px] bg-violet-500/20 text-violet-300 border-violet-500/30 flex items-center gap-1">
                    <Store className="h-2.5 w-2.5" />
                    {getTargetLabel(a.target_user_id)}
                  </Badge>
                ) : (
                  <Badge className="text-[10px] bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20 flex items-center gap-1">
                    <Globe className="h-2.5 w-2.5" />
                    Toutes les boutiques
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">
                  {format(new Date(a.published_at), "dd MMM yyyy", { locale: fr })}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-slate-400 hover:bg-white/10 hover:text-[#00D4FF]"
                  title="Copier pour Facebook"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(
                        formatForFacebook({
                          title: a.title,
                          newFeatures: a.new_features,
                          changesFixes: a.changes_fixes,
                        })
                      );
                      toast.success("Copié — collez sur Facebook");
                    } catch {
                      toast.error("Impossible de copier");
                    }
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-red-400 hover:bg-red-500/10"
                  onClick={() => deleteAnnouncement.mutate(a.id)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            {a.new_features && (
              <div className="mb-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <Sparkles className="h-3 w-3 text-emerald-400" />
                  <span className="text-xs font-medium text-emerald-400">Nouvelles fonctionnalités</span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap pl-4">{a.new_features}</p>
              </div>
            )}
            {a.changes_fixes && (
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  <Bug className="h-3 w-3 text-amber-400" />
                  <span className="text-xs font-medium text-amber-400">Changements / Corrections</span>
                </div>
                <p className="text-sm text-slate-300 whitespace-pre-wrap pl-4">{a.changes_fixes}</p>
              </div>
            )}
          </div>
        ))}
        {(!announcements || announcements.length === 0) && (
          <p className="text-sm text-slate-500 text-center py-8">Aucune annonce publiée</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>Nouvelle note de mise à jour</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Titre</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="v2.1 - Améliorations majeures"
                className="bg-white/5 border-white/10 text-white"
              />
            </div>

            <div>
              <Label className="text-slate-300">Destinataire</Label>
              <Select value={targetUserId} onValueChange={setTargetUserId}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Choisir le destinataire" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-white/10">
                  <SelectItem value="broadcast" className="text-white focus:bg-white/10">
                    <div className="flex items-center gap-2">
                      <Globe className="h-3.5 w-3.5 text-[#00D4FF]" />
                      Toutes les boutiques
                    </div>
                  </SelectItem>
                  {owners.map((owner) => (
                    <SelectItem key={owner.user_id} value={owner.user_id} className="text-white focus:bg-white/10">
                      <div className="flex items-center gap-2">
                        <Store className="h-3.5 w-3.5 text-violet-400" />
                        {owner.shop_name}
                        <span className="text-slate-500 text-xs">@{owner.username}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Nouvelles fonctionnalités</Label>
              <Textarea
                value={newFeatures}
                onChange={(e) => setNewFeatures(e.target.value)}
                placeholder="- Nouvelle fonctionnalité A&#10;- Nouvelle fonctionnalité B"
                className="bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>
            <div>
              <Label className="text-slate-300">Changements / Corrections</Label>
              <Textarea
                value={changesFixes}
                onChange={(e) => setChangesFixes(e.target.value)}
                placeholder="- Correction du bug X&#10;- Amélioration de Y"
                className="bg-white/5 border-white/10 text-white min-h-[100px]"
              />
            </div>
            <Button
              onClick={handleSubmit}
              disabled={!title.trim() || createAnnouncement.isPending}
              className="w-full bg-[#00D4FF] text-slate-900 hover:bg-[#00D4FF]/80 font-semibold"
            >
              Publier l'annonce
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
