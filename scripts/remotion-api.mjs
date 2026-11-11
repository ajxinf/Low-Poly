// Shared setup for the render scripts: temp dir on C:/remotion-tmp (Windows), one bundle per run, laptop GPU flags.
import { bundle } from "@remotion/bundler";
import { selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

if (process.platform === "win32") {
  fs.mkdirSync("C:/remotion-tmp", { recursive: true });
  process.env.TEMP = process.env.TMP = "C:/remotion-tmp"; // bundles copy public/ into TEMP and never clean up
}

export const CHROMIUM = { gl: "angle" };

export const bundleOnce = () => bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });

export const pick = (serveUrl, id, inputProps = {}) => selectComposition({ serveUrl, id, inputProps, chromiumOptions: CHROMIUM });

/** Camera-guard failures (and any render error) end the run with the shot id and frame, exit code 1. */
export const fail = (what, err) => {
  const msg = String(err?.message ?? err);
  const guard = msg.match(/Camera guard: [^\n]*/);
  console.error(`\n${what} FAILED: ${guard ? guard[0] : msg.split("\n")[0]}`);
  process.exit(1);
};
