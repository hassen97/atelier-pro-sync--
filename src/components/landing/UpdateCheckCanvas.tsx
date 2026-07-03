import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

export type UpdateState = "checking" | "current" | "update";

interface UpdateCheckCanvasProps {
  state: UpdateState;
}

const COLORS: Record<UpdateState, string> = {
  checking: "#3B82F6", // brand blue
  current: "#10B981", // emerald
  update: "#F59E0B", // amber
};

/** Smoothly ease a THREE.Color toward a target hex. */
function approachColor(color: THREE.Color, hex: string, t: number) {
  color.lerp(new THREE.Color(hex), t);
}

/** Central orb — breathes while checking, settles when resolved. */
function Orb({ state }: { state: UpdateState }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((s, delta) => {
    const mesh = ref.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const t = s.clock.elapsedTime;

    // Rotation: lively while checking, calmer once resolved.
    const spin = state === "checking" ? 0.5 : state === "update" ? 0.3 : 0.12;
    mesh.rotation.y += delta * spin;
    mesh.rotation.x = Math.sin(t * 0.4) * 0.15;

    // Breathing scale.
    const amp = state === "checking" ? 0.06 : 0.03;
    const speed = state === "update" ? 2.4 : 1.6;
    const pulse = 1 + Math.sin(t * speed) * amp;
    // When resolved as "current", shrink a touch so the checkmark reads clearly.
    const base = state === "current" ? 0.82 : 1;
    mesh.scale.setScalar(base * pulse);

    // Animate color + glow toward the state color.
    approachColor(mat.color, COLORS[state], 0.06);
    approachColor(mat.emissive, COLORS[state], 0.06);
    const targetGlow = state === "checking" ? 0.5 : 0.7;
    mat.emissiveIntensity += (targetGlow - mat.emissiveIntensity) * 0.06;
  });

  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[1, 4]} />
      <meshStandardMaterial
        ref={matRef}
        color={COLORS.checking}
        emissive={COLORS.checking}
        emissiveIntensity={0.5}
        roughness={0.25}
        metalness={0.4}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Faint wireframe halo around the orb for a "scanning" feel. */
function Halo({ state }: { state: UpdateState }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((s, delta) => {
    if (!ref.current || !matRef.current) return;
    ref.current.rotation.y -= delta * 0.35;
    ref.current.rotation.z += delta * 0.1;
    approachColor(matRef.current.color, COLORS[state], 0.06);
    const t = s.clock.elapsedTime;
    matRef.current.opacity = 0.18 + Math.sin(t * 1.5) * 0.07;
  });

  return (
    <mesh ref={ref} scale={1.55}>
      <icosahedronGeometry args={[1, 1]} />
      <meshBasicMaterial
        ref={matRef}
        color={COLORS.checking}
        wireframe
        transparent
        opacity={0.2}
      />
    </mesh>
  );
}

/** A 3D checkmark that draws/scales in when the app is up to date. */
function CheckMark({ visible }: { visible: boolean }) {
  const group = useRef<THREE.Group>(null);

  // Two beams forming a tick, centered on the orb.
  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    const target = visible ? 1 : 0;
    const current = g.scale.x;
    const next = current + (target - current) * Math.min(1, delta * 6);
    g.scale.setScalar(next);
    g.rotation.z = -0.15;
  });

  return (
    <group ref={group} scale={0} position={[0, 0, 1.05]}>
      <mesh position={[-0.28, -0.12, 0]} rotation={[0, 0, Math.PI / 4]}>
        <boxGeometry args={[0.18, 0.45, 0.12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
      <mesh position={[0.12, 0.04, 0]} rotation={[0, 0, -Math.PI / 4]}>
        <boxGeometry args={[0.18, 0.85, 0.12]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive="#ffffff"
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

/** Single expanding-and-fading ring burst — fires on the "current" beat. */
function RingBurst({ active, color }: { active: boolean; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const startRef = useRef<number | null>(null);

  useFrame((s) => {
    if (!ref.current || !matRef.current) return;
    if (!active) {
      startRef.current = null;
      matRef.current.opacity = 0;
      return;
    }
    if (startRef.current === null) startRef.current = s.clock.elapsedTime;
    const age = (s.clock.elapsedTime - startRef.current) % 1.8;
    const scale = 1.2 + age * 2.2;
    ref.current.scale.setScalar(scale);
    matRef.current.opacity = Math.max(0, 0.6 - age * 0.4);
  });

  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[0.96, 1, 64]} />
      <meshBasicMaterial
        ref={matRef}
        color={color}
        transparent
        opacity={0}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Two concentric counter-rotating sync rings — the "update available" cue. */
function SyncRings({ active }: { active: boolean }) {
  const outer = useRef<THREE.Mesh>(null);
  const inner = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  useFrame((s, delta) => {
    const g = groupRef.current;
    if (g) {
      const target = active ? 1 : 0;
      const next = g.scale.x + (target - g.scale.x) * Math.min(1, delta * 6);
      g.scale.setScalar(next);
    }
    if (outer.current) outer.current.rotation.z += delta * 1.2;
    if (inner.current) inner.current.rotation.z -= delta * 1.8;
    const t = s.clock.elapsedTime;
    const pulse = 1 + Math.sin(t * 3) * 0.05;
    if (outer.current) outer.current.scale.setScalar(pulse);
  });

  const color = COLORS.update;
  return (
    <group ref={groupRef} scale={0} rotation={[Math.PI / 2.1, 0, 0]}>
      <mesh ref={outer}>
        <torusGeometry args={[1.7, 0.035, 16, 96, Math.PI * 1.5]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          toneMapped={false}
        />
      </mesh>
      <mesh ref={inner}>
        <torusGeometry args={[1.45, 0.03, 16, 96, Math.PI * 1.3]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.6}
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function UpdateCheckCanvas({ state }: UpdateCheckCanvasProps) {
  const glColor = useMemo(() => new THREE.Color("#09090b"), []);
  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{ position: [0, 0, 5], fov: 50 }}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      style={{ background: "transparent" }}
      onCreated={({ gl }) => gl.setClearColor(glColor, 0)}
    >
      <ambientLight intensity={1} />
      <directionalLight position={[2, 3, 4]} intensity={1.1} />
      <pointLight position={[-3, -2, 2]} intensity={0.6} color="#3B82F6" />
      <Halo state={state} />
      <Orb state={state} />
      <CheckMark visible={state === "current"} />
      <RingBurst active={state === "current"} color={COLORS.current} />
      <SyncRings active={state === "update"} />
    </Canvas>
  );
}

export default UpdateCheckCanvas;
