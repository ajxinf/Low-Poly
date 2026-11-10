import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";

export const TestCube: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const angle = frame * 0.04; // frame-driven, never clock-driven

  return (
    <AbsoluteFill style={{ backgroundColor: "#1b1b2f" }}>
      <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 6], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <directionalLight position={[3, 4, 5]} intensity={1.5} />
        <mesh rotation={[angle * 0.7, angle, 0]}>
          <boxGeometry args={[2, 2, 2]} />
          <meshStandardMaterial color="#e07a3f" flatShading />
        </mesh>
      </ThreeCanvas>
    </AbsoluteFill>
  );
};
