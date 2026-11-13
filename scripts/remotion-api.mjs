// Shared setup for the render scripts: temp dir on C:/remotion-tmp (Windows), one bundle per run, laptop GPU flags.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

if (process.platform === "win32") {
  fs.mkdirSync("C:/remotion-tmp", { recursive: true });
  process.env.TEMP = process.env.TMP = "C:/remotion-tmp"; // bundles copy public/ into TEMP and never clean up
}

export const CHROMIUM = { gl: "angle" };

export const bundleOnce = () => bundle({ entryPoint: path.resolve("src/index.ts"), rspack: true });

export const pick = (serveUrl, id, inputProps = {}) => selectComposition({ serveUrl, id, inputProps, chromiumOptions: CHROMIUM });

/** Guard failures (and any render error) end the run with the shot id and frame, exit code 1. */
export const fail = (what, err) => {
  const msg = String(err?.message ?? err);
  const guard = msg.match(/QA layer 1: [^\n]*/);
  console.error(`\n${what} FAILED: ${guard ? guard[0] : msg.split("\n")[0]}`);
  process.exit(1);
};

const CHECKS = ["Camera clearance", "Feet on the ground", "Card penetration", "Props through props", "Camera curve",
  "Subject in frame", "Caption vs face", "Caption width", "Reaction timing", "Light continuity", "Shadows", "Moving props", "Scale", "Cast overlap", "Subject size", "Pacing"];

/**
 * QA layer 1 (kit/toon/guard.tsx): one tiny still at frame 0 (plan checks + the plan's shot list), then one at each
 * shot start (scene checks). Writes out/<slug>/plan.json and out/<slug>/layer1.md. Returns true when nothing failed.
 * Compositions without a <QAPlan> only get the scene checks of the shots mounted at `starts`.
 */
export const guardPass = async (serveUrl, composition, starts = [0]) => {
  const logs = new Map(), errors = [];
  const still = (frame) =>
    renderStill({
      composition, serveUrl, frame, scale: 0.1, chromiumOptions: CHROMIUM,
      output: path.join(os.tmpdir(), `guard_${composition.id}.png`),
      inputProps: { ...composition.props, qa: "collect" },
      onBrowserLog: ({ text }) => void (text.startsWith("QA1 ") && logs.set(text, JSON.parse(text.slice(4)))),
    }).catch((e) => errors.push(`frame ${frame}: ${String(e?.message ?? e).split("\n")[0]}`));
  await still(0);
  const plan = [...logs.values()].find((l) => l.kind === "plan");
  for (const f of plan ? plan.plan.shots.map((s) => s.from) : starts) if (f !== 0) await still(f);

  const results = [...logs.values()];
  const shots = new Set(results.filter((l) => l.kind === "shot").map((l) => l.id));
  const fails = [...new Map(results.flatMap((l) => l.fails).map((x) => [JSON.stringify(x), x])).values()];
  const ran = new Set(results.flatMap((l) => l.ran)), na = Object.assign({}, ...results.map((l) => l.na));
  const missing = plan ? plan.plan.shots.filter((s) => !shots.has(s.id)).map((s) => s.id) : [];
  const dir = path.join("out", plan?.slug ?? composition.id);
  fs.mkdirSync(dir, { recursive: true });
  if (plan) fs.writeFileSync(path.join(dir, "plan.json"), JSON.stringify(plan.plan, null, 1));
  fs.writeFileSync(path.join(dir, "layer1.json"), JSON.stringify(results, null, 1));
  // short_qa.py's own format: shots [{id, a, b}], xfade [[a, b]], flash [a, b] (one span).
  if (plan) {
    const { shots: sh, xfade, flash, kicks, whips } = plan.plan;
    fs.writeFileSync(path.join(dir, "shots.json"), JSON.stringify({ shots: sh.map((x) => ({ id: x.id, a: x.from, b: x.from + x.frames - 1 })), xfade, planned: [...kicks, ...whips], ...(flash.length ? { flash: flash[0] } : {}) }));
  }

  const real = fails.filter((x) => !x.intended);
  const row = (c) => {
    const n = real.filter((x) => x.check === c).length, i = fails.filter((x) => x.check === c && x.intended).length;
    if (n) return `| ${c} | FAIL (${n}) |`;
    if (ran.has(c)) return `| ${c} | pass${i ? ` (${i} intended)` : ""} |`;
    return `| ${c} | n/a${na[c] ? ` (${na[c]})` : plan ? "" : " (no QAPlan)"} |`;
  };
  const range = (x) => `f${x.frame}${x.to > x.frame ? `-${x.to}` : ""}`;
  const fmt = (x) => `- ${x.intended ? "(intended) " : ""}**${x.check}** \`${x.shot}\` ${range(x)}: ${x.object}: ${x.note}${x.intended ? ` (${x.intended})` : ""}`;
  const md = [
    `# QA layer 1: ${composition.id}`,
    `${plan ? plan.plan.shots.length : starts.length} shot(s), scene checks ran on ${shots.size}${missing.length ? ` (MISSING: ${missing.join(", ")})` : ""}.`,
    "",
    "| Check | Result |",
    "|---|---|",
    ...CHECKS.map(row),
    "",
    ...fails.map(fmt),
    ...errors.map((e) => `- render error ${e}`),
  ].join("\n");
  fs.writeFileSync(path.join(dir, "layer1.md"), md + "\n");
  console.log(`${md}\n\n${path.join(dir, "layer1.md")}${plan ? `, ${path.join(dir, "plan.json")}` : ""}`);
  return !real.length && !errors.length && !missing.length;
};
