import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { CAPTION_FONT, Captions } from "../../../kit/toon/Captions";
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
import { BEAT, HORDE, cartAt, words } from "./roles";
import { FRAMES, INSERT, PLAN, S, SHOTS, WORLD } from "./story";

// zombie-supermarket-30-days: the pilot Short. Each shot is its own Sequence + canvas; a shot that starts before the
// previous one ends dissolves in over the overlap, one that starts after it is a hard cut. The 2D x-ray insert is a hard
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
  const extras = useMemo(() => (ext ? [] : INT_EXTRAS(s.w === "int-night")), [ext, s.w]);
  const shotWithProps = useMemo(() => ({ ...s, moving }), [s, moving]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...shotWithProps} />
      <ToonWorld preset={light} sunDir={W.sun} shadow={ext ? SHADOW.ext : SHADOW.int} />
      <Street preset={preset} light={light} opts={ext ? EXT_OPTS : INT_OPTS} />
      {extras.map((o, i) => <primitive key={i} object={o} />)}
      {s.crowd && <Crowd spec={HORDE} f={f} avoid={s.pose(lf).pos} keepOff={[{ pos: cartAt(f), r: 1.0 }]} />}
      {s.motes && <Dust center={s.motes.center} size={s.motes.size} color={s.motes.color} strength={0.9} count={260} />}
      {ext && <Dust center={at(32, 0, 3)} size={new Vector3(16, 6, 30)} color={s.w === "ext-dawn" ? "#ffd8a8" : "#fff4dc"} strength={0.8} count={420} />}
      {moving.map((p) => <Moving key={p.name} prop={p} f={f} />)}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(lf)} state={c.state(lf)} look={c.look} />)}
      <Composer dof={s.dof} />
    </ThreeCanvas>
  );
};

/** Fades in over `len` = the real overlap with the previous shot. Review C5: a fixed XF (10) on 4-8 frame overlaps left
 * the new shot part-transparent over black once the old one ended: a dark blink after every dissolve (f539, f2207). */
const Dissolve: React.FC<{ children: React.ReactNode; len: number }> = ({ children, len }) => {
  const opacity = interpolate(useCurrentFrame(), [0, Math.max(1, len)], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

/** Insert art (100 x 178 units): a toy duck x-ray; the motion switch's ball rattles and lights the speaker. */
/**
 * Insert art (100 x 178 units): x-ray of a rubber duck (critique: a thin outline read as a different show). Glowing
 * filled body with its bones of plastic: the battery pack, a circuit board with chips, the motion switch whose ball
 * rattles, wires to a speaker cone that pulses and throws sound waves. Labels name the parts.
 */
const ToyXRay: React.FC = () => {
  const f = useCurrentFrame();
  const shake = Math.sin(f * 1.7) * 3.2, on = Math.abs(Math.sin(f * 1.7)) > 0.6;
  const line = { stroke: "#cfefff", strokeWidth: 1.4, fill: "none", strokeLinejoin: "round" as const };
  const label = { fontSize: 3.6, fill: "#9fe4ff", fontWeight: 900, letterSpacing: 0.3, fontFamily: CAPTION_FONT };
  return (
    <g transform={`translate(${shake * 0.5} -34)`}>
      <defs>
        <radialGradient id="duckBody" cx="45%" cy="40%" r="65%">
          <stop offset="0%" stopColor="#7fd4ff" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#1a5a9a" stopOpacity="0.15" />
        </radialGradient>
      </defs>
      <path d="M22 112 C 20 92, 40 86, 56 92 C 60 84, 52 66, 62 62 C 76 58, 80 72, 74 80 L 88 82 L 76 88 C 82 96, 84 116, 70 126 C 56 136, 28 132, 22 112 Z" {...line} fill="url(#duckBody)" strokeWidth={1.8} />
      <circle cx={67} cy={70} r={2.4} fill="#cfefff" />
      <path d="M30 108 q8 -10 18 -2" {...line} strokeDasharray="1.5 1.5" />
      <rect x={30} y={110} width={22} height={10} rx={2} {...line} fill="#7fd4ff22" />
      <rect x={30} y={110} width={10} height={10} rx={1.5} {...line} />
      <text x={41} y={117.5} fontSize={4.6} fill="#e8f8ff" textAnchor="middle" fontWeight={900} fontFamily={CAPTION_FONT}>AA</text>
      <rect x={52} y={98} width={18} height={10} rx={1} {...line} fill="#2a8a5a44" />
      {[0, 1, 2].map((k) => <rect key={k} x={54 + k * 5.4} y={100} width={3.6} height={3} fill="#cfefff" />)}
      <path d="M53 106 h16 M55 104 v2 M61 104 v2 M67 104 v2" stroke="#9fe4ff" strokeWidth={0.6} />
      <rect x={44} y={92} width={14} height={5} rx={2.5} {...line} />
      <circle cx={51 + shake * 0.7} cy={94.5} r={2} fill="#ffd36a" />
      <path d="M52 110 C 54 116, 62 120, 66 122" stroke="#ff8a5a" strokeWidth={1} fill="none" />
      <path d="M58 108 C 62 114, 68 116, 70 118" stroke="#ffd36a" strokeWidth={1} fill="none" />
      <circle cx={70} cy={122} r={6.5} {...line} fill={on ? "#ff8a5a66" : "#7fd4ff18"} />
      <circle cx={70} cy={122} r={3 + (on ? 0.8 : 0)} {...line} />
      {on && [0, 1, 2].map((k) => <path key={k} d={`M${80 + k * 5} ${113 - k * 2} q5 9 0 18`} stroke="#ffd36a" strokeWidth={1.4} fill="none" />)}
      <path d="M40 130 l-3 8 h8 M58 132 l-2 8 h8" {...line} />
      <text x={22} y={146} {...label}>BATTERY</text>
      <text x={8} y={84} {...label}>MOTION SWITCH</text>
      <text x={70} y={146} {...label}>SPEAKER</text>
      <path d="M30 143 L 36 121 M30 86 L 45 93 M76 141 L 72 129" stroke="#9fe4ff" strokeWidth={0.5} />
      <text x={50} y={194} fontSize={6.5} fill="#cfefff" textAnchor="middle" fontWeight={900} fontFamily={CAPTION_FONT}>SHAKE = SOUND</text>
    </g>
  );
};

export const ZombieSupermarket: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve len={SHOTS[i - 1].from + SHOTS[i - 1].frames - s.from}><ShotView s={s} /></Dissolve> : <ShotView s={s} />}
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
