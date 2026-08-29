"use client";

import { useRef, type MutableRefObject } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The travelling macaron: two shells and a ganache disc, built from primitives.
 *
 * Rendered in its own small canvas rather than a full-page one. The canvas is
 * moved around the viewport with a CSS transform (compositor work) while only
 * the mesh spins inside it (GPU work on ~200x200 px). A full-viewport canvas
 * tracking the same path would cost fill rate across the whole screen for an
 * object occupying a fraction of it.
 */

const SHELL = "#F6C7CF";
const SHELL_DEEP = "#D99BA8";
const GANACHE = "#7A4A38";

function Macaron({ spin }: { spin: MutableRefObject<number> }) {
  const group = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    const g = group.current;
    if (!g) return;
    g.rotation.y += delta * 0.55;
    // Scroll drives the tumble; the constant Y spin keeps it alive when still.
    g.rotation.x = 0.5 + Math.sin(spin.current * Math.PI * 2) * 0.45;
    g.rotation.z = spin.current * Math.PI * 1.2;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 0.34, 0]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color={SHELL} roughness={0.55} />
      </mesh>
      <mesh position={[0, -0.34, 0]}>
        <sphereGeometry args={[1, 48, 32]} />
        <meshStandardMaterial color={SHELL_DEEP} roughness={0.6} />
      </mesh>
      {/* Filling. Slightly inset so the shells read as separate pieces. */}
      <mesh>
        <cylinderGeometry args={[0.94, 0.94, 0.42, 48]} />
        <meshStandardMaterial color={GANACHE} roughness={0.75} />
      </mesh>
    </group>
  );
}

export default function MacaronScene({ spin }: { spin: MutableRefObject<number> }) {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
      camera={{ position: [0, 0, 4.2], fov: 42 }}
      style={{ pointerEvents: "none" }}
    >
      <ambientLight intensity={0.85} />
      <directionalLight position={[3, 4, 5]} intensity={2.4} color="#FFFCF8" />
      <directionalLight position={[-3, -2, 2]} intensity={0.7} color="#A8455A" />
      <Macaron spin={spin} />
    </Canvas>
  );
}
