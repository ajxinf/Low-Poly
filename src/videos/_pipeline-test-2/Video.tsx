import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { MovingProp, QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { LightShafts } from "../../../kit/toon/shafts";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { OPTS, at, sunDisc } from "./build";
import { propsFor } from "./props";
import { BEAT, words } from "./roles";
import { PLAN, SHAFTS, SHOTS, SUN, SUN_POS, XF } from "./story";

// _pipeline-test-2: 15 s pipeline smoke test 2 (not for posting). Each shot is its own Sequence + canvas; a shot that
// starts before the previous one ends dissolves in over 10 frames on top of it, one that starts after it is a cut.
// Story props come from props.ts: the same `pose` drives the render and the guard's "Moving props" check.
const SHADOW = { center: at(16, 5), size: 18 };
const DUST = { center: at(16, 5.5, 1.8), size: new Vector3(8, 3.5, 8) };

const Moving: React.FC<{ prop: MovingProp; f: number }> = ({ prop, f }) => {
  const o = useMemo(prop.make, [prop]);
  o.visible = prop.pose(o, f) !== false;
  return <primitive object={o} />;
};

const Sun: React.FC<{ cam: Vector3 }> = ({ cam }) => {
  const m = useMemo(sunDisc, []);
  m.position.copy(SUN_POS);
  m.lookAt(cam);
  return <primitive object={m} />;
};

const ShotView: React.FC<{ i: number }> = ({ i }) => {
  const s = SHOTS[i];
  const lf = useCurrentFrame(), f = lf + s.from;
  const { width, height } = useVideoConfig();
  const moving = useMemo(() => propsFor(s.id), [s.id]);
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} moving={moving} />
      <ToonWorld preset={LIGHTS.day} sunDir={SUN} shadow={SHADOW} />
      <Street preset={PRESETS.modern_suburb} light={LIGHTS.day} opts={OPTS} />
      <Dust center={DUST.center} size={DUST.size} color="#fff4dc" strength={1.2} count={500} />
      {s.sunDisc && <Sun cam={s.pose(lf).pos} />}
      <LightShafts shafts={SHAFTS} />
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

export const PipelineTest2: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve><ShotView i={i} /></Dissolve> : <ShotView i={i} />}
      </Sequence>
    ))}
    <Stamp text="DAY 90" at={BEAT.day} hold={60} />
    <Captions words={words} />
    {/* Studio preview only (renders stay silent; the mux maps audio/mix.wav). mix.py writes public/<slug>/mix.wav. */}
    {getRemotionEnvironment().isStudio && <Audio src={staticFile("_pipeline-test-2/mix.wav")} />}
  </AbsoluteFill>
);
