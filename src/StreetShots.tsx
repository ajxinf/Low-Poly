import { ThreeCanvas } from "@remotion/three";
import { useMemo } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Character, blinkAt, posed } from "../kit/toon/cast";
import { arc, drift, pushIn, shot } from "../kit/toon/camera";
import { ShotCamera } from "../kit/toon/guard";
import { Composer, DOF } from "../kit/toon/Composer";
import { PRESETS, PresetName } from "../kit/toon/build/presets";
import { Street, spine } from "../kit/toon/build/street";
import { LIGHTS, sunDirection } from "../kit/toon/lights";
import { ToonWorld } from "../kit/toon/world";
import { StreetScene, at } from "./ToonTest";

// Review shots for the environment kit: an establishing wide and a medium in the dusk street, plus one wide per
// era preset (each with its own seed and layout).

/** Establishing wide: high in the middle of the street, sharp (no lens blur), a slow drift so it never freezes. */
const WIDE = shot({ pos: at(-3, 0.4, 4.2), look: at(40, 0.6, 5), fov: 56 }, [drift(1.6, 0.3)], 90);
export const StreetWide: React.FC = () => <StreetScene id="StreetWide" pose={WIDE} frames={90} />;

/** Medium: the protagonist under the s 22 lamp, 4 m from the lens, background lens blur. */
const P = at(22.6, 3.4);
const MED = shot({ pos: at(18.8, 2.2, 1.35), look: P.clone().setY(1.15), fov: 42 }, [arc(-8), pushIn(0.4)], 90);
export const StreetMedium: React.FC = () => {
  const f = useCurrentFrame();
  return (
    <StreetScene id="StreetMedium" pose={MED} frames={90} dof={DOF.medium(4)}>
      <Character position={P} state={{ pose: posed("hips", f / 30), expr: "determined", blink: blinkAt(f, 30, 2), fx: {} }} />
    </StreetScene>
  );
};

/** One wide per preset: lens on the left walk looking down the street (interiors: down the main aisle). */
export const PresetWide: React.FC<{ name: PresetName }> = ({ name }) => {
  const { width, height } = useVideoConfig();
  const preset = PRESETS[name];
  const light = LIGHTS[preset.light];
  const { at: pat } = spine(preset.layout === "interior" ? 0 : 0.0032);
  const v = useMemo(() => {
    const inside = preset.layout === "interior";
    const base = inside ? { pos: pat(-1, 1.5, 1.7), look: pat(30, 1.5, 1.6), fov: 60 } : { pos: pat(-2, -2.8, 1.7), look: pat(40, 0.8, 5), fov: 58 };
    return { pose: shot(base, [pushIn(1), drift(1.4, 0.2)], 90), sun: sunDirection(light, base.pos, base.look), opts: { seed: 23, length: 50, lightCenter: pat(12, 0, 2) } };
  }, [preset, light, pat]);
  return (
    <AbsoluteFill>
      <ThreeCanvas width={width} height={height}>
        <ShotCamera id={`Preset-${name}`} pose={v.pose} frames={90} />
        <ToonWorld preset={light} sunDir={v.sun} shadow={{ center: pat(22, 0), size: 40 }} />
        <Street preset={preset} light={light} opts={v.opts} />
        <Composer />
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
