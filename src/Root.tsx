import { Composition } from "remotion";
import { PS1Test } from "./PS1Test";
import { TestCube } from "./TestCube";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="TestCube"
      component={TestCube}
      fps={30}
      durationInFrames={150}
      width={1080}
      height={1920}
    />
    <Composition
      id="PS1Test"
      component={PS1Test}
      fps={30}
      durationInFrames={150}
      width={1080}
      height={1920}
    />
  </>
);
