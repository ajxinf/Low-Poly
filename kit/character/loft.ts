import { BufferGeometry, Float32BufferAttribute, Matrix4, Vector3 } from "three";

export type P = [number, number, number];
/** One vertex of a flat-shaded triangle soup. ao = vertex-colour brightness (1 = unshaded). */
export type V = { p: P; uv: [number, number]; ao: number };

/**
 * A cross-section: points go round from the back (θ=-π) through his right (-x), the front (+z), his left (+x).
 * x = r·sinθ, z = r·cosθ, or give `pts` as [x, z] in the same order. `y` and `ao` may be per point.
 */
export type Ring = { y: number | number[]; r?: number[]; pts?: [number, number][]; x?: number; z?: number; ao?: number | number[] };

export type LoftOptions = {
  /** true, or a number = how far the centre point rises above the ring (domes). */
  capTop?: boolean | number;
  capBottom?: boolean | number;
  /** Quad columns left open (column k joins point k to k+1), e.g. an open jacket front. */
  skip?: number[];
  /** θ → texture u. Default wraps linearly with the front at u=0.5. */
  uMap?: (theta: number) => number;
  /** Texture v range from first ring to last. */
  v?: [number, number];
  /** Inside-out: for linings seen from inside. */
  flip?: boolean;
};

/** Mirror a back→front half profile into a full symmetric ring: n half values → 2(n-1) points. */
export const sym = (half: number[]) => [...half, ...half.slice(1, -1).reverse()];

const at = (v: number | number[], k: number) => (Array.isArray(v) ? v[k] : v);
const mean = (v: number | number[]) => (Array.isArray(v) ? v.reduce((a, b) => a + b, 0) / v.length : v);

/** Joins cross-section rings into a faceted tube. Shapes stay editable as plain numbers. */
export const loft = (rings: Ring[], o: LoftOptions = {}): V[] => {
  const n = rings[0].pts?.length ?? rings[0].r!.length;
  const uMap = o.uMap ?? ((t: number) => (t + Math.PI) / (2 * Math.PI));
  const [v0, v1] = o.v ?? [0, 1];
  const ys = rings.map((r) => mean(r.y));
  const vOf = (i: number) => v0 + ((v1 - v0) * (ys[i] - ys[0])) / (ys[ys.length - 1] - ys[0] || 1);
  const pt = (i: number, k: number): V => {
    const ring = rings[i];
    const kk = k % n;
    const th = -Math.PI + (2 * Math.PI * k) / n;
    const [px, pz] = ring.pts?.[kk] ?? [ring.r![kk] * Math.sin(th), ring.r![kk] * Math.cos(th)];
    return {
      p: [(ring.x ?? 0) + px, at(ring.y, kk), (ring.z ?? 0) + pz],
      uv: [uMap(th), vOf(i)],
      ao: at(ring.ao ?? 1, kk),
    };
  };
  const out: V[] = [];
  const tri = (a: V, b: V, c: V) => (o.flip ? out.push(a, c, b) : out.push(a, b, c));
  for (let i = 0; i < rings.length - 1; i++) {
    for (let k = 0; k < n; k++) {
      if (o.skip?.includes(k)) continue;
      const a = pt(i, k), b = pt(i, k + 1), c = pt(i + 1, k + 1), d = pt(i + 1, k);
      tri(a, b, c);
      tri(a, c, d);
    }
  }
  const cap = (i: number, rise: number, top: boolean) => {
    const ring = Array.from({ length: n }, (_, k) => pt(i, k));
    const c: V = {
      p: [mean(ring.map((v) => v.p[0])), mean(ring.map((v) => v.p[1])) + rise, mean(ring.map((v) => v.p[2]))],
      uv: [0.5, vOf(i)],
      ao: mean(ring.map((v) => v.ao)),
    };
    for (let k = 0; k < n; k++) {
      const a = pt(i, k), b = pt(i, k + 1);
      if (top) tri(a, b, c);
      else tri(b, a, c);
    }
  };
  if (o.capTop) cap(rings.length - 1, typeof o.capTop === "number" ? o.capTop : 0, true);
  if (o.capBottom) cap(0, typeof o.capBottom === "number" ? -o.capBottom : 0, false);
  return out;
};

const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a: P, b: P): P => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: P, b: P) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
/** Unit normal of triangle abc (counter-clockwise = front). */
export const triNormal = (a: P, b: P, c: P): P => {
  const n = cross(sub(b, a), sub(c, a));
  const l = Math.hypot(...n) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
};
export const avgP = (ps: P[]): P => [mean(ps.map((p) => p[0])), mean(ps.map((p) => p[1])), mean(ps.map((p) => p[2]))];

/** Free triangles, each wound to face away from `inside`. */
export const facets = (tris: [P, P, P][], inside: P, uv: (p: P) => [number, number], ao: number | ((p: P) => number) = 1): V[] =>
  tris.flatMap(([a, b, c]) => {
    const outward = dot(cross(sub(b, a), sub(c, a)), sub(avgP([a, b, c]), inside)) >= 0;
    return (outward ? [a, b, c] : [a, c, b]).map((p) => ({ p, uv: uv(p), ao: typeof ao === "number" ? ao : ao(p) }));
  });

/** Both windings: thin flaps (ears, collar) visible from either side. */
export const twoSided = (vs: V[]) => [...vs, ...vs.flatMap((_, i) => (i % 3 === 0 ? [vs[i], vs[i + 2], vs[i + 1]] : []))];

/** Closed convex hull of `ps` given as quads/tris by index, outward-wound. */
export const solid = (ps: P[], faces: number[][], uv: (p: P) => [number, number], ao: number | ((p: P) => number) = 1) =>
  facets(
    faces.flatMap((f) => (f.length === 4 ? [[ps[f[0]], ps[f[1]], ps[f[2]]], [ps[f[0]], ps[f[2]], ps[f[3]]]] : [[ps[f[0]], ps[f[1]], ps[f[2]]]]) as [P, P, P][]),
    avgP(ps),
    uv,
    ao,
  );

const BOX_FACES = [[0, 1, 3, 2], [4, 5, 7, 6], [0, 1, 5, 4], [2, 3, 7, 6], [0, 2, 6, 4], [1, 3, 7, 5]];
/** Box (12 tris) of size [w,h,d]; `bottomScale` tapers the bottom (y-) face. */
export const box = (size: P, uv: (p: P) => [number, number], ao: number | ((p: P) => number) = 1, bottomScale = 1) => {
  const ps: P[] = [];
  for (const x of [-1, 1]) for (const y of [-1, 1]) for (const z of [-1, 1]) {
    const s = y < 0 ? bottomScale : 1;
    ps.push([(x * s * size[0]) / 2, (y * size[1]) / 2, (z * s * size[2]) / 2]);
  }
  return solid(ps, BOX_FACES, uv, ao);
};

export const transform = (vs: V[], m: Matrix4): V[] => {
  const t = new Vector3();
  return vs.map((v) => ({ ...v, p: t.set(...v.p).applyMatrix4(m).toArray() as P }));
};

export const triCount = (vs: V[]) => vs.length / 3;

/** Triangle soup → geometry with flat facet normals, uvs and greyscale vertex colours. */
export const toGeometry = (vs: V[]) => {
  const g = new BufferGeometry();
  g.setAttribute("position", new Float32BufferAttribute(vs.flatMap((v) => v.p), 3));
  g.setAttribute("uv", new Float32BufferAttribute(vs.flatMap((v) => v.uv), 2));
  g.setAttribute("color", new Float32BufferAttribute(vs.flatMap((v) => [v.ao, v.ao, v.ao]), 3));
  g.computeVertexNormals();
  return g;
};
