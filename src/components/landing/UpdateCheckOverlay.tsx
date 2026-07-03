import {
  Component,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useState,
} from "react";
import { Check, RefreshCw, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UpdateState } from "./UpdateCheckCanvas";

const UpdateCheckCanvas = lazy(() => import("./UpdateCheckCanvas"));

interface UpdateCheckOverlayProps {
  state: UpdateState;
  onRefresh: () => void;
}

const COPY: Record<
  UpdateState,
  { title: string; subtitle: string; tint: string }
> = {
  checking: {
    title: "Vérification de la dernière version…",
    subtitle: "Nous nous assurons que vous utilisez la version la plus récente.",
    tint: "hsl(217 91% 60%)",
  },
  current: {
    title: "Vous êtes à jour ✓",
    subtitle: "Vous utilisez déjà la dernière version. Chargement en cours…",
    tint: "hsl(160 84% 39%)",
  },
  update: {
    title: "Nouvelle version disponible",
    subtitle:
      "Une mise à jour est prête. Rafraîchissez pour vider les données en cache et charger la dernière version.",
    tint: "hsl(38 92% 50%)",
  },
};

function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Silent fallback to the CSS scene if the 3D tree throws. */
class CanvasErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/** Lightweight CSS-only equivalent (reduced motion / no WebGL / 3D failure). */
function CssScene({ state }: { state: UpdateState }) {
  const tint = COPY[state].tint;
  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      <span
        className="absolute inset-0 rounded-full blur-2xl opacity-40"
        style={{ background: tint }}
      />
      <span
        className="absolute inset-2 rounded-full border-2 opacity-60 animate-ping"
        style={{ borderColor: tint, animationDuration: "1.8s" }}
      />
      <div
        className="relative flex items-center justify-center w-24 h-24 rounded-full"
        style={{
          background: `radial-gradient(circle at 35% 30%, ${tint}, transparent 70%)`,
          boxShadow: `0 0 40px ${tint}`,
        }}
      >
        {state === "checking" && (
          <Loader2 className="h-9 w-9 text-white animate-spin" />
        )}
        {state === "current" && (
          <Check className="h-10 w-10 text-white animate-scale-in" />
        )}
        {state === "update" && (
          <RefreshCw className="h-9 w-9 text-white animate-spin" style={{ animationDuration: "2.4s" }} />
        )}
      </div>
    </div>
  );
}

export function UpdateCheckOverlay({ state, onRefresh }: UpdateCheckOverlayProps) {
  const [use3D, setUse3D] = useState(false);
  const copy = COPY[state];

  useEffect(() => {
    if (prefersReducedMotion() || !isWebGLAvailable()) return;
    const t = setTimeout(() => setUse3D(true), 30);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-zinc-950"
      aria-live="polite"
      aria-busy={state === "checking"}
      role="status"
    >
      {/* radial glow backdrop */}
      <div
        className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 transition-colors duration-700"
        style={{ background: copy.tint }}
      />

      <div className="relative z-10 flex flex-col items-center gap-2 px-6 text-center">
        {/* scene */}
        <div className="relative h-64 w-64">
          <div className="absolute inset-0 flex items-center justify-center">
            <CssScene state={state} />
          </div>
          {use3D && (
            <div className="absolute inset-0 animate-fade-in">
              <CanvasErrorBoundary fallback={null}>
                <Suspense fallback={null}>
                  <UpdateCheckCanvas state={state} />
                </Suspense>
              </CanvasErrorBoundary>
            </div>
          )}
        </div>

        <h1 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
          {copy.title}
        </h1>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          {copy.subtitle}
        </p>

        {state === "update" && (
          <div className="mt-5 flex flex-col items-center gap-3">
            <Button
              size="lg"
              onClick={onRefresh}
              className="rounded-full px-7 font-medium text-white"
              style={{
                background:
                  "linear-gradient(135deg, hsl(38 92% 52%), hsl(32 95% 44%))",
                boxShadow: "0 8px 30px hsla(38, 92%, 50%, 0.35)",
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Rafraîchir maintenant
            </Button>
            <span className="flex items-center gap-1.5 text-xs text-zinc-500">
              <AlertCircle className="h-3.5 w-3.5" />
              Requis pour charger la dernière version
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default UpdateCheckOverlay;
