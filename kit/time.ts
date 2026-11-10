// Holds each pose for compFps/fps frames, so characters animate at 15fps while the camera stays at 30fps.
export const steppedFrame = (frame: number, fps = 15, compFps = 30) => {
  const step = compFps / fps;
  return Math.floor(frame / step) * step;
};
