import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Flag, Trash2, CheckCircle, Users, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useReportedPosts, useDeletePost, useDismissReport } from "@/hooks/useCommunity";

export function AdminCommunityView() {
  const { data: posts = [], isLoading } = useReportedPosts();
  const deletePost = useDeletePost();
  const dismiss = useDismissReport();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 animate-pulse">
            <div className="h-4 bg-white/10 rounded w-1/4 mb-3" />
            <div className="h-5 bg-white/10 rounded w-3/4 mb-2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-red-500/10">
          <Flag className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-white">Publications Signalées</h2>
          <p className="text-xs text-slate-500">Modération du contenu communautaire</p>
        </div>
        <span className="ml-auto px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20">
          {posts.length} signalement{posts.length !== 1 ? "s" : ""}
        </span>
      </div>

      {posts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center">
            <CheckCircle className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Aucun signalement en attente</p>
            <p className="text-xs text-slate-500 mt-1">La communauté est saine 🎉</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="rounded-xl border border-red-500/20 bg-red-500/5 p-4"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${
                    post.type === "looking_for_part"
                      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      : post.type === "surplus_stock"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {post.type === "looking_for_part" ? "Recherche Pièce" : post.type === "surplus_stock" ? "Surplus Stock" : "Conseil Technique"}
                  </span>
                  {post.shop_name && (
                    <span className="text-xs text-slate-400 font-medium">{post.shop_name}</span>
                  )}
                </div>
                <span className="text-xs text-slate-600 shrink-0">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                </span>
              </div>

              <p className="text-sm font-semibold text-white mb-1">{post.title}</p>
              {post.body && (
                <p className="text-xs text-slate-400 mb-3 line-clamp-3">{post.body}</p>
              )}

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                  onClick={() => dismiss.mutate(post.id)}
                  disabled={dismiss.isPending}
                >
                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                  Ignorer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => deletePost.mutate(post.id)}
                  disabled={deletePost.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1" />
                  Supprimer
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
