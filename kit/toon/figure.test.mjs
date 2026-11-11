// Self-check for the character acceptance numbers (LOOK_SPEC section 4): node kit/toon/figure.test.mjs
import { register } from "node:module";

// The kit imports without extensions (bundler style): resolve "./x" to "./x.ts" for Node's type stripping.
register("data:text/javascript," + encodeURIComponent(
  "export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (s.startsWith('.') && !/\\.[a-z]+$/.test(s)) return next(s + '.ts', c); throw e; } }",
));
const { EXTRAS } = await import("./extras.ts");
const { measureLook } = await import("./figure.ts");
const { youLook } = await import("./protagonist.ts");

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
for (const { name, look } of [{ name: "you", look: youLook }, ...EXTRAS]) {
  const m = measureLook(look);
  const kid = name.startsWith("child");
  const [lo, hi] = kid ? [2.75, 2.95] : [3.4, 3.6];
  console.log(`${name.padEnd(24)} ${m.heads.toFixed(2)} HH  H/W ${m.hw.toFixed(3)}  ink ${m.thickThin.toFixed(2)}:1  ${m.meters.toFixed(2)} m`);
  assert(m.heads >= lo && m.heads <= hi, `${name}: ${m.heads.toFixed(2)} HH outside ${lo}-${hi}`);
  assert(m.hw >= 0.9 && m.hw <= 0.98, `${name}: head H/W ${m.hw.toFixed(3)} outside 0.90-0.98`);
  assert(m.thickThin >= 2.5, `${name}: thick/thin ${m.thickThin.toFixed(2)} < 2.5`);
}
console.log("figure ok");
