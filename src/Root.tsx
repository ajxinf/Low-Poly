import { Composition } from "remotion";
import { TestCube } from "./TestCube";
import { ToonTest } from "./ToonTest";

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
    <Composition id="ToonTest" component={ToonTest} fps={30} durationInFrames={150} width={1080} height={1920} />
  </>
);
