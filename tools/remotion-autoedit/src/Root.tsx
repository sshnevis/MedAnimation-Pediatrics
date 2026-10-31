import { Composition } from "remotion";
import { AutoEdit, autoEditSchema, FPS, getMeta } from "./AutoEdit";

export const RemotionRoot: React.FC = () => {
  const meta = getMeta();
  return (
    <Composition
      id="AutoEdit"
      component={AutoEdit}
      durationInFrames={meta.durationInFrames}
      fps={FPS}
      width={meta.width}
      height={meta.height}
      schema={autoEditSchema}
      defaultProps={{ mainVideo: "final.mp4", hookCard: "hook-intro.png", outroCard: "hook-outro.png" }}
    />
  );
};
