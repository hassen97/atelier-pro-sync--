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

  // Enable the 3D canvas as soon as the loader shows (the bundle is preloaded
  // on the Auth page, so it's already cached). The CSS fallback stays underneath
  // as a seamless backdrop until the canvas paints. A tiny tick lets the overlay
  // mount first to avoid a flash.
  useEffect(() => {
    if (!visible) return;
    if (!isWebGLAvailable()) return;
    // Make sure the chunk is requested even if the page didn't preload it.
    preloadBlueprint();
    const t = setTimeout(() => setAllow3D(true), 50);
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
