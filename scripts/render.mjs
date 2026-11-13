// Final render after QA layer 1 (kit/toon/guard.tsx; writes out/<slug>/plan.json for layer 2), then the video.
// The guard also runs inside the full render, so a shot that only mounts later still fails with its id and frame.
// usage: node scripts/render.mjs <Composition> <out.mp4> [scale = 1 (1080p)] [--concurrency 1] [--starts 0,190 (only without a QAPlan)]
import { renderMedia } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, bundleOnce, fail, guardPass, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
const si = args.indexOf("--starts");
const starts = si >= 0 ? args.splice(si, 2)[1].split(",").map(Number) : [0];
const ci = args.indexOf("--concurrency");
const concurrency = ci >= 0 ? Number(args.splice(ci, 2)[1]) : 1; // 16 GB RAM / 4 GB VRAM: 2 ran out of memory on the 80 s pilot (2026-11-13)
const [id, out, scaleArg = "1"] = args;
// "4/3" for the 2K export: 1.3333 gives 2559.936 px, and Remotion needs whole-pixel sizes.
const [num, den = "1"] = scaleArg.split("/");
const scale = Number(num) / Number(den);
if (!id || !out) {
  console.error("usage: node scripts/render.mjs <Composition> <out.mp4> [scale] [--starts f1,f2 (first frame of each shot)]");
  process.exit(2);
}
fs.mkdirSync(path.dirname(out), { recursive: true });
const t0 = performance.now();
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
  scale,
  concurrency,
  imageFormat: "jpeg",
  chromiumOptions: CHROMIUM,
  onProgress: ({ progress }) => {
    const p = Math.floor(progress * 10);
    if (p !== last) process.stdout.write(`${(last = p) * 10}% `);
  },
}).catch((e) => fail(`${id} render`, e));
console.log(`\n${out} (concurrency ${concurrency}, ${((performance.now() - t0) / 1000).toFixed(0)} s incl. bundle + QA layer 1)`);
