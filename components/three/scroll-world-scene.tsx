"use client";

import { useMemo, useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Scroll-driven camera flight through a procedural bakery world.
 *
 * This is the scroll-world concept (scroll drives a camera through a scene)
 * rendered procedurally instead of scrubbed from pre-rendered video. The
 * upstream skill needs paid clip generation (Monid / Higgsfield) and ships
 * MP4s to the client; this ships geometry, which matters on the mobile
 * networks this bakery's customers are actually on.
 *
 * Scroll progress arrives through a ref, never React state. State would
 * re-render the tree on every scroll frame and collapse the frame budget.
 */

const BLUSH = "#F6C7CF";
const BERRY = "#A8455A";
const AMBER = "#E8AF7C";
const CREAM = "#FAF6F1";
const COCOA = "#2E211B";

type Progress = MutableRefObject<number>;

/** Deterministic pseudo-random so server and client agree and layout is stable. */
function rand(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

type Item = {
  kind: "macaron" | "cherry" | "slice" | "crumb";
  pos: [number, number, number];
  rot: [number, number, number];
  scale: number;
  color: string;
  spin: number;
};

/** Lay objects along a corridor the camera flies down. */
function useWorld(count = 46): Item[] {
  return useMemo(() => {
    const kinds: Item["kind"][] = ["macaron", "cherry", "slice", "crumb"];
    const colors = [BLUSH, BERRY, AMBER, CREAM];
    return Array.from({ length: count }, (_, i) => {
      const r = (n: number) => rand(i * 7.3 + n);
      // Push objects away from the centre line so the camera has a clear path.
      const side = r(1) > 0.5 ? 1 : -1;
      const x = side * (1.6 + r(2) * 4.2);
      const y = (r(3) - 0.5) * 5.2;
      const z = -i * 2.1 - r(4) * 1.4;
      return {
        kind: kinds[Math.floor(r(5) * kinds.length)],
        pos: [x, y, z],
        rot: [r(6) * Math.PI, r(7) * Math.PI, r(8) * Math.PI],
        scale: 0.35 + r(9) * 0.75,
        color: colors[Math.floor(r(10) * colors.length)],
        spin: (r(11) - 0.5) * 0.5,
      };
    });
  }, [count]);
}

function WorldItem({ item }: { item: Item }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * item.spin;
  });

  const geometry = useMemo(() => {
    switch (item.kind) {
      case "macaron":
        return <torusGeometry args={[0.6, 0.26, 24, 64]} />;
      case "cherry":
        return <sphereGeometry args={[0.42, 32, 32]} />;
      case "slice":
        return <boxGeometry args={[0.8, 0.55, 0.8]} />;
      default:
        return <dodecahedronGeometry args={[0.22, 0]} />;
    }
  }, [item.kind]);

  return (
    <mesh ref={ref} position={item.pos} rotation={item.rot} scale={item.scale}>
      {geometry}
      <meshStandardMaterial
        color={item.color}
        roughness={0.35}
        metalness={0.05}
        emissive={item.color}
        emissiveIntensity={0.06}
      />
    </mesh>
  );
}

/** The one glass object, kept singular so transmission is paid for once. */
function GlassAnchor({ progress }: { progress: Progress }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.3;
    ref.current.rotation.x = 0.3 + progress.current * 0.8;
  });
  return (
    <mesh ref={ref} position={[0, 0, -46]} scale={2.6}>
      <torusGeometry args={[1, 0.36, 48, 128]} />
      <meshPhysicalMaterial
        transmission={1}
        thickness={1.2}
        roughness={0.12}
        ior={1.45}
        iridescence={0.4}
        color={BLUSH}
        attenuationColor={BERRY}
        attenuationDistance={2}
      />
    </mesh>
  );
}

function Rig({ progress }: { progress: Progress }) {
  const world = useWorld();

  useFrame((state) => {
    const p = progress.current;
    const cam = state.camera;
    // Fly down the corridor. Slight sway so it reads as a camera, not a slider.
    cam.position.z = 6 - p * 52;
    cam.position.x = Math.sin(p * Math.PI * 2) * 0.9;
    cam.position.y = Math.cos(p * Math.PI * 1.4) * 0.55;
    cam.lookAt(0, 0, cam.position.z - 8);
  });

  return (
    <>
      <fog attach="fog" args={[COCOA, 8, 34]} />
      <ambientLight intensity={0.75} />
      <directionalLight position={[4, 6, 4]} intensity={1.6} color="#FFFCF8" />
      <pointLight position={[-5, 2, -12]} intensity={40} distance={26} color={BERRY} />
      <pointLight position={[5, -2, -28]} intensity={40} distance={26} color={AMBER} />
      {world.map((item, i) => (
        <WorldItem key={i} item={item} />
      ))}
      <GlassAnchor progress={progress} />
    </>
  );
}

export default function ScrollWorldScene({ progress }: { progress: Progress }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: false }}
      camera={{ position: [0, 0, 6], fov: 55 }}
      style={{ pointerEvents: "none" }}
      onCreated={({ gl }) => gl.setClearColor(COCOA)}
    >
      <Rig progress={progress} />
    </Canvas>
  );
}
