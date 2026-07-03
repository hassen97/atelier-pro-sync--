import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Package, Lightbulb, ShoppingBag, Plus, Flag, MessageCircle,
  MapPin, Clock, Users, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  useCommunityPosts, useCreatePost, useReportPost, useStartConversation, PostType,
} from "@/hooks/useCommunity";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useAuth } from "@/contexts/AuthContext";

const POST_TYPES: { value: PostType; label: string; icon: React.ElementType; color: string }[] = [
  { value: "looking_for_part",  label: "Recherche Pièce",   icon: Search,      color: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  { value: "surplus_stock",     label: "Surplus Stock",     icon: Package,     color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  { value: "technical_advice",  label: "Conseil Technique", icon: Lightbulb,   color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
];

function PostTypeBadge({ type }: { type: PostType }) {
  const t = POST_TYPES.find((p) => p.value === type)!;
  const Icon = t.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${t.color}`}>
      <Icon className="h-3 w-3" />
      {t.label}
    </span>
  );
}

function CreatePostDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [type, setType] = useState<PostType>("looking_for_part");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { settings } = useShopSettingsContext();
  const createPost = useCreatePost();

  const handleSubmit = async () => {
    if (!title.trim()) return;
    await createPost.mutateAsync({
      type,
      title: title.trim(),
      body: body.trim() || undefined,
      shop_name: settings.shop_name,
      city: settings.address?.split(",").at(-1)?.trim() ?? settings.country,
    });
    setTitle("");
    setBody("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nouvelle Publication</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label>Type de publication</Label>
            <Select value={type} onValueChange={(v) => setType(v as PostType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {POST_TYPES.map((pt) => (
                  <SelectItem key={pt.value} value={pt.value}>{pt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Titre *</Label>
            <Input
              placeholder="Ex : Recherche écran iPhone 13 Pro Max..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Détails</Label>
            <Textarea
              placeholder="Décrivez votre besoin en détail (modèle exact, état, prix, etc.)"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              maxLength={1000}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Annuler</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || createPost.isPending}>
            {createPost.isPending ? "Publication..." : "Publier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Communaute() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<PostType | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);

  const { data, isLoading } = useCommunityPosts(filter, page);
  const reportPost = useReportPost();
  const startConversation = useStartConversation();

  const posts = data?.posts ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const filtered = search
    ? posts.filter((p) =>
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.body?.toLowerCase().includes(search.toLowerCase()) ||
        p.shop_name?.toLowerCase().includes(search.toLowerCase())
      )
    : posts;

  const handleContact = async (postUserId: string, postId: string) => {
    if (!user) return;
    const convId = await startConversation.mutateAsync({ recipientId: postUserId, postId });
    navigate(`/messages?id=${convId}`);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Entraide & Communauté
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Échangez pièces, conseils et astuces avec d'autres réparateurs
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle demande
        </Button>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans les publications..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            size="sm"
            variant={filter === null ? "default" : "outline"}
            onClick={() => { setFilter(null); setPage(0); }}
          >
            Tout
          </Button>
          {POST_TYPES.map((pt) => {
            const Icon = pt.icon;
            return (
              <Button
                key={pt.value}
                size="sm"
                variant={filter === pt.value ? "default" : "outline"}
                onClick={() => { setFilter(pt.value); setPage(0); }}
                className="gap-1.5"
              >
                <Icon className="h-3.5 w-3.5" />
                {pt.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Total */}
      {!search && (
        <p className="text-xs text-muted-foreground">
          {total} publication{total !== 1 ? "s" : ""} au total
        </p>
      )}

      {/* Posts Feed */}
      {isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/4 mb-3" />
              <div className="h-5 bg-muted rounded w-3/4 mb-2" />
              <div className="h-4 bg-muted rounded w-full mb-2" />
              <div className="h-4 bg-muted rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="font-semibold">Aucune publication pour l'instant</p>
            <p className="text-sm text-muted-foreground mt-1">Soyez le premier à partager une demande !</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Créer une publication
          </Button>
        </div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={`${filter}-${page}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {filtered.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <PostTypeBadge type={post.type} />
                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                    <Clock className="h-3 w-3" />
                    {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                  </span>
                </div>

                <h3 className="font-semibold text-sm leading-snug mb-1">{post.title}</h3>
                {post.body && (
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{post.body}</p>
                )}

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {post.shop_name && (
                      <span className="font-medium text-foreground">{post.shop_name}</span>
                    )}
                    {post.city && (
                      <span className="flex items-center gap-0.5">
                        <MapPin className="h-3 w-3" />
                        {post.city}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {post.user_id !== user?.id && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2 text-xs text-muted-foreground"
                          onClick={() => reportPost.mutate(post.id)}
                          disabled={reportPost.isPending}
                        >
                          <Flag className="h-3 w-3 mr-1" />
                          Signaler
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 text-xs gap-1.5"
                          onClick={() => handleContact(post.user_id, post.id)}
                          disabled={startConversation.isPending}
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Contacter
                        </Button>
                      </>
                    )}
                    {post.user_id === user?.id && (
                      <Badge variant="secondary" className="text-xs">Votre publication</Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {totalPages > 1 && !search && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page + 1} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <CreatePostDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
