// "You can end the world... but you can't open a window" (62.3 s). Timed to voice/words2.json (frame = round(s * 30)).
// Line starts: L1 0 | L2 146 | L3 345 | L4 468 | L5 638 | L6 859 | L7 967 | L8 1134 | L9 1242 | L10 1566 | L11 1771
// Key words: powerful 27, not allowed 92, window 124 | staff moved 254-315 | doesn't open 410-417, none 441 |
// phone 493, takes it 537-550, Obama/iPhone 571-611 | keys 657-664, takes those too 711-729, Johnson 822 |
// breakfast free 864-883, pancakes 910, bacon 932, works 945 | bill 1020, meal 1038, snack 1065, toothpaste 1099 |
// Wait 1134, groceries 1208 | hotel 1287, state dinners 1391, Air Force One 1417-1432, food 1454, dry cleaning 1476,
// toothpaste 1499, tab 1542 | card 1604, codes 1655, aide 1702, lost 1719, months 1744 | end the world 1791-1800,
// can't open a window 1833-1855.
export const FPS = 30;
export const TOTAL = 1868;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// ---------------- sets ----------------
export const BED: V3 = [0, 0, 0];
export const WH: V3 = [400, 0, 0];
export const OFF: V3 = [-400, 0, 0];
export const DIN: V3 = [0, 0, -400];
export const WIN_C: V3 = [WH[0] - 11, 10.4, 0];
export const DESK_TOP = 0.8;
export const TABLE_TOP = 0.78;
export const YOU_DESK: V3 = [OFF[0], 0, -2.45];
export const YOU_BED: V3 = [0, 0.64, -2.3];
export const YOU_WIN: V3 = [2.72, 0, -2.45];   // beside the bedroom window, right arm up on the sash
export const YOU_TABLE: V3 = [DIN[0], 0, DIN[2] - 1.05];
export const CAR_AT: V3 = [WH[0] + 9.5, 0, 15];
export const RECEIPT_AT: V3 = [DIN[0] + 0.38, TABLE_TOP + 0.004, DIN[2] - 0.02];

export type LightName = "int" | "day" | "golden";
export type ShotDef = { id: number; a: number; b: number; light: LightName; sunAz: number; sunEl: number; fancy?: boolean };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 89, light: "int", sunAz: 155, sunEl: 34 },          // office: the most powerful person on Earth
  { id: 2, a: 89, b: 146, light: "int", sunAz: 140, sunEl: 38 },        // bedroom window: not allowed to open it
  { id: 3, a: 146, b: 345, light: "int", sunAz: 140, sunEl: 38 },       // first morning, boxes pop in
  { id: 4, a: 345, b: 441, light: "int", sunAz: 140, sunEl: 38 },       // walk to the window, it won't open
  { id: 5, a: 441, b: 468, light: "day", sunAz: 125, sunEl: 42 },       // none of them do (pan across the facade)
  { id: 6, a: 468, b: 638, light: "int", sunAz: 155, sunEl: 34 },       // phone taken
  { id: 7, a: 638, b: 859, light: "day", sunAz: 120, sunEl: 40 },       // car keys taken
  { id: 8, a: 859, b: 967, light: "int", sunAz: 150, sunEl: 36 },       // breakfast is free
  { id: 9, a: 967, b: 1134, light: "int", sunAz: 150, sunEl: 36 },      // the bill
  { id: 10, a: 1134, b: 1242, light: "int", sunAz: 150, sunEl: 36 },    // Wait...
  { id: 11, a: 1242, b: 1385, light: "golden", sunAz: 160, sunEl: 14 },   // You see: like a hotel
  { id: 12, a: 1385, b: 1415, light: "int", sunAz: 150, sunEl: 36, fancy: true }, // state dinners
  { id: 13, a: 1415, b: 1449, light: "golden", sunAz: 160, sunEl: 14 },   // Air Force One
  { id: 14, a: 1449, b: 1566, light: "int", sunAz: 150, sunEl: 36 },    // your tab
  { id: 15, a: 1566, b: 1681, light: "int", sunAz: 155, sunEl: 34 },    // the codes card
  { id: 16, a: 1681, b: 1771, light: "int", sunAz: 155, sunEl: 34 },    // the aide lost it
  { id: 17, a: 1771, b: 1830, light: "int", sunAz: 155, sunEl: 34 },    // you can end the world...
  { id: 18, a: 1830, b: TOTAL, light: "int", sunAz: 140, sunEl: 38 },   // ...you just can't open a window (loops to shot 2)
];
/** crossfades at place changes (frames) */
export const XFADE: Record<number, number> = { 7: 8, 8: 8, 11: 8, 15: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};
export const FLASH_AT = 146; // white flash after the hook

// ---------------- camera ----------------
export type Cam = { pos: V3; look: V3; fov: number; roll: number };
type Shot = Partial<Cam> & { pos: V3; look: V3 };
type Key = { f: number; dur?: number; cut?: boolean; s: (f: number) => Shot };
export const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const mix = (a: Cam, b: Cam, k: number): Cam => ({
  pos: a.pos.map((v, i) => v + (b.pos[i] - v) * k) as V3, look: a.look.map((v, i) => v + (b.look[i] - v) * k) as V3,
  fov: a.fov + (b.fov - a.fov) * k, roll: a.roll + (b.roll - a.roll) * k,
});
const full = (c: Shot): Cam => ({ fov: 40, roll: 0, ...c });
const run = (keys: Key[], f: number) => {
  let cur = full(keys[0].s(f));
  for (let i = 1; i < keys.length; i++) {
    const k = keys[i];
    if (f < k.f) break;
    cur = k.cut ? full(k.s(f)) : mix(cur, full(k.s(f)), glide((f - k.f) / (k.dur ?? 24)));
  }
  return cur;
};
const pushK = (f: number, f0: number, rate: number, punch = 0, n = 35) => {
  const x = Math.max(0, f - f0);
  let s = rate * x;
  if (punch > rate) for (let i = 0; i < Math.min(x, n); i++) s += (punch - rate) * Math.max(0, Math.min(1, (i + 0.5) / 8, (n - i - 0.5) / 8));
  return Math.exp(-s);
};
const dolly = (pos: V3, look: V3, k: number, rest: Partial<Cam> = {}): Shot =>
  ({ pos: [look[0] + (pos[0] - look[0]) * k, look[1] + (pos[1] - look[1]) * k, look[2] + (pos[2] - look[2]) * k], look, ...rest });

// office
const OFFwide = (f0: number, punch = 0, pf = 0) => (f: number) => dolly(add(OFF, [-0.25, 1.7, 3.0]), add(OFF, [0.35, 1.2, -1.9]), pushK(f, f0, 0.0018, punch, 30) * (pf ? pushK(f, pf, 0.0, 0) : 1), { fov: 46 });
const OFFyouCU = (f0: number, roll = 0.04) => (f: number) => dolly(add(OFF, [0.36, 1.55, -0.6]), add(OFF, [0, 1.45, -2.45]), pushK(f, f0, 0.003), { fov: 36, roll });
const OFFaideCU = (x: number, z: number, f0: number) => (f: number) => dolly([x - 0.9, 1.55, z + 1.75], [x, 1.45, z], pushK(f, f0, 0.003), { fov: 36, roll: -0.04 });
const OFFhands = (f0: number) => (f: number) => dolly(add(OFF, [0.85, 1.45, -0.5]), add(OFF, [0.8, 1.25, -1.5]), pushK(f, f0, 0.003, 0.006, 20), { fov: 36 });
// bedroom
const BEDwide = (f0: number) => (f: number) => dolly([1.05, 1.6, 1.45], [0.2, 1.2, -2.0], pushK(f, f0, 0.0022), { fov: 50 });
const WINpush = (f0: number, roll = -0.04) => (f: number) => dolly([0.8, 1.6, 0.0], [2.8, 1.55, -1.95], pushK(f, f0, 0.003, 0.006, 24), { fov: 48, roll });
const BEDwalk = (f0: number) => (f: number) => dolly([0.2, 1.65, 1.3], [1.8, 1.25, -1.6], pushK(f, f0, 0.002), { fov: 50 });
// lawn
const FACADEpan = (f: number): Shot => { const u = glide((f - 441) / 27); return { pos: add(WH, [-14 + 20 * u, 6, 30]), look: add(WH, [-14 + 20 * u, 8.5, 0]), fov: 44, roll: 0 }; };
const CARwide = (f0: number) => (f: number) => dolly(add(CAR_AT, [-4.6, 2.2, 10.5]), add(CAR_AT, [-2.2, 1.2, 1.0]), pushK(f, f0, 0.002), { fov: 46 });
const CARyouCU = (f0: number) => (f: number) => dolly(add(CAR_AT, [-3.2, 1.55, 3.2]), add(CAR_AT, [-3.4, 1.45, 1.3]), pushK(f, f0, 0.003), { fov: 36, roll: 0.04 });
const GOLDwide = (f0: number) => (f: number) => dolly(add(WH, [-9, 2.4, 52]), add(WH, [0, 9.5, 0]), pushK(f, f0, 0.0016), { fov: 44 });
const SKY = (f0: number) => (f: number) => dolly(add(WH, [6, 3, 46]), add(WH, [0, 22, 0]), pushK(f, f0, 0.0012), { fov: 52, roll: -0.03 });
// dining
const DINwide = (f0: number) => (f: number) => dolly(add(DIN, [1.4, 1.75, 2.0]), add(DIN, [0, 1.0, -0.9]), pushK(f, f0, 0.002), { fov: 46 });
const DINyouCU = (f0: number, roll = 0.04) => (f: number) => dolly(add(DIN, [0.3, 1.5, 0.75]), add(DIN, [0, 1.42, -1.05]), pushK(f, f0, 0.003), { fov: 36, roll });
const RECEIPTcu = (f0: number) => (f: number) => dolly(add(RECEIPT_AT, [0.02, 0.62, 0.2]), RECEIPT_AT, pushK(f, f0, 0.0022), { fov: 42 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: OFFwide(0, 0.006) }],
  2: [{ f: 89, s: WINpush(89) }],
  3: [{ f: 146, s: BEDwide(146) }, { f: 250, dur: 30, s: (f) => dolly([1.6, 2.1, 1.9], [0, 1.0, -1.6], pushK(f, 250, 0.0015), { fov: 54 }) }],
  4: [{ f: 345, s: BEDwalk(345) }, { f: 404, cut: true, s: WINpush(404, 0.04) }],
  5: [{ f: 441, s: FACADEpan }],
  6: [{ f: 468, s: (f) => dolly(add(OFF, [0.2, 1.7, 3.0]), add(OFF, [0.7, 1.2, -1.6]), pushK(f, 468, 0.0018), { fov: 48 }) }, { f: 571, cut: true, s: OFFaideCU(OFF[0] + 1.25, -1.45, 571) }],
  7: [{ f: 634, s: CARwide(634) }, { f: 795, cut: true, s: CARyouCU(795) }],
  8: [{ f: 855, s: DINwide(855) }],
  9: [{ f: 967, s: DINwide(940) }, { f: 1028, cut: true, s: RECEIPTcu(1028) }],
  10: [{ f: 1134, s: DINyouCU(1134) }, { f: 1205, dur: 18, s: (f) => dolly(add(DIN, [0.25, 1.48, -0.1]), add(DIN, [0, 1.45, -1.05]), pushK(f, 1205, 0.004), { fov: 36, roll: -0.05 }) }],
  11: [{ f: 1238, s: GOLDwide(1238) }],
  12: [{ f: 1385, s: DINwide(1385) }],
  13: [{ f: 1415, s: SKY(1415) }],
  14: [{ f: 1449, s: DINwide(1449) }, { f: 1530, cut: true, s: DINyouCU(1530, -0.04) }],
  15: [{ f: 1562, s: OFFwide(1562) }, { f: 1650, cut: true, s: OFFhands(1650) }],
  16: [{ f: 1681, s: OFFaideCU(OFF[0] + 1.25, -1.45, 1681) }],
  17: [{ f: 1771, s: OFFyouCU(1771) }],
  18: [{ f: 1830, s: WINpush(1830) }],
};
const KICKS: [number, number][] = [[92, 0.5], [413, 0.8], [421, 0.6], [429, 0.5], [545, 0.7], [722, 0.7], [1022, 0.5], [1208, 0.8], [1542, 0.9], [1655, 0.7], [1840, 0.8], [1848, 0.6]];
export const kickAt = (f: number) => {
  let a = 0;
  for (const [f0, g] of KICKS) { const n = f - f0; if (n >= 0 && n < 7) a += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
  return a;
};
export const camAt = (id: number, f: number): Cam => {
  const c = run(CAMS[id], f), a = kickAt(f);
  if (!a) return c;
  const d: V3 = [c.look[0] - c.pos[0], c.look[1] - c.pos[1], c.look[2] - c.pos[2]];
  const L = Math.hypot(...d), h = Math.hypot(d[0], d[2]) || 1;
  const m = (3 / 640) * Math.tan((c.fov * Math.PI) / 360) * L * a;
  return { ...c, look: [c.look[0] - (d[2] / h) * m, c.look[1] + 0.6 * m, c.look[2] + (d[0] / h) * m], roll: c.roll + a * 0.004 };
};

// ---------------- lens ----------------
export type Dof = { f: number; dur?: number; cInf: number; focus?: () => V3 };
const at = (p: V3, dy: number) => (): V3 => [p[0], p[1] + dy, p[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 6, focus: at(YOU_DESK, 1.45) },
  { f: 89, cInf: 10, focus: at(YOU_WIN, 1.5) },
  { f: 146, cInf: 6, focus: at(YOU_BED, 1.1) },
  { f: 250, cInf: 0 },
  { f: 404, cInf: 10, focus: at(YOU_WIN, 1.5) },
  { f: 441, cInf: 0 },
  { f: 468, cInf: 5, focus: at(YOU_DESK, 1.45) },
  { f: 571, cInf: 12 },
  { f: 638, cInf: 4 },
  { f: 795, cInf: 12 },
  { f: 859, cInf: 6, focus: at(YOU_TABLE, 1.4) },
  { f: 1028, cInf: 12, focus: () => RECEIPT_AT },
  { f: 1134, cInf: 13, focus: at(YOU_TABLE, 1.45) },
  { f: 1242, cInf: 0 },
  { f: 1385, cInf: 6, focus: at(YOU_TABLE, 1.4) },
  { f: 1415, cInf: 0 },
  { f: 1449, cInf: 6, focus: at(YOU_TABLE, 1.4) },
  { f: 1530, cInf: 13, focus: at(YOU_TABLE, 1.45) },
  { f: 1566, cInf: 5, focus: at(YOU_DESK, 1.45) },
  { f: 1650, cInf: 13 },
  { f: 1681, cInf: 12 },
  { f: 1771, cInf: 13, focus: at(YOU_DESK, 1.45) },
  { f: 1830, cInf: 10, focus: at(YOU_WIN, 1.5) },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i];
  return { cInf: d.cInf, focus: d.focus };
};

// ---------------- acting (the shot plan as data: this is what the "brain" would write) ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick";
export type Thing = "folder" | "phone" | "keys" | "card";
export type Who = "youPJ" | "youSuit" | "aide" | "agent";
export type Actor = {
  who: Who; pos: V3; mode: "stand" | "sit" | "stroll"; expr: Expr; look?: number; facing?: -1 | 0 | 1; phase?: number; seed: number;
  prop?: null | ["give", Thing, number] | ["hold", Thing] | ["pat", number]; wave?: number; shake?: number;
};
const LID = [0.5, 1, 1, 0.5];
export const blink = (f: number, seed: number) => {
  let s = 10 + ((seed * 37) % 23);
  for (let n = 0; n < 200 && s <= f; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += 18 + ((seed * 53 + n * 29) % 48); }
  return 0;
};
const step = (pts: [number, Expr][], f: number) => { let e = pts[0][1]; for (const [f0, x] of pts) if (f >= f0) e = x; return e; };
/** strain: the right arm pushes up on the sash in little jolts */
const strain = (f: number) => 0.6 + 0.4 * Math.abs(Math.sin(f * 0.9));
const walk = (from: V3, to: V3, f0: number, f1: number, f: number) => {
  const w = smooth((f - f0) / (f1 - f0));
  return { pos: [from[0] + (to[0] - from[0]) * w, from[1] + (to[1] - from[1]) * w, from[2] + (to[2] - from[2]) * w] as V3, walking: f >= f0 && f < f1, phase: (((f - f0) / (f1 - f0)) * ((f1 - f0) / 13)) % 1 };
};
const AIDE_IN: V3 = [OFF[0] + 2.8, 0, -1.55], AIDE_AT: V3 = [OFF[0] + 1.25, 0, -1.45];
export const castAt = (id: number, f: number): Actor[] => {
  const Y = (who: Who, pos: V3, mode: Actor["mode"], expr: Expr, extra: Partial<Actor> = {}): Actor => ({ who, pos, mode, expr, seed: 4, ...extra });
  switch (id) {
    case 1: return [Y("youSuit", YOU_DESK, "stand", f < 20 ? "smile" : "grin")];
    case 2: case 18: return [Y("youPJ", YOU_WIN, "stand", "pained", { wave: strain(f), look: 1 })];
    case 3: return [Y("youPJ", YOU_BED, "sit", step([[0, "neutral"], [262, "shock"], [300, "nervous"]], f))];
    case 4: {
      const w = walk([0.9, 0, -1.2], YOU_WIN, 352, 398, f);
      return [Y("youPJ", w.pos, w.walking ? "stroll" : "stand", f < 408 ? "smile" : "pained", { phase: w.phase, wave: f >= 404 ? strain(f) : undefined, look: f >= 404 ? 1 : 0 })];
    }
    case 6: {
      const a = walk(AIDE_IN, AIDE_AT, 505, 532, f);
      const snatched = f >= 545;
      return [
        Y("youSuit", [OFF[0] - 0.15, 0, -1.25], "stand", step([[0, "smile"], [545, "shock"], [560, "nervous"]], f), { prop: snatched ? null : f >= 482 ? ["hold", "phone"] : null, look: f > 520 ? 1 : 0 }),
        { who: "agent", pos: a.pos, mode: a.walking ? "stroll" : "stand", expr: "stern", facing: -1, phase: a.phase, seed: 9, look: -1,
          prop: f < 535 ? null : ["give", "phone", f < 545 ? smooth((f - 535) / 10) : 1 - smooth((f - 552) / 12) * 0.85] },
      ];
    }
    case 7: {
      const snatched = f >= 722;
      const a = walk([CAR_AT[0] + 2.5, 0, CAR_AT[2] + 3.4], [CAR_AT[0] - 2.2, 0, CAR_AT[2] + 1.5], 690, 716, f);
      return [
        Y("youPJ", [CAR_AT[0] - 3.4, 0, CAR_AT[2] + 1.3], "stand", step([[0, "grin"], [722, "shock"], [740, "pained"], [795, "nervous"]], f), { prop: snatched ? null : f >= 650 ? ["hold", "keys"] : null }),
        { who: "agent", pos: a.pos, mode: a.walking ? "stroll" : "stand", expr: "stern", facing: -1, phase: a.phase, seed: 9, look: -1,
          prop: f < 712 ? null : ["give", "keys", f < 722 ? smooth((f - 712) / 10) : 1 - smooth((f - 730) / 12) * 0.85] },
      ];
    }
    case 8: case 12: return [Y("youPJ", YOU_TABLE, "stand", id === 12 ? "smile" : step([[0, "smile"], [905, "grin"], [940, "laugh"]], f))];
    case 9: return [Y("youPJ", YOU_TABLE, "stand", step([[0, "laugh"], [1015, "neutral"], [1040, "nervous"]], f))];
    case 10: return [Y("youPJ", YOU_TABLE, "stand", step([[0, "nervous"], [1205, "shock"]], f))];
    case 14: return [Y("youPJ", YOU_TABLE, "stand", step([[0, "nervous"], [1530, "pained"]], f))];
    case 15: {
      const a = walk(AIDE_IN, AIDE_AT, 1590, 1612, f);
      return [
        Y("youSuit", YOU_DESK, "stand", step([[0, "neutral"], [1655, "shock"]], f), { look: 1 }),
        { who: "aide", pos: a.pos, mode: a.walking ? "stroll" : "stand", expr: "stern", facing: -1, phase: a.phase, seed: 2, look: -1,
          prop: ["give", "card", f < 1612 ? 0 : smooth((f - 1612) / 14)] },
      ];
    }
    case 16: return [{ who: "aide", pos: AIDE_AT, mode: "stand", expr: f < 1715 ? "neutral" : "nervous", facing: -1, seed: 2, look: f % 40 < 20 ? -1 : 1,
      prop: f < 1712 ? ["give", "card", 0] : ["pat", Math.abs(Math.sin(f * 0.5))] }];
    case 17: return [Y("youSuit", YOU_DESK, "stand", f < 1820 ? "grin" : "smile", { prop: ["hold", "card"] })];
    default: return [];
  }
};
/** props shown per shot: pop-in scale 0..1 for anything that appears on a word */
export const pop = (f: number, f0: number, n = 6) => (f < f0 ? 0 : Math.min(1, 1.15 * Math.sin(Math.min(1, (f - f0) / n) * Math.PI * 0.62) / Math.sin(Math.PI * 0.62)));
export const BOX_TIMES = [256, 262, 268, 274, 280, 287, 294, 300, 306, 313];
export const FOOD_TIMES = { pancakes: 910, bacon: 932, juice: 945, eggs: 948, toast: 951 };
export const receiptStage = (f: number) => (f < 1038 ? 0 : f < 1065 ? 1 : f < 1099 ? 2 : 3);
