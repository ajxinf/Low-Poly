import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, Audio, Easing, Sequence, getRemotionEnvironment, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { CylinderGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from "three";
import { PRESETS } from "../../../kit/toon/build/presets";
import { Street } from "../../../kit/toon/build/street";
import { MAT } from "../../../kit/toon/build/kit";
import { Captions } from "../../../kit/toon/Captions";
import { Character } from "../../../kit/toon/cast";
import { Composer } from "../../../kit/toon/Composer";
import { Dust } from "../../../kit/toon/dust";
import { QAPlan, ShotCamera } from "../../../kit/toon/guard";
import { NOINK } from "../../../kit/toon/ink";
import { LIGHTS } from "../../../kit/toon/lights";
import { Stamp } from "../../../kit/toon/Stamp";
import { ToonWorld } from "../../../kit/toon/world";
import { HIS, OPTS, SHED, YOURS, at, hotRoof, iceCream, lemonade, paintSlab, roller, sunDisc } from "./build";
import { BEAT, words } from "./roles";
import { CONE_AT, LEMON_AT, PLAN, ROLLER_FOR, SHOTS, SUN, SUN_POS, XF, handAt, melt, paintCover, paintEdge, paintStart, rays, roofHeat, stretch } from "./story";

// _pipeline-test-2: 15 s pipeline smoke test 2 (not for posting). Each shot is its own Sequence + canvas; a shot that
// starts before the previous one ends dissolves in over 10 frames on top of it, one that starts after it is a cut.
const SHADOW = { center: at(16, 5), size: 18 };
const DUST = { center: at(16, 5.5, 1.8), size: new Vector3(8, 3.5, 8) };
const ROOF_L = SHED.w + 0.3;

const Paint: React.FC<{ f: number; whose: "yours" | "his" }> = ({ f, whose }) => {
  const g = useMemo(paintSlab, []);
  const s = whose === "yours" ? YOURS.s : HIS.s, c = paintCover(f, whose);
  g.position.copy(paintStart(s, c, whose));
  g.scale.set(1, 1, Math.max(c * ROOF_L, 1e-3));
  g.visible = c > 0;
  return <primitive object={g} />;
};

const Roller: React.FC<{ f: number; whose: "yours" | "his" }> = ({ f, whose }) => {
  const head = useMemo(roller, []);
  const pole = useMemo(() => new Mesh(new CylinderGeometry(0.018, 0.018, 1, 6), MAT.darkWood()), []);
  const r = ROLLER_FOR[whose], edge = paintEdge(r.s, paintCover(f, whose), whose);
  head.position.copy(edge);
  stretch(pole, handAt(r.who), edge);
  return (
    <>
      <primitive object={head} />
      <primitive object={pole} />
    </>
  );
};

const Rays: React.FC<{ f: number }> = ({ f }) => {
  const pool = useMemo(() => {
    const g = new Group();
    for (let i = 0; i < 9; i++) {
      const m = new Mesh(new CylinderGeometry(0.07, 0.07, 1, 8), new MeshBasicMaterial({ color: "#ffd54a", fog: false, toneMapped: false }));
      m.material.color.multiplyScalar(2.5); // HDR: blooms past threshold 1
      m.layers.set(NOINK);
      g.add(m);
    }
    return g;
  }, []);
  const list = rays(f);
  pool.children.forEach((m, i) => {
    m.visible = i < list.length;
    if (m.visible) stretch(m, list[i].a, list[i].b);
  });
  return <primitive object={pool} />;
};

const Heat: React.FC<{ f: number }> = ({ f }) => {
  const g = useMemo(hotRoof, []);
  g.position.copy(at(HIS.s, SHED.x, (SHED.front + SHED.back) / 2 + 0.08 + 0.042));
  const o = roofHeat(f);
  g.traverse((m) => {
    if (m instanceof Mesh) (m.material as MeshBasicMaterial).opacity = o;
  });
  g.visible = o > 0.01;
  return <primitive object={g} />;
};

const IceCream: React.FC<{ f: number }> = ({ f }) => {
  const g = useMemo(iceCream, []);
  const m = melt(f);
  g.position.copy(CONE_AT);
  g.getObjectByName("scoop")!.scale.setScalar(Math.max(m.scoop, 0.05));
  const drip = g.getObjectByName("drip")!;
  drip.position.set(0.05, 0.2 - 0.22 * m.drip, 0);
  drip.visible = m.drip > 0 && m.drip < 1;
  return <primitive object={g} />;
};

const Prop: React.FC<{ make: () => Group | Mesh; at: Vector3; face?: Vector3 }> = ({ make, at: p, face }) => {
  const g = useMemo(make, [make]);
  g.position.copy(p);
  if (face) g.lookAt(face);
  return <primitive object={g} />;
};

const ShotView: React.FC<{ i: number }> = ({ i }) => {
  const s = SHOTS[i];
  const lf = useCurrentFrame(), f = lf + s.from;
  const { width, height } = useVideoConfig();
  const cam = s.pose(lf).pos;
  const id = s.id.split("/")[1];
  return (
    <ThreeCanvas width={width} height={height}>
      <ShotCamera {...s} />
      <ToonWorld preset={LIGHTS.day} sunDir={SUN} shadow={SHADOW} />
      <Street preset={PRESETS.modern_suburb} light={LIGHTS.day} opts={OPTS} />
      <Dust center={DUST.center} size={DUST.size} color="#fff4dc" strength={1.2} count={500} />
      {s.sunDisc && <Prop make={sunDisc} at={SUN_POS} face={cam} />}
      <Paint f={f} whose="yours" />
      <Paint f={f} whose="his" />
      {id.startsWith("S1") && <Roller f={f} whose="yours" />}
      {id.startsWith("S5") && <Roller f={f} whose="his" />}
      {s.rays && <Rays f={f} />}
      <Heat f={f} />
      {id.startsWith("S4") && <IceCream f={f} />}
      {id.startsWith("S5") && <Prop make={lemonade} at={LEMON_AT} />}
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
