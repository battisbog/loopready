"use client";

import { useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { audioLevels } from "@/lib/audio-levels";

/**
 * The states the orb reacts to. Maps 1:1 onto the status from useVoiceTurn,
 * plus the live-mode statuses, so callers pass their status straight through.
 */
export type OrbState =
  | "idle"
  | "recording"
  | "listening"
  | "transcribing"
  | "thinking"
  | "speaking"
  | "connecting"
  | "done"
  | "failed";

/** Per-state look and motion. Colours stay in the dark/emerald system. */
const STATE_STYLE: Record<
  OrbState,
  {
    /** Base colour */
    color: [number, number, number];
    /** Idle undulation amount */
    wobble: number;
    /** Animation speed */
    speed: number;
    /** How strongly live audio drives displacement */
    reactivity: number;
    /** Emissive strength */
    glow: number;
  }
> = {
  // Emerald, actively undulating: this is the voice.
  speaking: { color: [0.06, 0.85, 0.55], wobble: 0.1, speed: 1.5, reactivity: 0.55, glow: 1.0 },
  // Cool cyan ripple so it reads as "hearing you", not "talking".
  recording: { color: [0.25, 0.72, 0.92], wobble: 0.07, speed: 1.1, reactivity: 0.5, glow: 0.85 },
  listening: { color: [0.25, 0.72, 0.92], wobble: 0.07, speed: 1.1, reactivity: 0.5, glow: 0.85 },
  // Slow breathing while the system works.
  thinking: { color: [0.45, 0.5, 0.6], wobble: 0.05, speed: 0.45, reactivity: 0, glow: 0.5 },
  transcribing: { color: [0.45, 0.5, 0.6], wobble: 0.05, speed: 0.45, reactivity: 0, glow: 0.5 },
  connecting: { color: [0.45, 0.5, 0.6], wobble: 0.04, speed: 0.4, reactivity: 0, glow: 0.45 },
  // Calm ambient drift.
  idle: { color: [0.13, 0.5, 0.42], wobble: 0.045, speed: 0.32, reactivity: 0.12, glow: 0.55 },
  done: { color: [0.13, 0.45, 0.4], wobble: 0.03, speed: 0.22, reactivity: 0, glow: 0.4 },
  failed: { color: [0.85, 0.35, 0.35], wobble: 0.03, speed: 0.25, reactivity: 0, glow: 0.5 },
};

const VERTEX = /* glsl */ `
uniform float uTime;
uniform float uWobble;
uniform float uAmp;
varying float vDisp;
varying vec3 vNormalW;

// Classic simplex noise (Ashima). Cheap enough to run per-vertex at 60fps.
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // Two octaves: a slow rolling shape plus a finer ripple that the voice drives.
  float base  = snoise(normal * 1.6 + uTime * 0.35);
  float fine  = snoise(normal * 3.4 - uTime * 0.6);
  float disp  = base * uWobble + fine * uAmp * 0.55;

  vDisp = disp;
  vNormalW = normalize(normalMatrix * normal);

  vec3 pos = position + normal * disp;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColor;
uniform float uGlow;
varying float vDisp;
varying vec3 vNormalW;

void main() {
  // Fresnel rim so the sphere reads as a glowing volume rather than a ball.
  float fres = pow(1.0 - abs(vNormalW.z), 2.4);
  float ridge = smoothstep(-0.05, 0.16, vDisp);

  vec3 core = uColor * (0.35 + ridge * 0.5);
  vec3 rim  = uColor * fres * (1.4 * uGlow);
  vec3 col  = core + rim;

  // Soft alpha at the silhouette keeps the edge organic against the dark page.
  float alpha = clamp(0.42 + fres * 0.85 + ridge * 0.25, 0.0, 1.0);
  gl_FragColor = vec4(col, alpha);
}
`;

function Blob({ state }: { state: OrbState }) {
  const mesh = useRef<THREE.Mesh>(null);
  const style = STATE_STYLE[state] ?? STATE_STYLE.idle;

  // Fewer segments on small screens; the shader cost is per-vertex.
  const detail = useMemo(() => {
    if (typeof window === "undefined") return 96;
    return window.innerWidth < 640 ? 56 : 96;
  }, []);

  // Created once and never replaced. Three.js reads these objects every frame
  // and we mutate `.value` in the frame loop; the identity stays stable, so
  // React never needs to re-render for it.
  const [uniforms] = useState(() => ({
    uTime: { value: 0 },
    uWobble: { value: STATE_STYLE.idle.wobble },
    uAmp: { value: 0 },
    uColor: { value: new THREE.Color(...STATE_STYLE.idle.color) },
    uGlow: { value: STATE_STYLE.idle.glow },
  }));

  const target = useRef({ amp: 0 });
  const targetColor = useRef(new THREE.Color());

  // react-hooks/immutability cannot model an imperative WebGL render loop:
  // mutating uniform `.value` every frame is exactly how Three.js is driven,
  // and these objects are owned by the GPU material, not by React state.
  /* eslint-disable react-hooks/immutability */
  useFrame((_, delta) => {
    const u = uniforms;
    u.uTime.value += delta * style.speed;

    // Amplitude comes from whichever side currently holds the floor.
    const raw =
      style.reactivity === 0
        ? 0
        : state === "speaking"
          ? audioLevels.level("output")
          : state === "recording" || state === "listening"
            ? audioLevels.level("input")
            : 0;

    // A slow breath keeps the orb alive when nobody is talking.
    const breath = (Math.sin(u.uTime.value * 0.9) * 0.5 + 0.5) * 0.12;
    const desired = raw * style.reactivity + breath * (1 - style.reactivity);

    target.current.amp += (desired - target.current.amp) * Math.min(1, delta * 9);
    u.uAmp.value = target.current.amp;

    // Ease colour and wobble so state changes glide instead of snapping.
    u.uWobble.value += (style.wobble - u.uWobble.value) * Math.min(1, delta * 4);
    u.uGlow.value += (style.glow - u.uGlow.value) * Math.min(1, delta * 4);
    targetColor.current.setRGB(style.color[0], style.color[1], style.color[2]);
    u.uColor.value.lerp(targetColor.current, Math.min(1, delta * 3));

    if (mesh.current) mesh.current.rotation.y += delta * 0.12;
  });
  /* eslint-enable react-hooks/immutability */

  return (
    <mesh ref={mesh}>
      <icosahedronGeometry args={[1, detail > 60 ? 6 : 4]} />
      <shaderMaterial
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

/** Static glow used for reduced-motion and when WebGL is unavailable. */
function StaticOrb({ state, size }: { state: OrbState; size: number }) {
  const style = STATE_STYLE[state] ?? STATE_STYLE.idle;
  const rgb = style.color.map((c) => Math.round(c * 255)).join(" ");
  return (
    <div
      style={{ width: size, height: size }}
      className="flex items-center justify-center"
      aria-hidden
    >
      <div
        className="h-3/5 w-3/5 rounded-full transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 38% 34%, rgb(${rgb} / 0.85), rgb(${rgb} / 0.18) 62%, transparent 72%)`,
          boxShadow: `0 0 ${size / 4}px rgb(${rgb} / 0.45)`,
        }}
      />
    </div>
  );
}

export default function VoiceOrb({
  state,
  size = 260,
  className = "",
}: {
  state: OrbState;
  size?: number;
  className?: string;
}) {
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  if (reduced) {
    return (
      <div className={className}>
        <StaticOrb state={state} size={size} />
      </div>
    );
  }

  return (
    <div style={{ width: size, height: size }} className={className}>
      <Canvas
        // Capped DPR: the shader is fill-rate bound and retina doubles cost.
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 3.1], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ background: "transparent" }}
      >
        <Blob state={state} />
      </Canvas>
    </div>
  );
}
