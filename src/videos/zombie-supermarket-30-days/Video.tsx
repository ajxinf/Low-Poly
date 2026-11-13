import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Crowd } from "../../../kit/toon/crowd";
import { Dust } from "../../../kit/toon/dust";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { Insert } from "../../../kit/toon/Insert";
import { LIGHTS } from "../../../kit/toon/lights";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { EXT_OPTS, INT_EXTRAS, IN, at } from "./build";
import { propsFor } from "./props";
import { BEAT, HORDE, words } from "./roles";
import { FRAMES, INSERT, PLAN, S, SHOTS, WORLD, XF } from "./story";

// zombie-supermarket-30-days: the pilot Short. Each shot is its own Sequence + canvas; a shot that starts before the
// previous one ends dissolves in over XF frames, one that starts after it is a hard cut. The 2D x-ray insert is a hard
// cut of its own. Story props come from props.ts (the same `pose` drives the render and the QA guard).
export const ZOMBIE_FRAMES = FRAMES;
const INT_OPTS = { seed: 30 };
const SHADOW = { ext: { center: at(32, 0), size: 44 }, int: { center: IN(3, 0), size: 30 } };

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

const ShotView: React.FC<{ s: S }> = ({ s }) => {
  const lf = useCurrentFrame(), f = lf + s.from;
  const { width, height } = useVideoConfig();
  const W = WORLD[s.w], preset = PRESETS[W.preset], light = LIGHTS[W.light];
  const ext = s.w.startsWith("ext");
  const moving = useMemo(() => propsFor(s), [s]);
  const extras = useMemo(() => (ext ? [] : INT_EXTRAS()), [ext]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={W.sun} shadow={ext ? SHADOW.ext : SHADOW.int} />
      <Street preset={preset} light={light} opts={ext ? EXT_OPTS : INT_OPTS} />
      {extras.map((o, i) => <primitive key={i} object={o} />)}
      {s.crowd && <Crowd spec={HORDE} f={f} avoid={s.pose(lf).pos} />}
      {s.motes && <Dust center={s.motes.center} size={s.motes.size} color={s.motes.color} strength={0.9} count={260} />}
      {ext && <Dust center={at(32, 0, 3)} size={new Vector3(16, 6, 30)} color={s.w === "ext-dawn" ? "#ffd8a8" : "#fff4dc"} strength={0.8} count={420} />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={f} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(lf)} state={c.state(lf)} look={c.look} />)}
      <Composer dof={s.dof} />
    </ThreeCanvas>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = interpolate(useCurrentFrame(), [0, XF], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Insert art (100 x 178 units): a toy duck x-ray; the motion switch's ball rattles and lights the speaker. */
const ToyXRay: React.FC = () => {
  const f = useCurrentFrame();
  const shake = Math.sin(f * 1.7) * 3.2, on = Math.abs(Math.sin(f * 1.7)) > 0.6;
  const line = { stroke: "#cfefff", strokeWidth: 1.6, fill: "none", strokeLinejoin: "round" as const };
  return (
    <g transform={`translate(${shake * 0.5} 0)`}>
      <ellipse cx={50} cy={110} rx={28} ry={22} {...line} fill="#7fd4ff18" />
      <circle cx={62} cy={78} r={14} {...line} fill="#7fd4ff18" />
      <path d="M74 76 l12 3 l-12 4" {...line} />
      <rect x={34} y={104} width={20} height={9} rx={2} {...line} />
      <text x={44} y={111} fontSize={5} fill="#cfefff" textAnchor="middle" fontWeight={800}>AA</text>
      <rect x={56} y={100} width={14} height={6} rx={3} {...line} />
      <circle cx={63 + shake * 0.6} cy={103} r={2.4} fill="#ffd36a" />
      <path d="M54 108 C 58 116, 66 118, 70 112" {...line} strokeDasharray="2 1.5" />
      <circle cx={70} cy={120} r={6} {...line} fill={on ? "#ff8a5a88" : "none"} />
      {on && [0, 1, 2].map((i) => <path key={i} d={`M${80 + i * 5} ${112 - i * 2} q4 8 0 16`} stroke="#ffd36a" strokeWidth={1.4} fill="none" />)}
      <text x={50} y={150} fontSize={6.5} fill="#cfefff" textAnchor="middle" fontWeight={800}>MOTION SWITCH</text>
      <text x={50} y={158} fontSize={4.6} fill="#7fd4ff" textAnchor="middle">shake = sound</text>
    </g>
  );
};

export const ZombieSupermarket: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve><ShotView s={s} /></Dissolve> : <ShotView s={s} />}
      </Sequence>
    ))}
    <Sequence from={INSERT.from} durationInFrames={INSERT.to - INSERT.from}>
      <Insert kind="xray" title="X-RAY" readout="SHAKEN: LOUD"><ToyXRay /></Insert>
    </Sequence>
    <Stamp text="DAY 1" at={0} hold={40} top="7%" />
    <Stamp text="DAY 29" at={BEAT.day29 - 2} hold={50} />
    <Stamp text="DAY 30" at={BEAT.day30 - 2} hold={50} />
    <Captions words={words} />
    {/* Studio preview only (renders stay silent; the mux maps audio/mix.wav). */}
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("zombie-supermarket-30-days/mix.wav")} />}
  </AbsoluteFill>
);
