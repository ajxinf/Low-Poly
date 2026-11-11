import { Composition } from "remotion";
import { TestCube } from "./TestCube";
import { CastLineup, CloseUp } from "./CastLineup";
import { CharacterTest } from "./CharacterTest";
import { ExpressionSheet } from "./ExpressionSheet";
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
    <Composition id="CharacterTest" component={CharacterTest} fps={30} durationInFrames={240} width={1080} height={1920} />
    <Composition id="CastLineup" component={CastLineup} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="CloseUp" component={CloseUp} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="ExpressionSheet" component={ExpressionSheet} fps={30} durationInFrames={1} width={1080} height={1920} />
  </>
);
