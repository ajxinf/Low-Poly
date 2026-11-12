import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Easing, Sequence, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { LIGHTS } from "../../../kit/toon/lights";
import { ToonWorld } from "../../../kit/toon/world";
import { OPTS_CAFE, OPTS_REVEAL, OPTS_TALL, at, scoreCard, toastMesh } from "./build";
import { CARD_UP, words } from "./roles";
import { CARD_POS, PLAN, SHOTS, SUN, XF, toastCafe, toastTall } from "./story";

// _pipeline-test: 15 s pipeline smoke test (not for posting). Each shot is its own Sequence + canvas. A shot that
// starts before the previous one ends dissolves in over 10 frames on top of it; one that starts after it is a cut.
const OPTS = { cafe: OPTS_CAFE, tall: OPTS_TALL, reveal: OPTS_REVEAL };
const SHADOW = { center: at(16, 0.3), size: 16 };
const DUST = { center: at(16, 0.5, 1.6), size: new Vector3(7, 3.2, 8) };

const Toast: React.FC<{ f: number; tall: boolean }> = ({ f, tall }) => {
  const g = useMemo(toastMesh, []);
  const t = (tall ? toastTall : toastCafe)(f);
  g.position.copy(t.pos);
  g.rotation.set(0, 0, t.rotZ);
  return <primitive object={g} />;
};

const Card: React.FC<{ f: number; cam: Vector3 }> = ({ f, cam }) => {
  const g = useMemo(scoreCard, []);
  const p = CARD_POS;
  g.position.copy(p);
  g.rotation.set(0, Math.atan2(cam.x - p.x, cam.z - p.z), 0);
  g.visible = f >= CARD_UP;
  return <primitive object={g} />;
};

const ShotView: React.FC<{ i: number }> = ({ i }) => {
  const s = SHOTS[i];
  const lf = useCurrentFrame(), f = lf + s.from;
  const { width, height } = useVideoConfig();
  const cam = s.pose(lf).pos;
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={LIGHTS.day} sunDir={SUN} shadow={SHADOW} />
      <Street preset={PRESETS.victorian_town} light={LIGHTS.day} opts={OPTS[s.set]} />
      <Dust center={DUST.center} size={DUST.size} color="#fff4dc" strength={1.2} count={500} />
      <Toast f={f} tall={s.set !== "cafe"} />
      {s.cast?.some((c) => c.name === "friend") && s.set === "cafe" && <Card f={f} cam={cam} />}
      {s.cast?.map((c) => <Character key={c.name} position={c.at(lf)} state={c.state(lf)} look={c.look} />)}
      <Composer dof={s.dof} />
    </ThreeCanvas>
  );
};

const Dissolve: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const opacity = interpolate(useCurrentFrame(), [0, XF], [0, 1], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.quad) });
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};

export const PipelineTest: React.FC = () => (
  <AbsoluteFill style={{ background: "black" }}>
    <QAPlan plan={PLAN} />
    {SHOTS.map((s, i) => (
      <Sequence key={s.id} from={s.from} durationInFrames={s.frames}>
        {i > 0 && s.from < SHOTS[i - 1].from + SHOTS[i - 1].frames ? <Dissolve><ShotView i={i} /></Dissolve> : <ShotView i={i} />}
      </Sequence>
    ))}
    <Captions words={words} />
  </AbsoluteFill>
);
