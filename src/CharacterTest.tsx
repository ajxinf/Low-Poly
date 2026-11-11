import { useThree } from "@react-three/fiber";
import { ThreeCanvas } from "@remotion/three";
import { useLayoutEffect } from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { PerspectiveCamera, Vector3 } from "three";
import { CharState, Character, blinkAt, posed, reactSquash, walkPose } from "../kit/toon/cast";
import { Composer, Dof, POST } from "../kit/toon/Composer";
import { Dust } from "../kit/toon/dust";
import { LIGHTS } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";
import { DUST, SHADOW, SUN, Street, at } from "./ToonTest";

// 8 s in the dusk street. 0-3 s walk toward the lens, 3-5 s stop under the lamp and look around, 5-6 s hard cut to a
// shocked close-up, 6-8 s 10-frame dissolve to a wide with a slow push-in.
const FPS = 30;
const START = { s: 25.7, x: 2.4 };
const STOP = { s: 22.6, x: 3.75 }; // under the lamp at s 22 (right side, in front of the warm facades)
const PATH = Math.hypot(START.s - STOP.s, START.x - STOP.x);
const WALK_END = 89, DECEL = 12;
const V = PATH / ((WALK_END - DECEL) / FPS + DECEL / FPS / 2);
const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Distance walked by frame f (constant speed, then a 12-frame stop). */
const walked = (f: number) => {
  const tc = WALK_END - DECEL;
  if (f <= tc) return (V * f) / FPS;
  const d = Math.min(f, WALK_END) - tc;
  return (V * tc) / FPS + (V * (d - (d * d) / (2 * DECEL))) / FPS;
};
const posAt = (f: number) => {
  const k = Math.min(walked(f) / PATH, 1);
  return at(lerp(START.s, STOP.s, k), lerp(START.x, STOP.x, k));
};
const P = posAt(WALK_END); // where he stops

const stateAt = (f: number): CharState => {
  const look = interpolate(f, [90, 98, 110, 122, 134, 149], [0, -1, -1, 1, 1, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const amount = interpolate(f, [WALK_END - DECEL, WALK_END], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const t = (f - WALK_END) / FPS;
  const pose = f < WALK_END ? walkPose(walked(f), amount) : posed(f < 112 ? "idle" : "chin", t, look);
  if (f < 90) return { pose, expr: "neutral", blink: blinkAt(f, FPS, 3), fx: {} };
  if (f < 150) return { pose, expr: "worried", blink: blinkAt(f, FPS, 3), fx: {} };
  // Reaction: squash/stretch over 4 frames, arms up.
  return { pose: { ...posed("panic", t, 0), squash: reactSquash(f - 150) }, expr: "shocked", blink: false, fx: { ringEyes: true, sweat: clamp01((f - 152) / 24), ...(f < 190 ? { bang: f - 150 } : {}) } };
};

type Cam = { pos: Vector3; look: Vector3; fov: number; dof: Dof };
const v0 = (() => {
  const camEnd = at(STOP.s - 5.1, STOP.x + 0.4, 0); // wall side of him, so the street is behind him
  return camEnd.sub(P).setY(0);
})();
const camAt = (f: number, wide: boolean): Cam => {
  if (wide) {
    const t = smooth(clamp01((f - 180) / 59));
    return { pos: at(lerp(10.4, 12.0, t), 0.5, 1.75), look: at(26, 2.2, 2.4), fov: 54, dof: POST.dof };
  }
  if (f < 90) {
    // Low, ahead of him, slowly pulling back.
    const c = posAt(f), cs = lerp(START.s, STOP.s, Math.min(walked(f) / PATH, 1));
    const d = lerp(4.2, 5.1, smooth(f / 89));
    const pos = at(cs - d, lerp(START.x, STOP.x, Math.min(walked(f) / PATH, 1)) + 0.4, 0.9);
    return { pos, look: c.clone().setY(1.0), fov: 50, dof: { maxPx: 8, near: d + 2, far: d + 18 } };
  }
  if (f < 150) {
    // Arc toward the street and push in to a medium shot.
    const t = smooth((f - 90) / 59);
    const r = lerp(5.1, 2.5, t), th = lerp(0, 0.45, t); // + swings toward the wall, the view opens onto the street
    const dir = v0.clone().normalize().applyAxisAngle(new Vector3(0, 1, 0), th);
    return { pos: P.clone().addScaledVector(dir, r).setY(lerp(0.9, 1.12, t)), look: P.clone().setY(lerp(1.0, 1.12, t)), fov: lerp(50, 42, t), dof: { maxPx: 10, near: r + 1.2, far: r + 10 } };
  }
  // Hard cut: close-up, creeping in.
  const t = (f - 150) / 40;
  const r = lerp(2.35, 2.15, t); // head and shoulders: frame width ~ .37 r at fov 36
  const dir = v0.clone().normalize().applyAxisAngle(new Vector3(0, 1, 0), 0.35); // looks down the street, not at the wall
  return { pos: P.clone().addScaledVector(dir, r).setY(1.3), look: P.clone().setY(1.36), fov: 36, dof: { maxPx: 13, near: r + 0.6, far: r + 4 } };
};

const CameraRig: React.FC<{ cam: Cam }> = ({ cam }) => {
  const camera = useThree((s) => s.camera) as PerspectiveCamera;
  useLayoutEffect(() => {
    camera.position.copy(cam.pos);
    camera.fov = cam.fov;
    camera.near = 0.05;
    camera.far = 1200;
    camera.updateProjectionMatrix();
    camera.lookAt(cam.look);
  }, [camera, cam]);
  return null;
};

const Shot: React.FC<{ from: number; wide: boolean }> = ({ from, wide }) => {
  const f = useCurrentFrame() + from;
  const { width, height } = useVideoConfig();
  const cam = camAt(f, wide);
  return (
    <ThreeCanvas width={width} height={height}>
      <CameraRig cam={cam} />
      <ToonWorld preset={LIGHTS.dusk} sunDir={SUN} shadow={SHADOW} />
      <Street bollards={false} />
      <Dust center={DUST.center} size={DUST.size} />
      <Character position={f < WALK_END ? posAt(f) : P} state={stateAt(f)} />
      <Composer dof={cam.dof} />
    </ThreeCanvas>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = interpolate(useCurrentFrame(), [0, 10], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const CharacterTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <Sequence durationInFrames={190}>
      <Shot from={0} wide={false} />
    </Sequence>
    <Sequence from={180}>
      <Dissolve>
        <Shot from={180} wide />
      </Dissolve>
    </Sequence>
  </AbsoluteFill>
);
