import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useConversations, useMessages, useSendMessage } from "@/hooks/useCommunity";
import { useAuth } from "@/contexts/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Messages() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("id"));
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading: convLoading } = useConversations();
  const { data: messages = [], isLoading: msgLoading } = useMessages(activeConvId);
  const sendMessage = useSendMessage();

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Sync URL param to state
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) setActiveConvId(id);
  }, [searchParams]);

  const handleSend = async () => {
    if (!input.trim() || !activeConvId) return;
    const text = input.trim();
    setInput("");
    await sendMessage.mutateAsync({ conversationId: activeConvId, body: text });
  };

  const handleSelectConv = (id: string) => {
    setActiveConvId(id);
    navigate(`/messages?id=${id}`, { replace: true });
  };

  // Mobile: show only chat pane when conv is selected
  const showList = !isMobile || !activeConvId;
  const showChat = !isMobile || !!activeConvId;

  return (
    <div className="flex h-[calc(100vh-8rem)] rounded-xl border border-border overflow-hidden bg-card">
      {/* Conversation List */}
      {showList && (
        <div className={cn("flex flex-col border-r border-border", isMobile ? "w-full" : "w-72 shrink-0")}>
          {/* Header */}
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" />
              Messages
            </h2>
          </div>

          {/* List */}
          <ScrollArea className="flex-1">
            {convLoading ? (
              <div className="p-3 space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex gap-3 p-2 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : conversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-3">
                <Users className="h-8 w-8 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Aucune conversation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contactez une boutique depuis la page Entraide
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => navigate("/communaute")}>
                  Aller à l'Entraide
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-0.5">
                {conversations.map((conv) => {
                  const isActive = conv.id === activeConvId;
                  const name = conv.other_shop_name ?? "Boutique";
                  return (
                    <button
                      key={conv.id}
                      onClick={() => handleSelectConv(conv.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors",
                        isActive ? "bg-primary/10" : "hover:bg-muted/50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-bold shrink-0">
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("text-sm font-medium truncate", isActive && "text-primary")}>
                            {name}
                          </span>
                          {conv.unread_count! > 0 && (
                            <span className="bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-medium">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {conv.last_message || "Démarrez la conversation"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </div>
      )}

      {/* Chat Pane */}
      {showChat && (
        <div className="flex-1 flex flex-col min-w-0">
          {!activeConvId ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="font-semibold">Sélectionnez une conversation</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Choisissez une conversation dans la liste ou contactez une boutique depuis l'Entraide
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="flex items-center gap-3 p-4 border-b border-border">
                {isMobile && (
                  <Button variant="ghost" size="icon" onClick={() => setActiveConvId(null)} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                )}
                {activeConv && (
                  <>
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground text-sm font-bold">
                      {getInitials(activeConv.other_shop_name ?? "B")}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{activeConv.other_shop_name ?? "Boutique"}</p>
                      <p className="text-xs text-muted-foreground">Via Entraide</p>
                    </div>
                  </>
                )}
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                {msgLoading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className={cn("flex", i % 2 === 0 ? "justify-start" : "justify-end")}>
                        <div className="h-10 bg-muted rounded-2xl animate-pulse" style={{ width: `${120 + Math.random() * 160}px` }} />
                      </div>
                    ))}
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-sm text-muted-foreground">Démarrez la conversation !</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {messages.map((msg, idx) => {
                      const isOwn = msg.sender_id === user?.id;
                      const showTime =
                        idx === 0 ||
                        new Date(msg.created_at).getTime() -
                          new Date(messages[idx - 1].created_at).getTime() >
                          5 * 60 * 1000;
                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <p className="text-center text-xs text-muted-foreground my-3">
                              {format(new Date(msg.created_at), "dd MMM HH:mm", { locale: fr })}
                            </p>
                          )}
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.15 }}
                            className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                          >
                            <div
                              className={cn(
                                "max-w-[75%] px-3.5 py-2 rounded-2xl text-sm leading-relaxed",
                                isOwn
                                  ? "bg-primary text-primary-foreground rounded-br-sm"
                                  : "bg-muted rounded-bl-sm"
                              )}
                            >
                              {msg.body}
                            </div>
                          </motion.div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-3 border-t border-border">
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                >
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Écrire un message..."
                    className="flex-1"
                    autoFocus
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || sendMessage.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
