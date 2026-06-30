import { Component, ReactNode, Suspense, lazy, useEffect, useState } from "react";
import { BlueprintLoaderFallback } from "./BlueprintLoaderFallback";

// Heavy 3D libs load ONLY when this is rendered — never blocks the login form.
const BlueprintCanvas = lazy(() => import("./BlueprintCanvas"));

/**
 * Eagerly warm the 3D bundle so the holographic animation is ready on the
 * FIRST login (otherwise the chunk only finishes downloading after navigation,
 * making the 3D appear only on the second login). Best-effort, never blocks.
 */
let preloadStarted = false;
export function preloadBlueprint() {
  if (preloadStarted) return;
  preloadStarted = true;
  import("./BlueprintCanvas").catch(() => {
    // allow a later retry if the first attempt failed (e.g. offline)
    preloadStarted = false;
  });
}

interface BlueprintLoaderProps {
  visible: boolean;
  logoUrl?: string | null;
  message?: string;
}

/** Detect WebGL support without throwing. */
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

/** Silently fall back to the CSS loader if anything in the 3D tree throws. */
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

export function BlueprintLoader({ visible, logoUrl, message }: BlueprintLoaderProps) {
  const [allow3D, setAllow3D] = useState(false);
  const [mounted, setMounted] = useState(visible);

  // Keep mounted briefly while fading out
  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else {
      const t = setTimeout(() => setMounted(false), 400);
      return () => clearTimeout(t);
    }
  }, [visible]);

  // Only enable the 3D canvas if WebGL works AND we've waited a beat (500ms),
  // so a slow bundle never delays the perceived loader — the CSS one is instant.
  useEffect(() => {
    if (!visible) return;
    if (!isWebGLAvailable()) return;
    const t = setTimeout(() => setAllow3D(true), 500);
    return () => clearTimeout(t);
  }, [visible]);

  if (!mounted) return null;

  const fallback = <BlueprintLoaderFallback logoUrl={logoUrl} message={message} />;

  return (
    <div
      className={`fixed inset-0 z-[100] transition-opacity duration-400 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-live="polite"
      aria-busy="true"
    >
      {/* CSS fallback is always underneath → seamless swap, never a blank frame */}
      {fallback}

      {allow3D && (
        <div className="absolute inset-0 animate-fade-in">
          <CanvasErrorBoundary fallback={null}>
            <Suspense fallback={null}>
              <BlueprintCanvas logoUrl={logoUrl} />
            </Suspense>
          </CanvasErrorBoundary>
        </div>
      )}
    </div>
  );
}

export default BlueprintLoader;
