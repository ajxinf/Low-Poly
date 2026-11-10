import { ThreeElements } from "@react-three/fiber";
import { useMemo } from "react";
import { PS1Material, PS1MaterialProps } from "../ps1/PS1Material";
import { blotches, paintTexture } from "../ps1/paintTexture";
import { usePS1Texture } from "../ps1/usePS1Texture";

// Late-90s brick phone: green screen on the upper third, keypad below. Antenna at +y, screen faces +z.
const paintPhone = () =>
  paintTexture((rect) => {
    rect("#6f716c", 0, 0, 32, 32);
    blotches(rect, "phone", ["#62645f", "#7c7e78"], 30, [0, 0, 32, 32]);
    rect("#2c2e2b", 6, 3, 20, 10);
    rect("#7fe07f", 8, 5, 16, 6);
    for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) rect("#2f312e", 8 + c * 6, 16 + r * 4, 4, 2);
  });

export const BrickPhone: React.FC<ThreeElements["group"] & { fx?: PS1MaterialProps }> = ({ fx, ...group }) => {
  const url = useMemo(paintPhone, []);
  const tex = usePS1Texture(url);
  return (
    <group {...group}>
      <mesh>
        <boxGeometry args={[0.05, 0.15, 0.03]} />
        <PS1Material {...fx} map={tex} />
      </mesh>
      <mesh position={[0.015, 0.105, 0]}>
        <cylinderGeometry args={[0.006, 0.008, 0.06, 4]} />
        <PS1Material {...fx} map={tex} color="#3a3a3a" />
      </mesh>
    </group>
  );
};
