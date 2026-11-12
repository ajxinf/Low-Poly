import { Composition } from "remotion";
import { CastLineup, CloseUp } from "./CastLineup";
import { CharacterTest } from "./CharacterTest";
import { CastSheet } from "./CastSheet";
import { ExpressionSheet } from "./ExpressionSheet";
import { ToonTest } from "./ToonTest";
import { PresetWide, StreetMedium, StreetWide } from "./StreetShots";
import { SupermarketMedium, SupermarketNight, SupermarketWide } from "./Supermarket";
import { PRESETS, PresetName } from "../kit/toon/build/presets";
import { PipelineTest } from "./videos/_pipeline-test/Video";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ToonTest" component={ToonTest} fps={30} durationInFrames={150} width={1080} height={1920} />
    <Composition id="CharacterTest" component={CharacterTest} fps={30} durationInFrames={240} width={1080} height={1920} />
    <Composition id="CastLineup" component={CastLineup} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="CloseUp" component={CloseUp} fps={30} durationInFrames={30} width={1080} height={1920} />
    <Composition id="StreetWide" component={StreetWide} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="StreetMedium" component={StreetMedium} fps={30} durationInFrames={90} width={1080} height={1920} />
    {(Object.keys(PRESETS) as PresetName[]).map((n) => (
      <Composition key={n} id={`Preset-${n.replace(/_/g, "-")}`} component={PresetWide} defaultProps={{ name: n }} fps={30} durationInFrames={90} width={1080} height={1920} />
    ))}
    <Composition id="SupermarketWide" component={SupermarketWide} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="SupermarketMedium" component={SupermarketMedium} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="SupermarketNight" component={SupermarketNight} fps={30} durationInFrames={90} width={1080} height={1920} />
    <Composition id="ExpressionSheet" component={ExpressionSheet} fps={30} durationInFrames={1} width={1080} height={1920} />
    <Composition id="CastSheet" component={CastSheet} fps={30} durationInFrames={1} width={1080} height={1920} />
    <Composition id="PipelineTest" component={PipelineTest} fps={30} durationInFrames={450} width={1080} height={1920} />
  </>
);
