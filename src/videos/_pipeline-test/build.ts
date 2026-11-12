import { BoxGeometry, CylinderGeometry, DoubleSide, Group, Mesh, MeshBasicMaterial, Object3D, PlaneGeometry, Vector3 } from "three";
import { StreetOpts, spine } from "../../../kit/toon/build/street";
import { Kit, M, MAT } from "../../../kit/toon/build/kit";
import { NOINK } from "../../../kit/toon/ink";
import { painted, strokes } from "../../../kit/toon/paint";
import { toonMaterial } from "../../../kit/toon/shade";

// World layout for _pipeline-test: a pedestrianised Victorian street by day, a café table in the carriageway
// (shots 1-2), replaced by a 10-foot table, a tall stool and a step ladder after the time jump (shot 3).
export const CURVE = 0.0018;
export const SP = spine(CURVE);
/** Point at arc length s (m down the street), x m right of the centre line, height y. */
export const at = SP.at;

export const CAFE = { s: 16, x: 0.55, h: 0.75 }; // normal café table
export const TALL = { s: 16, x: 0.55, h: 3.0, half: 0.475 }; // the 10-foot (3.05 m) table, rounded to 3 m
export const STOOL = { s: 15.15, x: -0.2, h: 2.4 }; // you stand at the table top like a bar
const LEAN = 0.9; // ladder foot this far in front of the table face
export const RUNG_Y = 0.9;
const LADDER_X = 1.1;
/** The friend's tread on the ladder (feet position). */
export const TREAD = at(TALL.s + TALL.half + LEAN * (1 - RUNG_Y / TALL.h), LADDER_X, RUNG_Y);

const named = (o: Object3D, name: string, p: Vector3) => {
  o.position.copy(p);
  o.userData.collider = name;
  return o;
};

const cafeTable = () => {
  const k = new Kit();
  k.add(MAT.color("#2e4a5a"), new CylinderGeometry(0.42, 0.42, 0.04, 24), 0, CAFE.h - 0.02, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.035, 0.035, CAFE.h - 0.04, 10), 0, (CAFE.h - 0.04) / 2, 0);
  k.add(MAT.metal(), new CylinderGeometry(0.26, 0.28, 0.03, 18), 0, 0.015, 0);
  return k.build();
};

const tallTable = () => {
  // Round teal top like the café table (reads as "the same table, taller"), legs inside the top's footprint.
  const k = new Kit(), m = MAT.color("#2e4a5a"), h = TALL.h, d = TALL.half - 0.17;
  k.add(m, new CylinderGeometry(TALL.half, TALL.half, 0.05, 28), 0, h - 0.025, 0);
  for (const x of [-d, d]) for (const z of [-d, d]) k.box(MAT.metal(), 0.06, h - 0.05, 0.06, x, (h - 0.05) / 2, z);
  for (const y of [0.9, 1.9]) for (const z of [-d, d]) k.box(MAT.metal(), d * 2, 0.04, 0.04, 0, y, z);
  return k.build();
};

/** Tall wooden stool for "you": a platform STOOL.h high with a top you stand on. */
const stool = () => {
  const k = new Kit(), w = 0.32;
  const red = MAT.color("#b8483a"); // painted red: stands apart from the table's dark legs and the ladder
  k.box(red, 0.7, 0.06, 0.7, 0, STOOL.h - 0.03, 0);
  for (const x of [-w, w]) for (const z of [-w, w]) k.box(red, 0.06, STOOL.h - 0.06, 0.06, x, (STOOL.h - 0.06) / 2, z);
  for (const y of [0.7, 1.5]) k.box(red, 0.7, 0.04, 0.04, 0, y, w);
  return k.build();
};

/** Step ladder leaning against the tall table's front face: wide rails (±0.45) so the friend fits between them. */
const ladder = () => {
  const k = new Kit(), len = Math.hypot(TALL.h, LEAN) * (2.9 / TALL.h), tilt = Math.atan2(LEAN, TALL.h);
  const g = new Group();
  for (const x of [-0.45, 0.45]) k.add(MAT.wood(), new BoxGeometry(0.06, len, 0.06), x, len / 2, 0);
  const rails = k.build();
  rails.rotation.x = tilt; // top leans toward the table (+z local), stopping 3 cm short of its face
  g.add(rails);
  const t = new Kit();
  for (let y = 0.3; y < TALL.h - 0.2; y += 0.6) {
    const off = (LEAN * y) / TALL.h; // treads sit on the leaning rails (+z local = toward the table), flat
    t.box(MAT.wood(), 0.84, 0.04, 0.16, 0, y - 0.02, off);
  }
  g.add(t.build());
  return g;
};

/** Buttered toast, centred on its own middle (crust 3.6 cm thick, butter on +y). Cartoon-sized: 27 cm, so it reads in wides. */
export const TOAST_HALF = 0.018;
export const toastMesh = () => {
  const k = new Kit();
  // Dark crust all round, pale crumb + a thick butter pat on +y only, so the two faces read differently.
  k.box(MAT.color("#7a4a26"), 0.27, 0.036, 0.27, 0, 0, 0);
  k.box(MAT.color("#ead6a8"), 0.235, 0.003, 0.235, 0, 0.0185, 0);
  k.box(M("butter", () => toonMaterial({ color: "#f5cf3c" })), 0.17, 0.014, 0.15, 0.01, 0.026, 0);
  return k.build();
};

/** The friend's judge card "½" on a short stick (unlit sign face so it never goes grey). */
export const scoreCard = () => {
  const tex = painted("score-half", 256, 256, (ctx, r) => {
    ctx.fillStyle = "#f4ece0";
    ctx.fillRect(0, 0, 256, 256);
    strokes(ctx, r, 256, 256, 40, ["#e6dccb", "#fbf5ea"], 40, 3, 0.4, 0);
    ctx.strokeStyle = "#1c1210";
    ctx.lineWidth = 12;
    ctx.strokeRect(8, 8, 240, 240);
    ctx.fillStyle = "#1c1210";
    ctx.font = "bold 190px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("½", 128, 140);
  });
  const g = new Group();
  const face = new Mesh(new PlaneGeometry(0.34, 0.34), new MeshBasicMaterial({ map: tex, side: DoubleSide, toneMapped: false }));
  face.position.y = 0.4;
  face.layers.set(NOINK); // the card carries its own painted border
  const stick = new Mesh(new BoxGeometry(0.025, 0.4, 0.025), MAT.darkWood());
  stick.position.y = 0.12;
  g.add(face, stick);
  return g;
};

const baseOpts: StreetOpts = {
  seed: 41,
  length: 40,
  curve: CURVE,
  lamps: [[7, 1], [19, -1], [31, 1]],
  landmark: false,
  lightCenter: at(16, 0, 2),
};
/** Shots 1-2: the café table. */
export const OPTS_CAFE: StreetOpts = { ...baseOpts, extra: () => [named(cafeTable(), "cafe table", at(CAFE.s, CAFE.x))] };
/** Shot 3: the 10-foot table, your stool, the friend's ladder. */
export const OPTS_TALL: StreetOpts = {
  ...baseOpts,
  extra: () => [
    named(tallTable(), "tall table", at(TALL.s, TALL.x)),
    named(stool(), "stool", at(STOOL.s, STOOL.x)),
    named(ladder(), "ladder", at(TALL.s + TALL.half + LEAN, LADDER_X)),
  ],
};
