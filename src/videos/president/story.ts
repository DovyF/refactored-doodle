// "What if you woke up as president?" sample (~16.7 s). Timed to voice/words_tight.json (frame = round(s * 30)):
// You@0 wake@2 ceiling@22 expensive@53 yours@82 | You@97 look@99 window@112 giant@142 white@156 house@165 back@188
// twenty@203 bill@220 | Except@243 you're@257 inside@267 it@274 | Before@301 someone@329 hands@340 folder@362
// so@369 secret@382 | only@410 handful@425 people@443 Earth@457 read@487 it@493
// Camera grammar from the skill: smootherstep glides 18-40 f, cuts on big reframes, every hold creeps,
// impact kicks flip sign every frame and decay over 7 f.
export const FPS = 30;
export const TOTAL = 501;
export type V3 = [number, number, number];
export const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
export const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };

/** set origins: bedroom, White House lawn, office (far apart so no set shows in another's frame) */
export const BED: V3 = [0, 0, 0];
export const WH: V3 = [400, 0, 0];
export const OFF: V3 = [-400, 0, 0];
/** where "you" sits / stands per set */
export const YOU_BED: V3 = [0, 0.64, -2.3];
export const YOU_WIN: V3 = [WH[0] - 11, 8.55, -0.75]; // inside the upstairs window, left of the portico
export const WIN_C: V3 = [WH[0] - 11, 10.4, 0];       // that window's centre on the facade
export const YOU_DESK: V3 = [OFF[0], 0, -2.45];
export const DESK_TOP = 0.8;
export const FOLDER_AT: V3 = [OFF[0] + 0.05, DESK_TOP + 0.012, -1.5];

export type LightName = "int" | "day";
export type ShotDef = { id: number; a: number; b: number; light: LightName; sunAz: number; sunEl: number };
export const SHOTS: ShotDef[] = [
  { id: 1, a: 0, b: 97, light: "int", sunAz: 140, sunEl: 38 },
  { id: 2, a: 97, b: 295, light: "day", sunAz: 125, sunEl: 42 },
  { id: 3, a: 295, b: TOTAL, light: "int", sunAz: 155, sunEl: 34 },
];
export const XFADE: Record<number, number> = { 2: 8, 3: 8 };
export const shotAt = (f: number) => SHOTS.find((s) => f >= s.a && f < s.b) ?? SHOTS[SHOTS.length - 1];
export const layersAt = (f: number): { id: number; alpha: number }[] => {
  for (const s of SHOTS) {
    const x = XFADE[s.id];
    if (x && f >= s.a - x / 2 && f < s.a + x / 2) return [{ id: s.id - 1, alpha: 1 }, { id: s.id, alpha: (f - (s.a - x / 2) + 1) / (x + 1) }];
  }
  return [{ id: shotAt(f).id, alpha: 1 }];
};

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
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];

// shot 1, bedroom: you sit up in the bed -> tilt up to the chandelier ("ceiling") -> close on your face ("to be yours")
const S1a = (f: number) => dolly([1.05, 1.55, 1.45], [0, 1.25, -2.2], pushK(f, 0, 0.0025), { fov: 44 });
const S1b = (f: number) => dolly([0.9, 1.35, 1.5], [0, 2.95, -1.35], pushK(f, 16, 0.002, 0.005, 28), { fov: 50, roll: -0.04 });
const S1c = (f: number) => dolly([0.4, 1.6, -0.55], [0, 1.5, -2.3], pushK(f, 66, 0.0035), { fov: 38, roll: 0.04 });
// shot 2, the lawn: wide 3/4 -> punch on "giant" -> straight-on, symmetric "back of the bill" framing -> cut to the
// upstairs window on "Except", glide in on "you're inside it"
const S2a = (f: number) => dolly(add(WH, [15, 2.2, 64]), add(WH, [0, 8.5, 0]), pushK(f, 93, 0.0018, 0.0055, 30), { fov: 42 });
const S2b = (f: number) => dolly(add(WH, [0, 4.2, 50]), add(WH, [0, 9.8, 0]), pushK(f, 185, 0.0016), { fov: 40 });
const S2c = (f: number) => dolly(add(WIN_C, [1.6, -1.6, 15]), add(WIN_C, [0, -0.2, 0]), pushK(f, 243, 0.002), { fov: 34, roll: -0.03 });
const S2d = (f: number) => dolly(add(WIN_C, [0.35, -0.45, 4.2]), add(WIN_C, [0, -0.3, 0]), pushK(f, 257, 0.0025, 0.006, 24), { fov: 34, roll: 0.03 });
// shot 3, the office: MS of you at the desk, the briefer walks in from the right -> insert on the folder ("so secret")
// -> close on your face ("only a handful of people")
const S3a = (f: number) => dolly(add(OFF, [-0.25, 1.65, 2.9]), add(OFF, [0.62, 1.15, -1.8]), pushK(f, 291, 0.0018), { fov: 46 });
const S3b = (f: number) => dolly(add(OFF, [0.12, 1.5, -0.62]), [FOLDER_AT[0], FOLDER_AT[1], FOLDER_AT[2]], pushK(f, 369, 0.0025, 0.005, 20), { fov: 38, roll: 0.03 });
const S3c = (f: number) => dolly(add(OFF, [0.36, 1.52, -0.55]), add(OFF, [0, 1.42, -2.45]), pushK(f, 410, 0.003), { fov: 34, roll: -0.04 });

const CAMS: Record<number, Key[]> = {
  1: [{ f: 0, s: S1a }, { f: 14, dur: 26, s: S1b }, { f: 66, cut: true, s: S1c }],
  2: [{ f: 93, s: S2a }, { f: 180, dur: 30, s: S2b }, { f: 243, cut: true, s: S2c }, { f: 255, dur: 22, s: S2d }],
  3: [{ f: 291, s: S3a }, { f: 369, cut: true, s: S3b }, { f: 410, cut: true, s: S3c }],
};
/** impact kicks (frame, gain) */
const KICKS: [number, number][] = [[274, 0.6], [382, 1.1]];
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
const eyesBed = (): V3 => [YOU_BED[0], YOU_BED[1] + 1.12, YOU_BED[2]];
const eyesDesk = (): V3 => [YOU_DESK[0], 1.45, YOU_DESK[2]];
export const DOF: Dof[] = [
  { f: 0, cInf: 9, focus: eyesBed },
  { f: 14, dur: 26, cInf: 0 },
  { f: 66, cInf: 13, focus: eyesBed },
  { f: 93, cInf: 0 },
  { f: 243, cInf: 5, focus: () => [WIN_C[0], WIN_C[1] - 0.3, WIN_C[2] - 0.7] },
  { f: 255, dur: 22, cInf: 9, focus: () => [WIN_C[0], WIN_C[1] - 0.3, WIN_C[2] - 0.7] },
  { f: 291, cInf: 6, focus: eyesDesk },
  { f: 369, cInf: 14, focus: () => FOLDER_AT },
  { f: 410, cInf: 13, focus: eyesDesk },
];
export const dofAt = (f: number) => {
  let i = 0; while (i + 1 < DOF.length && f >= DOF[i + 1].f) i++;
  const d = DOF[i], p = DOF[Math.max(0, i - 1)];
  const k = d.dur ? Math.min(1, (f - d.f) / d.dur) : 1;
  return { cInf: p.cInf + (d.cInf - p.cInf) * k, focus: d.focus };
};

// ---------------- acting ----------------
export type Expr = "neutral" | "stern" | "grin" | "laugh" | "whistle" | "nervous" | "shock" | "relief" | "relief_open" | "dazed"
  | "pained" | "smile" | "smile_closed" | "lick";
/** your face per frame: reactions land 0-3 f before their word */
export const youExpr = (f: number): { expr: Expr; look: number; lid: number } => {
  if (f < 5) return { expr: "neutral", look: 0, lid: 1 };          // asleep
  if (f < 8) return { expr: "neutral", look: 0, lid: 0.5 };        // "wake up": eyes open
  if (f < 50) return { expr: "neutral", look: 0, lid: blink(f, 1) };
  if (f < 80) return { expr: "shock", look: 0, lid: 0 };           // "way too expensive"
  if (f < 97) return { expr: "nervous", look: 0, lid: blink(f, 2) };
  if (f < 241) return { expr: "smile", look: -1, lid: blink(f, 3) }; // at the window, admiring the view
  if (f < 265) return { expr: "nervous", look: 0, lid: blink(f, 4) }; // "Except..."
  if (f < 295) return { expr: "shock", look: 0, lid: 0 };          // "you're inside it"
  if (f < 338) return { expr: "neutral", look: 0, lid: blink(f, 5) };
  if (f < 380) return { expr: "neutral", look: 1, lid: blink(f, 6) }; // looks at the briefer
  if (f < 408) return { expr: "shock", look: 0, lid: 0 };          // "secret"
  return { expr: "nervous", look: 0, lid: blink(f, 7) };
};
/** 4-frame blinks every 0.6-2.2 s (half / shut / shut / half) */
const LID = [0.5, 1, 1, 0.5];
export const blink = (f: number, seed: number) => {
  let s = 10 + ((seed * 37) % 23);
  for (let n = 0; n < 80 && s <= f; n++) {
    const k = f - s;
    if (k >= 0 && k < 4) return LID[k];
    s += 18 + ((seed * 53 + n * 29) % 48);
  }
  return 0;
};
/** the briefer walks in on "someone" (f 322-345), reaches out on "hands you" (f 338-352), lets go at f 360 */
export const AIDE_FROM: V3 = [OFF[0] + 2.6, 0, -1.55], AIDE_TO: V3 = [OFF[0] + 1.25, 0, -1.45];
export const aideAt = (f: number) => {
  const w = smooth((f - 318) / 26);
  const x = AIDE_FROM[0] + (AIDE_TO[0] - AIDE_FROM[0]) * w, z = AIDE_FROM[2] + (AIDE_TO[2] - AIDE_FROM[2]) * w;
  const walking = f >= 318 && f < 344;
  const reach = f < 336 ? 0 : f < 350 ? smooth((f - 336) / 14) : f < 362 ? 1 : 1 - smooth((f - 362) / 10);
  const holding = f < 362;
  return { x, z, walking, phase: walking ? ((f - 318) / 26 * 1.6) % 1 : 0, reach, holding };
};
export const folderOnDesk = (f: number) => f >= 362;
export const stampAt = (f: number) => (f < 382 ? 0 : Math.min(1, (f - 382) / 4));
