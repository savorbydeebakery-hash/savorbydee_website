"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The three bakery items from the reference, built as real geometry.
 *
 * Photoreal pastry is not achievable from primitives, so these are stylised
 * rather than pretending: correct silhouette, warm baked palette, soft
 * lighting. Silhouette is what makes a croissant read as a croissant, so each
 * shape is swept along a hand-defined curve rather than assembled from blobs.
 *
 *   croissant  tapered tube along a crescent arc, tips curled inward
 *   loaf       lathed ellipsoid with scored slashes laid on top
 *   danish     tapered tube along a flat spiral
 *
 * Every item floats, turns slowly, and leans toward the pointer.
 */

const CRUST = "#C98A3E";
const CRUST_DEEP = "#9A6127";
const CRUMB = "#F2D9A8";
const GLAZE = "#D9A566";

/** Radius profile so tubes taper at both tips instead of ending as cylinders. */
function taper(t: number, max: number, sharpness = 1) {
  return max * Math.pow(Math.sin(Math.PI * t), 0.55 * sharpness);
}

function Croissant({ hover }: { hover: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    // Crescent: an arc that curls in harder at the ends than a plain circle.
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 64; i++) {
      const t = i / 64;
      const a = Math.PI * (0.18 + t * 1.5);
      const curl = 1 - Math.pow(Math.abs(t - 0.5) * 2, 2) * 0.32;
      pts.push(new THREE.Vector3(Math.cos(a) * 1.5 * curl, Math.sin(a) * 1.05 * curl, 0));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 128, 1, 20, false);

    // Taper the tube radius per ring, which TubeGeometry cannot do directly.
    const pos = g.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= 128; i++) {
      const t = i / 128;
      const r = taper(t, 0.42, 1.15);
      const centre = curve.getPointAt(t);
      for (let j = 0; j <= 20; j++) {
        const idx = i * 21 + j;
        tmp.fromBufferAttribute(pos, idx).sub(centre).setLength(r).add(centre);
        // Two frequencies: fine flutes around the tube, plus a slower bulge
        // ALONG it so the croissant has visible segments rather than being one
        // smooth banana.
        const flute =
          1 +
          Math.sin((j / 21) * Math.PI * 2 * 7) * 0.04 +
          Math.sin(t * Math.PI * 2 * 5) * 0.075;
        tmp.sub(centre).multiplyScalar(flute).add(centre);
        pos.setXYZ(idx, tmp.x, tmp.y, tmp.z);
      }
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.z += delta * 0.16;
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.35 + hover.current * 0.4;
    g.position.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.09;
  });

  return (
    <group ref={ref} position={[1.55, 0.55, 0]} rotation={[0.2, 0, -0.5]} scale={0.86}>
      <mesh geometry={geo} castShadow>
        <meshStandardMaterial color={CRUST} roughness={0.62} metalness={0.02} />
      </mesh>
    </group>
  );
}

function Loaf({ hover }: { hover: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);

  const body = useMemo(() => {
    // A batard is fat through the middle with BLUNT ends. Plain sin() lathes to
    // a pointed spindle, which is what made this read as an almond. Raising the
    // exponent flattens the shoulders and rounds the tips.
    const profile: THREE.Vector2[] = [];
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      const r = Math.pow(Math.sin(t * Math.PI), 0.42) * 0.72;
      profile.push(new THREE.Vector2(r, t * 2.1 - 1.05));
    }
    return new THREE.LatheGeometry(profile, 56);
  }, []);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    void delta;
    // Rock, do not spin. A full Y rotation turned the scored top away from the
    // camera for half of every cycle, which is why it read as a bare egg.
    g.rotation.y = Math.sin(state.clock.elapsedTime * 0.28) * 0.5 + hover.current * 0.45;
    g.rotation.z = -0.4 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    g.position.y = 0.75 + Math.sin(state.clock.elapsedTime * 0.6 + 1) * 0.08;
  });

  return (
    <group ref={ref} position={[-1.5, 0.75, -0.3]} rotation={[0, 0, -0.4]} scale={0.72}>
      <mesh geometry={body}>
        <meshStandardMaterial color={GLAZE} roughness={0.7} />
      </mesh>
      {/* Scored slashes. z is derived from the SAME profile the lathe uses, so
          each cut sits on the crust instead of floating inside it, which is
          what made the loaf look like a bare egg. */}
      {[-0.52, -0.17, 0.18, 0.53].map((y, i) => {
        const t = (y + 1.05) / 2.1;
        const r = Math.pow(Math.sin(t * Math.PI), 0.42) * 0.72;
        const len = 0.34 * Math.pow(Math.sin(t * Math.PI), 0.3);
        return (
          <mesh
            key={i}
            position={[0, y, r * 0.94]}
            rotation={[0, 0, 0.68]}
            scale={[len, 0.055, 0.055]}
          >
            <capsuleGeometry args={[1, 1.4, 4, 10]} />
            <meshStandardMaterial color={CRUMB} roughness={0.95} />
          </mesh>
        );
      })}
      {/* Flour dusting: a slightly larger, lighter shell breaks the plastic
          look of a single smooth material. */}
      <mesh geometry={body} scale={1.012}>
        <meshStandardMaterial
          color={CRUMB}
          roughness={1}
          transparent
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function Danish({ hover }: { hover: React.RefObject<number> }) {
  const ref = useRef<THREE.Group>(null);

  const geo = useMemo(() => {
    // Flat spiral, swept as a tapering tube: a rolled pastry seen face on.
    const pts: THREE.Vector3[] = [];
    const turns = 2.6;
    for (let i = 0; i <= 140; i++) {
      const t = i / 140;
      const a = t * Math.PI * 2 * turns;
      const r = 0.18 + t * 1.05;
      pts.push(new THREE.Vector3(Math.cos(a) * r, Math.sin(a) * r, Math.sin(t * Math.PI) * 0.12));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const g = new THREE.TubeGeometry(curve, 220, 1, 14, false);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i <= 220; i++) {
      const t = i / 220;
      const r = 0.16 + t * 0.1;
      const centre = curve.getPointAt(t);
      for (let j = 0; j <= 14; j++) {
        const idx = i * 15 + j;
        tmp.fromBufferAttribute(pos, idx).sub(centre).setLength(r).add(centre);
        pos.setXYZ(idx, tmp.x, tmp.y, tmp.z);
      }
    }
    g.computeVertexNormals();
    return g;
  }, []);

  useFrame((state, delta) => {
    const g = ref.current;
    if (!g) return;
    g.rotation.z -= delta * 0.2;
    g.rotation.x = 0.95 + Math.sin(state.clock.elapsedTime * 0.45) * 0.08 - hover.current * 0.25;
    g.position.y = -1.6 + Math.sin(state.clock.elapsedTime * 0.8 + 2) * 0.07;
  });

  return (
    <group ref={ref} position={[-0.35, -1.6, 0.35]} rotation={[0.95, 0, 0]} scale={0.86}>
      <mesh geometry={geo}>
        <meshStandardMaterial color={CRUST} roughness={0.58} />
      </mesh>
      {/* Raisins tucked into the spiral. */}
      {Array.from({ length: 9 }, (_, i) => {
        const t = 0.25 + (i / 9) * 0.7;
        const a = t * Math.PI * 2 * 2.6;
        const r = 0.18 + t * 1.05;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0.2]} scale={0.075}>
            <sphereGeometry args={[1, 12, 10]} />
            <meshStandardMaterial color={CRUST_DEEP} roughness={0.5} />
          </mesh>
        );
      })}
    </group>
  );
}

/** Loose crumbs, as in the reference. */
function Crumbs() {
  const pts = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const r = (n: number) => {
          const x = Math.sin((i + 1) * n * 12.9898) * 43758.5453;
          return x - Math.floor(x);
        };
        return {
          p: [(r(1) - 0.5) * 5.4, (r(2) - 0.5) * 4.6, (r(3) - 0.5) * 1.2] as [number, number, number],
          s: 0.022 + r(4) * 0.05,
        };
      }),
    []
  );
  return (
    <group>
      {pts.map((c, i) => (
        <mesh key={i} position={c.p} scale={c.s} rotation={[i, i * 2, i * 3]}>
          <dodecahedronGeometry args={[1, 0]} />
          <meshStandardMaterial color={i % 3 === 0 ? CRUMB : GLAZE} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

function Rig() {
  const hover = useRef(0);
  useFrame((state) => {
    hover.current += (state.pointer.x - hover.current) * 0.045;
  });
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[4, 5, 6]} intensity={2.6} color="#FFF6EA" />
      <directionalLight position={[-4, 1, 3]} intensity={0.8} color="#F6C7CF" />
      <pointLight position={[0, -3, 4]} intensity={14} distance={12} color="#E8AF7C" />
      <Croissant hover={hover} />
      <Loaf hover={hover} />
      <Danish hover={hover} />
      <Crumbs />
    </>
  );
}

export default function BakeryItemsScene() {
  return (
    <Canvas
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      camera={{ position: [0, 0, 6.2], fov: 44 }}
      style={{ pointerEvents: "none" }}
    >
      <Rig />
    </Canvas>
  );
}
