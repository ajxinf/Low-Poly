// Final render with the camera guard: a quick guard pass first (one tiny still per shot start), then the video.
// The guard also runs inside the full render, so a shot that only mounts later still fails with its id and frame.
// usage: node scripts/render.mjs <Composition> <out.mp4> [scale = 1] [--starts 0,190]
import { renderMedia, renderStill } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CHROMIUM, bundleOnce, fail, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
const si = args.indexOf("--starts");
const starts = si >= 0 ? args.splice(si, 2)[1].split(",").map(Number) : [0];
const [id, out, scaleArg = "1"] = args;
if (!id || !out) {
  console.error("usage: node scripts/render.mjs <Composition> <out.mp4> [scale] [--starts f1,f2 (first frame of each shot)]");
  process.exit(2);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, id).catch((e) => fail(id, e));
for (const frame of starts) {
  await renderStill({ composition, serveUrl, frame, scale: 0.15, output: path.join(os.tmpdir(), `guard_${id}.png`), chromiumOptions: CHROMIUM }).catch((e) =>
    fail(`${id} guard pass (frame ${frame})`, e),
  );
}
console.log(`camera guard ok (${starts.length} shot start${starts.length > 1 ? "s" : ""})`);
let last = -1;
await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  crf: 16,
  outputLocation: out,
  scale: Number(scaleArg),
  concurrency: 2,
  imageFormat: "jpeg",
  chromiumOptions: CHROMIUM,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) process.stdout.write(`${(last = p) * 10}% `);
  },
}).catch((e) => fail(`${id} render`, e));
console.log(`\n${out}`);
