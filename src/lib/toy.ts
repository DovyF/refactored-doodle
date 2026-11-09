// "Toy": the channel's own character design, drawn on a 600 x 1000 card (soles at y = 975), lit like the skill's cards.
// Chunky rounded body, thick tube limbs, mitten hands, big round eyes. Every character in a video uses this body;
// outfits, hats, hair and age make them different people. Poses and faces are named so a shot plan can ask for them.
import { Pen, INK, mul, thickAngle } from "../videos/bridge/toon";

type P2 = [number, number];
export type Face = "neutral" | "smile" | "grin" | "laugh" | "shock" | "nervous" | "strain" | "stern" | "sleepy" | "dazed" | "sad"
  | "smug" | "asleep" | "wide" | "think" | "angry" | "cry" | "sus" | "love" | "yawn" | "proud" | "panic" | "blank";
export type Pose = "stand" | "walk" | "sit" | "lie" | "wave" | "point" | "push" | "shrug" | "cheer" | "think" | "facepalm";
export type Thing = "phone" | "keys" | "card" | "folder" | "coffee" | "paper" | "pencil";
export type ToyLook = {
  body: string; pants: string; shoes: string; skin: string; sleeve?: string;
  hat: "beanie" | "hair" | "cap" | "bald" | "bun"; hatColor: string; hair?: string;
  collar?: string; buttons?: string; tie?: string; stripes?: string; coat?: boolean; glasses?: boolean; beard?: string; bags?: boolean;
};
export type ToyOpts = {
  pose: Pose; face: Face; look?: number; lookY?: number; blink?: number; phase?: number;
  hold?: Thing | null; give?: [Thing, number] | null; light?: number; sweat?: boolean;
};

const R = Math.PI / 180;
const SH: [number, number, number] = [0.72, 0.72, 0.8];
const ellPts = (cx: number, cy: number, rx: number, ry: number, n = 48, a0 = 0, a1 = 360): P2[] => {
  const p: P2[] = []; for (let i = 0; i <= n; i++) { const a = (a0 + ((a1 - a0) * i) / n) * R; p.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a)]); } return p;
};
const rr = (x0: number, y0: number, x1: number, y1: number, r: number): P2[] => {
  const p: P2[] = [];
  for (const [cx, cy, a] of [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]] as const)
    for (let i = 0; i <= 8; i++) p.push([cx + r * Math.cos((a + (90 * i) / 8) * R), cy + r * Math.sin((a + (90 * i) / 8) * R)]);
  return p;
};
const lerp = (a: P2, b: P2, t: number): P2 => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
const bend = (a: P2, k: P2, b: P2, n = 10): P2[] => {
  const c: P2 = [2 * k[0] - (a[0] + b[0]) / 2, 2 * k[1] - (a[1] + b[1]) / 2], o: P2[] = [];
  for (let i = 0; i <= n; i++) { const t = i / n, s = 1 - t; o.push([s * s * a[0] + 2 * s * t * c[0] + t * t * b[0], s * s * a[1] + 2 * s * t * c[1] + t * t * b[1]]); }
  return o;
};

/** held objects around the hand point */
export const drawThing = (p: Pen, kind: Thing, x: number, y: number, s = 1) => {
  const u = 3 * s;
  if (kind === "phone") { p.poly(rr(x - 10 * u, y - 30 * u, x + 10 * u, y + 6 * u, 3 * u), "#22232b", 2.4 * u); p.poly(rr(x - 7.5 * u, y - 26 * u, x + 7.5 * u, y + 2 * u, 2 * u), "#7fc4f0", 0); }
  else if (kind === "keys") { p.ell(x, y - 8 * u, 7 * u, 7 * u, null, 2.4 * u); p.band([[x + 4 * u, y - 12 * u], [x + 15 * u, y - 28 * u]], "#e2c15a", 3.4 * u, 1.4 * u, "round"); p.band([[x - 4 * u, y - 13 * u], [x - 9 * u, y - 31 * u]], "#c9ccd2", 3.4 * u, 1.4 * u, "round"); }
  else if (kind === "card") { p.poly(rr(x - 18 * u, y - 26 * u, x + 18 * u, y - 2 * u, 2 * u), "#f4f1e6", 2.2 * u); for (let i = 0; i < 3; i++) p.band([[x - 12 * u, y - 19 * u + i * 6 * u], [x + 12 * u, y - 19 * u + i * 6 * u]], "#3a3a44", 1.4 * u, 0); }
  else if (kind === "folder") { p.poly([[x - 34 * u, y - 20 * u], [x + 10 * u, y - 24 * u], [x + 14 * u, y + 10 * u], [x - 30 * u, y + 14 * u]], "#b8242c", 2.6 * u); }
  else if (kind === "coffee") { p.poly([[x - 12 * u, y - 26 * u], [x + 12 * u, y - 26 * u], [x + 9 * u, y + 4 * u], [x - 9 * u, y + 4 * u]], "#f4efe6", 2.4 * u); p.band([[x - 12 * u, y - 16 * u], [x + 11 * u, y - 16 * u]], "#c0392b", 4 * u, 0); p.arc(x + 14 * u, y - 12 * u, 6 * u, 7 * u, -80, 90, 2.4 * u); for (const dx of [-5, 3]) p.arc(x + dx * u, y - 38 * u, 3 * u, 6 * u, 90, 270, 1.8 * u, "#9a9aa8"); }
  else if (kind === "paper") { p.poly([[x - 20 * u, y - 34 * u], [x + 18 * u, y - 36 * u], [x + 20 * u, y + 6 * u], [x - 18 * u, y + 8 * u]], "#fbfaf4", 2.2 * u); for (let i = 0; i < 4; i++) p.band([[x - 13 * u, y - 26 * u + i * 8 * u], [x + 12 * u, y - 27 * u + i * 8 * u]], "#9aa3b5", 1.6 * u, 0); }
  else if (kind === "pencil") { p.band([[x - 4 * u, y + 6 * u], [x + 10 * u, y - 30 * u]], "#f2c230", 5 * u, 1.4 * u); }
  p.dot(x, y, 0.1);
};

// ---------------- faces ----------------
type FaceDef = { eye: "open" | "squeeze" | "happy" | "closed" | "spiral" | "heart" | "dot"; lid: number; pupil: number; size: number; brow: [number, number]; mouth: string };
const FACES: Record<Face, FaceDef> = {
  neutral: { eye: "open", lid: 0.08, pupil: 16, size: 1, brow: [0, 0], mouth: "line" },
  smile: { eye: "open", lid: 0.1, pupil: 16, size: 1, brow: [-4, -2], mouth: "smile" },
  grin: { eye: "open", lid: 0.05, pupil: 16, size: 1.05, brow: [-8, -4], mouth: "grin" },
  laugh: { eye: "happy", lid: 0, pupil: 0, size: 1, brow: [-10, -6], mouth: "laugh" },
  shock: { eye: "open", lid: 0, pupil: 9, size: 1.18, brow: [-22, -18], mouth: "O" },
  nervous: { eye: "open", lid: 0.05, pupil: 10, size: 1.02, brow: [-14, 6], mouth: "wave" },
  strain: { eye: "squeeze", lid: 0, pupil: 0, size: 1, brow: [10, -8], mouth: "teeth" },
  stern: { eye: "open", lid: 0.3, pupil: 15, size: 0.95, brow: [12, -6], mouth: "frown" },
  sleepy: { eye: "open", lid: 0.58, pupil: 14, size: 1, brow: [-6, 6], mouth: "small" },
  dazed: { eye: "spiral", lid: 0, pupil: 0, size: 1.05, brow: [-10, 6], mouth: "wave" },
  sad: { eye: "open", lid: 0.2, pupil: 14, size: 1, brow: [-14, 8], mouth: "frown" },
  smug: { eye: "open", lid: 0.42, pupil: 15, size: 1, brow: [6, -14], mouth: "smirk" },
  asleep: { eye: "closed", lid: 1, pupil: 0, size: 1, brow: [0, 4], mouth: "o" },
  wide: { eye: "open", lid: 0, pupil: 7, size: 1.25, brow: [-20, -14], mouth: "line" },
  think: { eye: "open", lid: 0.25, pupil: 14, size: 1, brow: [-12, 8], mouth: "smirk" },
  angry: { eye: "open", lid: 0.38, pupil: 14, size: 0.95, brow: [24, -10], mouth: "teeth" },
  cry: { eye: "open", lid: 0.3, pupil: 14, size: 1, brow: [-16, 10], mouth: "frown" },
  sus: { eye: "open", lid: 0.56, pupil: 13, size: 0.95, brow: [10, -2], mouth: "line" },
  love: { eye: "heart", lid: 0, pupil: 0, size: 1.05, brow: [-10, -6], mouth: "smile" },
  yawn: { eye: "closed", lid: 1, pupil: 0, size: 1, brow: [-8, 6], mouth: "yawn" },
  proud: { eye: "happy", lid: 0, pupil: 0, size: 1, brow: [-6, -12], mouth: "smile" },
  panic: { eye: "open", lid: 0, pupil: 6, size: 1.22, brow: [-24, -10], mouth: "teeth" },
  blank: { eye: "dot", lid: 0, pupil: 0, size: 1, brow: [0, 0], mouth: "small" },
};
const MOUTH = "#6a1f2c", TONGUE = "#ea7480";
const mouthAt = (p: Pen, kind: string, x: number, y: number) => {
  switch (kind) {
    case "line": p.stroke([[x - 20, y], [x + 20, y - 2]], 7); break;
    case "small": p.stroke([[x - 12, y], [x + 12, y]], 6); break;
    case "smile": p.arc(x, y - 10, 28, 16, 20, 160, 8); break;
    case "smirk": p.arc(x + 6, y - 10, 24, 12, 10, 120, 8); break;
    case "frown": p.arc(x, y + 14, 24, 13, 200, 340, 8); break;
    case "wave": { const s: P2[] = []; for (let i = 0; i <= 12; i++) s.push([x - 26 + i * 4.4, y + 5 * Math.sin(i * 1.3)]); p.stroke(s, 7); break; }
    case "o": p.ell(x, y + 2, 10, 12, MOUTH, 5); break;
    case "yawn": p.ell(x, y + 10, 24, 40, MOUTH, 7); p.ell(x, y + 34, 13, 9, TONGUE, 0); break;
    case "O": p.ell(x, y + 6, 26, 32, MOUTH, 7); p.ell(x, y + 24, 14, 10, TONGUE, 0); break;
    case "grin": p.ell(x, y - 6, 40, 30, MOUTH, 0, 0, 180); p.clip(ellPts(x, y - 6, 40, 30, 24, 0, 180), () => p.poly([[x - 40, y - 6], [x + 40, y - 6], [x + 40, y + 5], [x - 40, y + 5]], "#ffffff", 0)); p.ell(x, y - 6, 40, 30, null, 7, 0, 180); p.stroke([[x - 40, y - 6], [x + 40, y - 6]], 7); break;
    case "laugh": p.ell(x, y - 8, 50, 44, MOUTH, 0, 0, 180); p.ell(x, y + 20, 22, 12, TONGUE, 0); p.clip(ellPts(x, y - 8, 50, 44, 24, 0, 180), () => p.poly([[x - 50, y - 8], [x + 50, y - 8], [x + 50, y + 6], [x - 50, y + 6]], "#ffffff", 0)); p.ell(x, y - 8, 50, 44, null, 7, 0, 180); p.stroke([[x - 50, y - 8], [x + 50, y - 8]], 7); break;
    case "teeth": p.poly(rr(x - 40, y - 16, x + 40, y + 18, 10), "#ffffff", 7); for (const dx of [-20, 0, 20]) p.stroke([[x + dx, y - 14], [x + dx, y + 16]], 4); p.stroke([[x - 38, y + 1], [x + 38, y + 1]], 4); break;
  }
};
const drawFace = (p: Pen, L: ToyLook, o: ToyOpts, hx: number, hy: number) => {
  const F = FACES[o.face], look = o.look ?? 0, lookY = o.lookY ?? 0, blink = Math.max(o.blink ?? 0, F.lid);
  const ex = [hx - 55, hx + 55], ey = hy + 12, rx = 40 * F.size, ry = 48 * F.size;
  for (const [i, x] of ex.entries()) {
    const side = i ? 1 : -1;
    if (F.eye === "open" && blink < 0.95) {
      p.ell(x, ey, rx, ry, "#ffffff", 6);
      p.clip(ellPts(x, ey, rx, ry), () => {
        p.dot(x + look * 16, ey + 6 + lookY * 12, F.pupil);
        p.dot(x + look * 16 - 5, ey + lookY * 12, F.pupil * 0.28, "#ffffff");
        if (blink > 0) p.poly([[x - rx - 2, ey - ry - 2], [x + rx + 2, ey - ry - 2], [x + rx + 2, ey - ry + 2 * ry * blink], [x - rx - 2, ey - ry + 2 * ry * blink]], L.skin, 0);
      });
      p.ell(x, ey, rx, ry, null, 6);
      if (blink > 0.05) p.stroke([[x - rx + 4, ey - ry + 2 * ry * blink], [x + rx - 4, ey - ry + 2 * ry * blink]], 6);
    } else if (F.eye === "squeeze") p.stroke([[x - side * 26, ey - 22], [x + side * 18, ey], [x - side * 26, ey + 22]], 9);
    else if (F.eye === "happy") p.arc(x, ey + 10, 30, 22, 200, 340, 9);
    else if (F.eye === "heart") p.poly([[x, ey + 34], [x - 38, ey - 2], [x - 30, ey - 30], [x - 12, ey - 34], [x, ey - 18], [x + 12, ey - 34], [x + 30, ey - 30], [x + 38, ey - 2]], "#ff4d6d", 6);
    else if (F.eye === "dot") p.dot(x, ey + 4, 11);
    else if (F.eye === "spiral") { p.ell(x, ey, rx, ry, "#ffffff", 6); const s: P2[] = []; for (let t = 1; t < 26; t++) s.push([x + Math.cos(t * 0.75) * t * 1.35, ey + Math.sin(t * 0.75) * t * 1.35]); p.stroke(s, 4.5); }
    else p.arc(x, ey + 4, 30, 14, 20, 160, 8); // closed / blink
    if (L.bags || o.face === "sleepy" || o.face === "wide") p.arc(x, ey + ry * 0.8, rx * 0.7, 10, 20, 160, 4, "rgba(110,80,140,0.75)");
    const [dI, dO] = F.brow, by = ey - ry - 16;
    p.poly([[x - side * 6, by + dI], [x + side * 36, by + dO], [x + side * 36, by + dO - 12], [x - side * 6, by + dI - 14]], L.hat === "bald" || !L.hair ? INK : mul(L.hair, [0.7, 0.7, 0.7]), 0);
    if (L.glasses) p.ell(x, ey, rx + 10, ry + 6, null, 6);
  }
  if (L.glasses) p.stroke([[hx - 6, ey - 4], [hx + 6, ey - 4]], 6);
  p.ell(hx - 108, hy + 62, 24, 13, "rgba(255,140,140,0.55)", 0); p.ell(hx + 108, hy + 62, 24, 13, "rgba(255,140,140,0.55)", 0);
  if (L.beard) p.poly(ellPts(hx, hy + 100, 82, 52, 32, 0, 180), L.beard, 6);
  mouthAt(p, F.mouth, hx, hy + 78);
  if (o.face === "cry") for (const x of ex) p.poly([[x - 12, ey + 40], [x + 12, ey + 40], [x + 16, ey + 150], [x - 16, ey + 150]], "rgba(140,205,255,0.85)", 4);
  if (o.sweat || o.face === "nervous" || o.face === "strain" || o.face === "panic") { p.poly([[hx + 150, hy - 80], [hx + 162, hy - 52], [hx + 150, hy - 42], [hx + 138, hy - 52]], "#9fd8ff", 4); }
};

// ---------------- hats + hair ----------------
const drawHat = (p: Pen, L: ToyLook, hx: number, hy: number, front: boolean) => {
  if (L.hat === "bald") return;
  const top = hy - 150;
  if (L.hat === "beanie") {
    if (!front) return;
    p.poly(ellPts(hx, hy - 106, 156, 112, 40, 180, 360), L.hatColor, 7);
    p.poly(rr(hx - 164, hy - 132, hx + 164, hy - 82, 18), mul(L.hatColor, [0.93, 0.88, 0.8]), 7);
    for (let k = -4; k <= 4; k++) p.stroke([[hx + k * 34, hy - 126], [hx + k * 34, hy - 88]], 4, mul(L.hatColor, [0.78, 0.7, 0.6]));
    p.ell(hx - 4, hy - 228, 30, 28, mul(L.hatColor, [0.93, 0.88, 0.8]), 7);
  } else if (L.hat === "hair" || L.hat === "bun") {
    const c = L.hair ?? L.hatColor;
    if (!front) { p.poly(ellPts(hx, hy - 10, 160, 150, 40, 140, 400), c, 7); if (L.hat === "bun") p.ell(hx, top - 30, 48, 42, c, 7); return; }
    const fr: P2[] = [...ellPts(hx, hy - 20, 156, 132, 40, 180, 360)];
    for (let i = 0; i <= 8; i++) fr.push([hx + 150 - i * 37.5, hy - 70 + (i % 2 ? 26 : 0)]);
    p.poly(fr, c, 7);
  } else if (L.hat === "cap") {
    if (!front) return;
    p.poly(ellPts(hx, hy - 60, 156, 110, 40, 180, 360), L.hatColor, 7);
    p.poly([[hx - 40, hy - 64], [hx + 175, hy - 66], [hx + 190, hy - 46], [hx - 40, hy - 46]], mul(L.hatColor, [0.8, 0.8, 0.8]), 7);
    p.ell(hx, hy - 168, 14, 10, mul(L.hatColor, [0.8, 0.8, 0.8]), 5);
  }
};

// ---------------- body ----------------
export const drawToy = (p: Pen, L: ToyLook, o: ToyOpts) => {
  p.ol = 7;
  const light = o.light ?? -120 * R, thick = thickAngle(light), ph = o.phase ?? 0, two = Math.PI * 2;
  const sit = o.pose === "sit", walk = o.pose === "walk";
  const bob = walk ? 10 * Math.cos(2 * two * ph) : 0;
  const dy = (sit ? 70 : 0) + bob;
  const hx = 300, hy = 335 + dy, bodyT = 450 + dy, bodyB = 780 + dy;
  const sleeve = L.sleeve ?? L.body;
  // legs
  const legW = 66;
  if (sit) {
    for (const s of [-1, 1]) { const hip: P2 = [300 + s * 48, bodyB - 40], ft: P2 = [300 + s * 70, 950]; p.line(bend(hip, [300 + s * 64, 890], ft), L.pants, legW); p.ell(ft[0] + s * 8, 958, 56, 26, L.shoes, 7); }
  } else {
    for (const [s, off] of [[-1, 0], [1, 0.5]] as const) {
      const sw = walk ? Math.sin(two * (ph + off)) : 0, up = walk ? Math.max(0, Math.sin(two * (ph + off))) * 34 : 0;
      const hip: P2 = [300 + s * 46, bodyB - 30], ft: P2 = [300 + s * 50 + sw * 16, 940 - up];
      p.line(bend(hip, [300 + s * 50, (hip[1] + ft[1]) / 2], ft), L.pants, legW);
      p.ell(ft[0] + s * 10, ft[1] + 12, 58, 28, L.shoes, 7);
    }
  }
  // arms: [shoulder, elbow, hand] per side (-1 = screen left)
  const sh = (s: number): P2 => [300 + s * 100, bodyT + 55];
  const sw = walk ? Math.sin(two * ph) : 0;
  const arms: Record<number, [P2, P2, P2]> = {
    [-1]: [sh(-1), [176 - sw * 10, bodyT + 150], [170 - sw * 22, bodyT + 250]],
    [1]: [sh(1), [424 + sw * 10, bodyT + 150], [430 + sw * 22, bodyT + 250]],
  };
  const front: Record<number, boolean> = { [-1]: false, [1]: false };
  const P = o.pose;
  if (P === "wave") { const w = Math.sin(two * ph * 2) * 22; arms[1] = [sh(1), [470, bodyT - 10], [500 + w, bodyT - 130]]; }
  else if (P === "point") arms[1] = [sh(1), [495, bodyT + 50], [590, bodyT + 30]];
  else if (P === "push") { arms[-1] = [sh(-1), [150, bodyT - 40], [215, bodyT - 200]]; arms[1] = [sh(1), [450, bodyT - 40], [385, bodyT - 200]]; }
  else if (P === "shrug") { arms[-1] = [sh(-1), [150, bodyT + 150], [96, bodyT + 90]]; arms[1] = [sh(1), [450, bodyT + 150], [504, bodyT + 90]]; }
  else if (P === "cheer") { arms[-1] = [sh(-1), [140, bodyT - 40], [118, bodyT - 170]]; arms[1] = [sh(1), [460, bodyT - 40], [482, bodyT - 170]]; }
  else if (P === "think") { arms[1] = [sh(1), [430, bodyT + 140], [350, bodyT + 10]]; front[1] = true; }
  else if (P === "facepalm") { arms[1] = [sh(1), [440, bodyT + 110], [340, bodyT - 90]]; front[1] = true; }
  else if (sit) { arms[-1] = [sh(-1), [168, bodyT + 170], [228, bodyT + 300]]; arms[1] = [sh(1), [432, bodyT + 170], [372, bodyT + 300]]; front[-1] = front[1] = true; }
  if (o.hold) { arms[1] = [sh(1), [455, bodyT + 170], [356, bodyT + 140]]; front[1] = true; }
  if (o.give) { const k = Math.max(0, Math.min(1, o.give[1])); arms[1] = [sh(1), lerp([455, bodyT + 170], [490, bodyT + 90], k), lerp([356, bodyT + 140], [580, bodyT + 60], k)]; front[1] = true; }
  const arm = (s: number) => {
    const [a, k, h] = arms[s];
    p.line(bend(a, k, h), sleeve, 54);
    p.ell(h[0], h[1], 36, 32, L.skin, 7);
    p.ell(h[0] - s * 26, h[1] - 18, 15, 12, L.skin, 6);
  };
  for (const s of [-1, 1]) if (!front[s]) arm(s);
  // head back hair (behind body)
  if (L.hat === "hair" || L.hat === "bun") drawHat(p, L, hx, hy, false);
  // body
  const bp = rr(185, bodyT, 415, bodyB, 74);
  p.gradFill(bp, L.body, mul(L.body, SH), light, 0.3);
  p.clip(bp, () => {
    if (L.stripes) for (let x = 205; x < 410; x += 34) p.stroke([[x, bodyT], [x, bodyB]], 10, L.stripes);
    if (L.coat) { p.poly([[185, bodyT], [262, bodyT], [300, bodyT + 140], [338, bodyT], [415, bodyT], [415, bodyB], [185, bodyB]], "#fbfbf6", 0); p.stroke([[300, bodyT + 140], [300, bodyB]], 4, "#c9ccd2"); p.ell(250, bodyT + 210, 34, 12, "#e8e8e2", 3); }
    if (L.tie) { p.poly([[300, bodyT + 8], [324, bodyT + 40], [312, bodyT + 210], [300, bodyT + 232], [288, bodyT + 210], [276, bodyT + 40]], L.tie, 5); }
    if (L.buttons) for (let i = 0; i < 3; i++) p.dot(L.tie ? 340 : 300, bodyT + 110 + i * 70, 11, L.buttons);
  });
  if (L.collar) { p.poly(ellPts(300, bodyT + 6, 82, 36, 24, 0, 180), L.collar, 6); }
  p.inkRing(bp, 7, thick);
  for (const s of [-1, 1]) if (front[s]) arm(s);
  // things in hand
  if (o.hold) drawThing(p, o.hold, arms[1][2][0], arms[1][2][1] - 10);
  if (o.give) drawThing(p, o.give[0], arms[1][2][0], arms[1][2][1] - 10);
  // head
  const hp = ellPts(hx, hy, 152, 146, 72);
  p.shadedFill(hp, L.skin, mul(L.skin, [0.93, 0.85, 0.83]), light, 150);
  p.inkRing(hp, 7, thick);
  drawFace(p, L, o, hx, hy);
  drawHat(p, L, hx, hy, true);
  if (o.pose === "facepalm" || o.pose === "think") arm(1);
};
