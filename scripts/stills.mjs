// Stills for look checks, after QA layer 1 (kit/toon/guard.tsx: every frame of every shot; stops on a failure).
// usage: node scripts/stills.mjs <Composition> <out prefix, e.g. out/pilot/x_> <frames: 0,100,400> [scale = 0.5] [--starts 0,190]
import { renderStill } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";
import { CHROMIUM, bundleOnce, fail, guardPass, pick } from "./remotion-api.mjs";

const args = process.argv.slice(2);
const si = args.indexOf("--starts");
const starts = si >= 0 ? args.splice(si, 2)[1].split(",").map(Number) : [0];
const [id, prefix, framesArg = "0", scaleArg = "0.5"] = args;
if (!id || !prefix) {
  console.error("usage: node scripts/stills.mjs <Composition> <out prefix> <frames,comma,separated> [scale] [--starts f1,f2 (shot starts, only without a QAPlan)]");
  process.exit(2);
}
const frames = framesArg.split(",").map(Number);
fs.mkdirSync(path.dirname(prefix), { recursive: true });
const serveUrl = await bundleOnce();
const composition = await pick(serveUrl, id).catch((e) => fail(id, e));
if (!(await guardPass(serveUrl, composition, starts))) fail(id, "QA layer 1: failures above");
for (const frame of frames) {
  const output = `${prefix}${String(frame).padStart(4, "0")}.png`;
  await renderStill({ composition, serveUrl, output, frame, scale: Number(scaleArg), chromiumOptions: CHROMIUM }).catch((e) => fail(`${id} frame ${frame}`, e));
  console.log(output);
}
