import { AbsoluteFill, OffthreadVideo, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from "remotion";
import { z } from "zod";

export const FPS = 30;

// Measured from final.mp4 via ffprobe (1080x1920 @ 30fps, 98.35s).
export const MAIN_VIDEO_FRAMES = 2951;

export const HOOK_CARD_FRAMES = 36; // 1.2s animated hook card
export const CROSSFADE_FRAMES = 12; // hook card dissolves into main
export const MAIN_START = HOOK_CARD_FRAMES - CROSSFADE_FRAMES; // 24
export const OUTRO_CARD_FRAMES = 45; // 1.5s pop-in outro card
export const MAIN_FADE_OUT = 20; // main dips before outro card

export const getMeta = () => ({
  width: 1080,
  height: 1920,
  durationInFrames: MAIN_START + MAIN_VIDEO_FRAMES + OUTRO_CARD_FRAMES,
});

export const autoEditSchema = z.object({
  mainVideo: z.string(),
  hookCard: z.string(),
  outroCard: z.string(),
});

export const AutoEdit: React.FC<z.infer<typeof autoEditSchema>> = ({ mainVideo, hookCard, outroCard }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();
  const mainEnd = MAIN_START + MAIN_VIDEO_FRAMES;

  // --- Hook card (0 .. HOOK_CARD_FRAMES): slow push-in, crossfades into main ---
  const hookScale = interpolate(frame, [0, HOOK_CARD_FRAMES], [1.0, 1.06], { easing: Easing.inOut(Easing.ease) });
  const hookOpacity = interpolate(frame, [CROSSFADE_FRAMES, HOOK_CARD_FRAMES], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // --- Main video: subtle ken-burns + fade in during crossfade, dip to dark before outro ---
  const mainOpacity = interpolate(frame, [MAIN_START, MAIN_START + CROSSFADE_FRAMES], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mainOut = interpolate(frame, [mainEnd - MAIN_FADE_OUT, mainEnd], [1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.in(Easing.ease) });
  const mainProgress = (frame - MAIN_START) / MAIN_VIDEO_FRAMES;
  const mainScale = 1.0 + 0.02 * Math.min(Math.max(mainProgress, 0), 1);

  // --- Outro card: spring pop-in after main ends ---
  const outroLocal = frame - mainEnd;
  const outroSpring = spring({ frame: outroLocal, fps, config: { damping: 14, stiffness: 130 } });
  const outroScale = 0.88 + 0.12 * outroSpring;
  const outroOpacity = interpolate(outroLocal, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outroVisible = outroLocal >= 0;

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* Main episode (ken-burns inside overflow-hidden frame) */}
      <AbsoluteFill style={{ opacity: mainOpacity * mainOut, transform: `scale(${mainScale})`, overflow: "hidden" }}>
        <OffthreadVideo src={staticFile(mainVideo)} />
      </AbsoluteFill>

      {/* Animated hook card on top during the intro */}
      {frame < HOOK_CARD_FRAMES ? (
        <AbsoluteFill style={{ opacity: hookOpacity }}>
          <img
            src={staticFile(hookCard)}
            style={{ width: "100%", height: "100%", objectFit: "contain", transform: `scale(${hookScale})` }}
          />
        </AbsoluteFill>
      ) : null}

      {/* Pop-in outro card */}
      {outroVisible ? (
        <AbsoluteFill style={{ opacity: outroOpacity, transform: `scale(${outroScale})` }}>
          <img src={staticFile(outroCard)} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
