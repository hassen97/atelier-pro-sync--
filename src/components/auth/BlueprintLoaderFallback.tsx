import repairProLogo from "@/assets/repairpro-logo.png";

interface BlueprintLoaderFallbackProps {
  logoUrl?: string | null;
  message?: string;
}

/**
 * Lightweight, CSS-only loading screen. Renders instantly with zero heavy
 * dependencies. Used both as the immediate loader and as the graceful fallback
 * when WebGL is unavailable or the 3D bundle is slow to load.
 */
export function BlueprintLoaderFallback({
  logoUrl,
  message = "Préparation de votre atelier…",
}: BlueprintLoaderFallbackProps) {
  const src = logoUrl || repairProLogo;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-950 overflow-hidden">
      {/* Subtle grid */}
      <div className="absolute inset-0 auth-grid-bg opacity-30" />
      {/* Blue radial glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-[hsla(217,91%,50%,0.10)] blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-8">
        {/* Pulsing blueprint logo */}
        <div className="relative">
          {/* Expanding rings */}
          <span className="absolute inset-0 rounded-3xl border border-[hsla(217,91%,60%,0.4)] blueprint-ring" />
          <span className="absolute inset-0 rounded-3xl border border-[hsla(217,91%,60%,0.25)] blueprint-ring blueprint-ring-delay" />
          <div className="blueprint-logo-pulse rounded-3xl p-1">
            <img
              src={src}
              alt="Logo de la boutique"
              className="w-24 h-24 rounded-2xl object-contain"
              width={96}
              height={96}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)] blueprint-dot" />
            <span className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)] blueprint-dot blueprint-dot-2" />
            <span className="w-2 h-2 rounded-full bg-[hsl(217,91%,60%)] blueprint-dot blueprint-dot-3" />
          </div>
          <p className="text-zinc-400 text-sm tracking-wide">{message}</p>
        </div>
      </div>
    </div>
  );
}

export default BlueprintLoaderFallback;
