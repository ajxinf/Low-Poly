// Stills for look checks, with the camera guard (every shot's whole path is checked when its camera mounts).
// usage: node scripts/stills.mjs <Composition> <out prefix, e.g. out/pilot/x_> <frames: 0,100,400> [scale = 0.5]
import { renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, bundleOnce, fail, pick } from "./remotion-api.mjs";

const [id, prefix, framesArg = "0", scaleArg = "0.5"] = process.argv.slice(2);
if (!id || !prefix) {
  console.error("usage: node scripts/stills.mjs <Composition> <out prefix> <frames,comma,separated> [scale]");
  process.exit(2);
}
const frames = framesArg.split(",").map(Number);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, id).catch((e) => fail(id, e));
for (const frame of frames) {
  const output = `${prefix}${String(frame).padStart(4, "0")}.png`;
  await renderStill({ composition, serveUrl, output, frame, scale: Number(scaleArg), chromiumOptions: CHROMIUM }).catch((e) => fail(`${id} frame ${frame}`, e));
  console.log(output);
}
