// Final render after QA layer 1 (kit/toon/guard.tsx; writes out/<slug>/plan.json for layer 2), then the video.
// The guard also runs inside the full render, so a shot that only mounts later still fails with its id and frame.
// usage: node scripts/render.mjs <Composition> <out.mp4> [scale = 1] [--starts 0,190 (only without a QAPlan)]
import { renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, bundleOnce, fail, guardPass, pick } from "./remotion-api.mjs";

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
if (!(await guardPass(serveUrl, composition, starts))) fail(id, "QA layer 1: failures above");
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
