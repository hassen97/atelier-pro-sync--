import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import * as THREE from "three";
import repairProLogo from "@/assets/repairpro-logo.png";

interface BlueprintCanvasProps {
  logoUrl?: string | null;
}

/** Low-poly wireframe accent behind the logo — the "blueprint" vibe. */
function WireframeAccent() {
  const ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    ref.current.rotation.y = t * 0.25;
    ref.current.rotation.x = t * 0.12;
    const pulse = 1 + Math.sin(t * 1.5) * 0.04;
    ref.current.scale.setScalar(2.1 * pulse);
  });

  return (
    <mesh ref={ref}>
      {/* detail 0 = lowest poly (20 faces) for 60fps on cheap tablets */}
      <icosahedronGeometry args={[1, 0]} />
      <meshBasicMaterial
        color="#3B82F6"
        wireframe
        transparent
        opacity={0.35}
      />
    </mesh>
  );
}

/** The shop logo rendered as a glowing holographic disc (circle-masked). */
function LogoDisc({ src }: { src: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const texture = useTexture(src);

  // Keep aspect ratio of the source image
  const scale = useMemo<[number, number, number]>(() => {
    const img = (texture.image as HTMLImageElement | undefined);
    const aspect = img && img.width && img.height ? img.width / img.height : 1;
    const base = 1.9;
    return aspect >= 1 ? [base, base / aspect, 1] : [base * aspect, base, 1];
  }, [texture]);

  useFrame((state) => {
    if (!ref.current) return;
    const t = state.clock.elapsedTime;
    // subtle floating rotation
    ref.current.rotation.y = Math.sin(t * 0.6) * 0.35;
    ref.current.rotation.x = Math.sin(t * 0.4) * 0.12;
    // glowing pulse
    if (matRef.current) {
      matRef.current.opacity = 0.82 + Math.sin(t * 2) * 0.18;
    }
  });

  return (
    <mesh ref={ref} scale={scale}>
      {/* circle mask → square JPGs render as clean discs immediately */}
      <circleGeometry args={[1, 64]} />
      <meshStandardMaterial
        ref={matRef}
        map={texture}
        transparent
        toneMapped={false}
        depthWrite={false}
        side={THREE.DoubleSide}
        emissive="#3B82F6"
        emissiveMap={texture}
        emissiveIntensity={0.25}
      />
    </mesh>
  );
}

export function BlueprintCanvas({ logoUrl }: BlueprintCanvasProps) {
  // Render exactly ONE logo. When a custom logo exists, the default "R"
  // fallback is never mounted (prevents z-fighting from two stacked meshes).
  const hasCustomLogo = Boolean(logoUrl);
  const src = hasCustomLogo ? (logoUrl as string) : repairProLogo;

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[2, 2, 4]} intensity={0.8} />
      <WireframeAccent />
      <LogoDisc key={src} src={src} />
    </Canvas>
  );
}

export default BlueprintCanvas;
