import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface RouteErrorBoundaryProps {
  children: ReactNode;
}

interface RouteErrorBoundaryState {
  hasError: boolean;
  isChunkError: boolean;
}

/** Detect dynamic-import / stale-chunk failures. */
function looksLikeChunkError(error: unknown): boolean {
  const msg = error instanceof Error ? `${error.name} ${error.message}` : String(error);
  return /ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch|import\(\)/i.test(
    msg,
  );
}

/**
 * Catches render + lazy-chunk-load errors anywhere in the routed tree and shows
 * a recoverable fallback instead of a blank white screen.
 */
export class RouteErrorBoundary extends Component<
  RouteErrorBoundaryProps,
  RouteErrorBoundaryState
> {
  state: RouteErrorBoundaryState = { hasError: false, isChunkError: false };

  static getDerivedStateFromError(error: unknown): RouteErrorBoundaryState {
    return { hasError: true, isChunkError: looksLikeChunkError(error) };
  }

  componentDidCatch(error: unknown) {
    // Preserve the stack for debugging.
    // eslint-disable-next-line no-console
    console.error("[RouteErrorBoundary]", error);
  }

  private handleReload = () => {
    // Clear the retry guard so lazyWithRetry can attempt a fresh reload cycle.
    try {
      sessionStorage.removeItem("chunk_reload");
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="flex max-w-sm flex-col items-center gap-4 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <div className="space-y-1">
            <h1 className="text-lg font-semibold text-foreground">
              {this.state.isChunkError
                ? "Mise à jour disponible"
                : "Une erreur est survenue"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {this.state.isChunkError
                ? "Le chargement de cette page a échoué (cache obsolète ou réseau). Rechargez pour continuer."
                : "Cette page n'a pas pu s'afficher. Rechargez pour réessayer."}
            </p>
          </div>
          <Button onClick={this.handleReload}>Recharger</Button>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;
