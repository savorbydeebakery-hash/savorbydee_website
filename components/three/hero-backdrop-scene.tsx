"use client";

import { useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Interactive hero backdrop: a full-viewport plane running a flowing-noise
 * shader in the brand palette, warped by the pointer.
 *
 * Replaces the CSS radial-gradient mesh. A CSS gradient can drift, but it
 * cannot react, and it cannot produce the soft internal turbulence that makes
 * this read as a material rather than a background colour.
 *
 * Everything happens in the fragment shader on one quad: no geometry, no
 * post-processing, no render targets. Cost is essentially fill rate, which is
 * why dpr is capped rather than the effect being simplified.
 */

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec2 vUv;

  uniform float uTime;
  uniform vec2  uPointer;   // -1..1, eased
  uniform float uAspect;
  uniform vec3  uCocoa;
  uniform vec3  uBerry;
  uniform vec3  uBlush;
  uniform vec3  uAmber;

  // Classic 2D simplex noise (Ashima). Cheap enough for a full-screen quad.
  vec3 mod289(vec3 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec2 mod289(vec2 x){ return x - floor(x * (1.0/289.0)) * 289.0; }
  vec3 permute(vec3 x){ return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v){
    const vec4 C = vec4(0.211324865, 0.366025404, -0.577350269, 0.024390244);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }

  /** Two octaves is enough; more just costs fill rate for detail nobody reads. */
  float fbm(vec2 p){
    return 0.6 * snoise(p) + 0.4 * snoise(p * 2.1 + 4.7);
  }

  void main() {
    vec2 uv = vUv;
    vec2 p = (uv - 0.5) * vec2(uAspect, 1.0);

    // Pointer pulls the field toward it, falling off with distance.
    vec2  toPointer = uPointer * vec2(uAspect, 1.0) * 0.5 - p;
    float pull = 1.0 / (1.0 + dot(toPointer, toPointer) * 6.0);
    p += normalize(toPointer + 1e-5) * pull * 0.18;

    float t = uTime * 0.05;
    float n1 = fbm(p * 1.5 + vec2(t, -t * 0.7));
    float n2 = fbm(p * 2.4 + vec2(-t * 0.8, t * 1.1) + n1 * 0.5);

    // Layer the palette by noise band rather than by position, so the colours
    // move through each other instead of sitting in fixed corners.
    vec3 col = uCocoa;
    col = mix(col, uBerry, smoothstep(-0.35, 0.55, n1));
    col = mix(col, uBlush, smoothstep(0.10, 0.95, n2) * 0.55);
    col = mix(col, uAmber, smoothstep(0.45, 1.05, n1 * n2) * 0.35);

    // Warm bloom that follows the cursor.
    col += uBlush * pull * 0.16;

    // Vignette so the headline always sits on the darkest part.
    float vig = smoothstep(1.15, 0.25, length(p));
    col = mix(uCocoa, col, vig * 0.92 + 0.08);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function Backdrop() {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const target = useRef(new THREE.Vector2(0, 0));
  const { size } = useThree();

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2(0, 0) },
      uAspect: { value: 1 },
      uCocoa: { value: new THREE.Color("#2E211B") },
      uBerry: { value: new THREE.Color("#A8455A") },
      uBlush: { value: new THREE.Color("#F6C7CF") },
      uAmber: { value: new THREE.Color("#E8AF7C") },
    }),
    []
  );

  useFrame((state, delta) => {
    const u = mat.current?.uniforms;
    if (!u) return;
    u.uTime.value += delta;
    u.uAspect.value = size.width / Math.max(size.height, 1);
    target.current.set(state.pointer.x, state.pointer.y);
    // Ease rather than snap, or the field twitches with every mouse sample.
    u.uPointer.value.lerp(target.current, 0.045);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={mat}
        vertexShader={vertex}
        fragmentShader={fragment}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}

export default function HeroBackdropScene() {
  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{ antialias: false, alpha: false, powerPreference: "low-power" }}
      style={{ pointerEvents: "none" }}
      orthographic
      camera={{ position: [0, 0, 1], zoom: 1 }}
    >
      <Backdrop />
    </Canvas>
  );
}
