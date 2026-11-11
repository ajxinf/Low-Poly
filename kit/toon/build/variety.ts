/**
 * "Every building in a street differs from every other in at least 3 parameters." Pure helpers (no three), so the
 * rule can be self-tested with plain node: `node kit/toon/build/variety.test.ts`.
 */
export type Facts = Record<string, string | number | boolean>;

/** Number of parameters in which two buildings differ. */
export const differences = (a: Facts, b: Facts) => Object.keys(a).filter((k) => a[k] !== b[k]).length;

/** Smallest pairwise difference count in a set. */
export const minDifference = (all: Facts[]) => {
  let m = Infinity;
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) m = Math.min(m, differences(all[i], all[j]));
  return m;
};

/**
 * Draw candidates until one differs from every earlier pick in >= `min` facts (up to `tries`); returns the best
 * candidate found. `make(attempt)` must vary with the attempt number.
 */
export const pickVaried = <T>(make: (attempt: number) => T, facts: (t: T) => Facts, earlier: Facts[], min = 3, tries = 60): T => {
  let best = make(0), bestD = -1;
  for (let a = 0; a < tries; a++) {
    const c = a === 0 ? best : make(a);
    const d = earlier.length ? Math.min(...earlier.map((e) => differences(facts(c), e))) : Infinity;
    if (d >= min) return c;
    if (d > bestD) [best, bestD] = [c, d];
  }
  return best;
};
