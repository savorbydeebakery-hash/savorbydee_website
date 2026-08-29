"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, type ThreeElements } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The hero's glass centrepiece: a slowly turning torus in a transmissive
 * material, sitting behind the collage.
 *
 * WHY A BACKDROP PLANE: MeshPhysicalMaterial `transmission` refracts what is
 * behind it IN THE 3D SCENE, not the HTML underneath the canvas. With a
 * transparent canvas and nothing behind the mesh, the glass would render
 * almost invisible. The gradient plane gives it something real to bend, and it
 * is generated on a 2D canvas so there is no HDR/CDN dependency.
 *
 * ISOLATION: this is a leaf. GSAP drives the rest of the hero; three.js owns
 * its own frame loop and the two must never share a component tree.
 */

const BRAND = {
  berry: "#A8455A",
  blush: "#F6C7CF",
  amber: "#E8AF7C",
  cocoa: "#2E211B",
};

/** Vertical brand gradient as a texture, drawn once. */
function useGradientTexture() {
  return useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 16;
    c.height = 256;
    const ctx = c.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, BRAND.berry);
    g.addColorStop(0.45, BRAND.blush);
    g.addColorStop(1, BRAND.cocoa);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 16, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, []);
}

function GlassTorus(props: ThreeElements["mesh"]) {
  const ref = useRef<THREE.Mesh>(null);
  const pointer = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    const mesh = ref.current;
    if (!mesh) return;
    // Constant slow turn reads as "object", not "animation".
    mesh.rotation.y += delta * 0.28;
    mesh.rotation.z += delta * 0.06;
    // Pointer lean, damped so it never snaps.
    pointer.current.x += (state.pointer.x * 0.25 - pointer.current.x) * 0.05;
    pointer.current.y += (state.pointer.y * 0.2 - pointer.current.y) * 0.05;
    mesh.rotation.x = 0.42 + pointer.current.y;
    mesh.position.x = pointer.current.x * 0.35;
  });

  return (
    <mesh ref={ref} {...props}>
      <torusGeometry args={[1.15, 0.42, 64, 160]} />
      <meshPhysicalMaterial
        transmission={1}
        thickness={1.4}
        roughness={0.12}
        ior={1.45}
        iridescence={0.5}
        iridescenceIOR={1.3}
        clearcoat={1}
        clearcoatRoughness={0.15}
        color={BRAND.blush}
        attenuationColor={BRAND.berry}
        attenuationDistance={2.4}
      />
    </mesh>
  );
}

function Scene() {
  const gradient = useGradientTexture();
  return (
    <>
      {/* Backdrop the glass actually refracts. Sits behind the torus. */}
      <mesh position={[0, 0, -2.6]} scale={[9, 9, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={gradient} toneMapped={false} />
      </mesh>

      <ambientLight intensity={0.6} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#FFFCF8" />
      <pointLight position={[-3, -1, 2]} intensity={12} color={BRAND.berry} />
      <pointLight position={[3, 2, -1]} intensity={8} color={BRAND.amber} />

      <GlassTorus />
    </>
  );
}

export default function HeroGlassScene() {
  return (
    <Canvas
      // dpr capped: transmission renders the scene twice, so pixel count is
      // the dominant cost here.
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 5], fov: 42 }}
      style={{ pointerEvents: "none" }}
    >
      <Scene />
    </Canvas>
  );
}
