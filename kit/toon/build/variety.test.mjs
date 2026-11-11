// Self-check for the street variety rule: node kit/toon/build/variety.test.mjs
import { differences, minDifference, pickVaried } from "./variety.ts";

const assert = (ok, msg) => {
  if (!ok) throw new Error(msg);
};
assert(differences({ a: 1, b: "x", c: true }, { a: 1, b: "y", c: false }) === 2, "differences counts changed keys");
// Same parameter set as building facts (12 params, few options each): pickVaried must keep every pair >= 3 apart.
let seed = 3;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const one = (a) => a[Math.floor(rnd() * a.length)];
const make = () => ({
  floors: one([2, 3, 4]), width: one([5, 6, 7]), wall: one(["brick", "plaster"]), color: one(["a", "b", "c", "d"]),
  roof: one(["gable", "hip", "flat"]), roofColor: one(["r1", "r2", "r3"]), windows: one(["sash", "shutters", "flowerBox"]),
  shop: rnd() < 0.4, awning: rnd() < 0.3, chimneys: one([0, 1, 2]), lean: one(["l", "0", "r"]), roofline: one([0, 1]),
});
const picked = [];
for (let i = 0; i < 18; i++) picked.push(pickVaried(make, (f) => f, picked));
assert(minDifference(picked) >= 3, `min difference ${minDifference(picked)} < 3`);
console.log("variety ok: 18 buildings, min difference", minDifference(picked));
