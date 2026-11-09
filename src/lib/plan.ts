// Shot-plan compiler. The "brain" writes plan.json (script lines + which set, who is there, faces, props and cues on
// words); the voice step writes words.json (every word with its time and line). This turns the two into a full
// timeline: shots and camera moves, characters, props, effect cards and on-screen text, frame by frame.
import { SETS, SetDef, V3, LightName } from "./sets";
import type { ToyLook, Pose, Face, Thing } from "./toy";
import type { FrameState, CastState, CardState, Cam } from "./state";

export const FPS = 30;
export type ActorSpec = { at?: string; pose?: Pose; face?: Face; eye?: number; eyeY?: number; hold?: Thing | null; lie?: boolean; sweat?: boolean };
export type Beat = {
  on: string; actor?: string; pose?: Pose; face?: Face; eye?: number; eyeY?: number; hold?: Thing | null; give?: Thing; to?: string; lie?: boolean; sweat?: boolean;
  shot?: string; text?: string; where?: "top" | "middle" | "bottom"; icon?: string; stamp?: string; brain?: number;
  card?: string; at?: string; prop?: string; hide?: string; sfx?: string; kick?: number; flash?: boolean;
};
export type Line = { text: string; set: string; light?: LightName; shot?: string; actors?: Record<string, ActorSpec>; props?: string[]; beats?: Beat[]; music?: string; clock?: number };
export type Plan = { id: string; title?: string; voice?: { name?: string; speed?: number }; cast: Record<string, string | ToyLook>; lines: Line[] };
export type Word = { w: string; s: number; e: number; line: number };
export type Overlay = { kind: "text" | "icon" | "stamp" | "brain"; value: string; where: string; f0: number; f1: number; n?: number };

// ---------------- the cast library (every character uses the Toy body) ----------------
export const LOOKS: Record<string, ToyLook> = {
  you: { body: "#7fb2df", pants: "#35558f", shoes: "#2a2830", skin: "#ffd8b3", hat: "beanie", hatColor: "#ffcb1f", collar: "#ffffff", buttons: "#ffffff" },
  "you-pj": { body: "#8fc0ea", pants: "#8fc0ea", shoes: "#f4f1ea", skin: "#ffd8b3", hat: "beanie", hatColor: "#ffcb1f", stripes: "#6a9fd8", buttons: "#ffffff" },
  "you-suit": { body: "#273452", pants: "#273452", shoes: "#1d1b22", skin: "#ffd8b3", hat: "beanie", hatColor: "#ffcb1f", tie: "#c3343c", collar: "#f6f3ec" },
  "you-old": { body: "#8a7fb8", pants: "#3b3f52", shoes: "#2a2830", skin: "#f2c9a6", hat: "beanie", hatColor: "#ffcb1f", bags: true, glasses: true },
  friend: { body: "#e8574a", pants: "#3b3f52", shoes: "#2a2830", skin: "#c99067", hat: "hair", hatColor: "#22191a", hair: "#22191a" },
  friend2: { body: "#5aa64a", pants: "#4a3a2a", shoes: "#2a2830", skin: "#f5c9a0", hat: "cap", hatColor: "#3a6fd6" },
  scientist: { body: "#5d7da8", pants: "#3b3f52", shoes: "#3a2a20", skin: "#e9b98f", hat: "hair", hatColor: "#c9c9cf", hair: "#c9c9cf", coat: true, glasses: true, tie: "#2f6f6a" },
  agent: { body: "#18181d", pants: "#18181d", shoes: "#0f0f12", skin: "#f1c9a3", hat: "hair", hatColor: "#1b1516", hair: "#1b1516", tie: "#18181d", collar: "#f6f3ec", glasses: true },
  mom: { body: "#c25a7a", pants: "#3b3f52", shoes: "#4a3426", skin: "#f5c9a0", hat: "bun", hatColor: "#6a3b22", hair: "#6a3b22" },
  dad: { body: "#4f6f4a", pants: "#3b3f52", shoes: "#4a3426", skin: "#e9b98f", hat: "hair", hatColor: "#4a3426", hair: "#4a3426", beard: "#4a3426" },
  kid: { body: "#f08a2c", pants: "#3b5b9a", shoes: "#f4f1ea", skin: "#ffd8b3", hat: "cap", hatColor: "#e2453c" },
  reporter: { body: "#3a6fd6", pants: "#3b3f52", shoes: "#2a2830", skin: "#c99067", hat: "bun", hatColor: "#22191a", hair: "#22191a", collar: "#ffffff" },
};

// ---------------- helpers ----------------
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const smooth = (x: number) => { const u = clamp01(x); return u * u * (3 - 2 * u); };
const glide = (u: number) => { const x = clamp01(u); return x * x * x * (x * (6 * x - 15) + 10); };
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const mulv = (a: V3, k: number): V3 => [a[0] * k, a[1] * k, a[2] * k];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, "");
const pushK = (x: number, rate: number) => Math.exp(-rate * Math.max(0, x));
const dolly = (pos: V3, look: V3, k: number): [V3, V3] => [add(look, mulv(sub(pos, look), k)), look];
const LID = [0.5, 1, 1, 0.5];
const blinkAt = (f: number, seed: number) => {
  let s = 8 + ((seed * 37) % 23);
  for (let n = 0; n < 400 && s <= f; n++) { const k = f - s; if (k >= 0 && k < 4) return LID[k]; s += 18 + ((seed * 53 + n * 29) % 48); }
  return 0;
};

type ActorEvt = { f: number; spec: Beat };
type Seg = { a: number; b: number; line: number; set: SetDef; light: LightName; shot: string; idx: number };
type CardEvt = { f0: number; f1: number; kind: string; at: string; line: number };

export class Timeline {
  total: number;
  lineA: number[] = []; lineB: number[] = [];
  segs: Seg[] = [];
  overlays: Overlay[] = [];
  flashes: number[] = [];
  kicks: [number, number][] = [];
  private actorStart: Record<string, ActorSpec>[] = [];
  private events: Record<string, ActorEvt[]>[] = [];
  private cards: CardEvt[] = [];
  private propOn: { name: string; f0: number; f1: number; pop: boolean }[] = [];
  private clockAt: [number, number][] = [];
  private looks: Record<string, ToyLook> = {};
  private camCache = new Map<number, Cam>();

  constructor(public plan: Plan, public words: Word[]) {
    for (const [k, v] of Object.entries(plan.cast ?? {})) this.looks[k] = typeof v === "string" ? LOOKS[v] ?? LOOKS.you : v;
    if (!this.looks.you) this.looks.you = LOOKS.you;
    const last = words[words.length - 1];
    this.total = Math.round((last.e + 0.6) * FPS);
    const L = plan.lines;
    // line boundaries
    for (let i = 0; i < L.length; i++) {
      const ws = words.filter((w) => w.line === i + 1);
      this.lineA.push(i === 0 ? 0 : Math.max(0, Math.round((ws[0]?.s ?? 0) * FPS) - 3));
    }
    for (let i = 0; i < L.length; i++) this.lineB.push(i + 1 < L.length ? this.lineA[i + 1] : this.total);
    let prevActors: Record<string, ActorSpec> = {}, prevSet = "", clock = 0;
    L.forEach((line, i) => {
      const a = this.lineA[i], b = this.lineB[i], set = SETS[line.set] ?? SETS.bedroom;
      const ws = words.filter((w) => w.line === i + 1);
      const beatF = (on: string) => {
        if (on === "start") return a;
        if (on === "end") return Math.max(a, b - 10);
        const [word, nth] = on.split("#"), want = norm(word); let k = Number(nth || 1);
        for (const w of ws) if (norm(w.w) === want && --k === 0) return Math.max(a, Math.round(w.s * FPS) - 2);
        for (const w of ws) if (norm(w.w).startsWith(want)) return Math.max(a, Math.round(w.s * FPS) - 2);
        return a;
      };
      // actors: listed, or carried over from the previous line in the same set
      const start = line.actors ?? (line.set === prevSet ? prevActors : {});
      this.actorStart.push(start);
      const ev: Record<string, ActorEvt[]> = {};
      const beats = (line.beats ?? []).map((bt) => ({ bt, f: beatF(bt.on) })).sort((x, y) => x.f - y.f);
      // shot segments
      let segA = a, shot = line.shot ?? "wide";
      const pushSeg = (endF: number) => { if (endF > segA) this.segs.push({ a: segA, b: endF, line: i, set, light: line.light ?? set.light, shot, idx: this.segs.length }); };
      for (const { bt, f } of beats) {
        if (bt.shot) { pushSeg(f); segA = f; shot = bt.shot; }
        if (bt.actor) (ev[bt.actor] ??= []).push({ f, spec: bt });
        if (bt.text) this.overlays.push({ kind: "text", value: bt.text, where: bt.where ?? "top", f0: f, f1: b });
        if (bt.icon) this.overlays.push({ kind: "icon", value: bt.icon, where: bt.where ?? "middle", f0: f, f1: b });
        if (bt.stamp) this.overlays.push({ kind: "stamp", value: bt.stamp, where: bt.where ?? "middle", f0: f, f1: b });
        if (bt.brain !== undefined) this.overlays.push({ kind: "brain", value: "", where: "top", f0: f, f1: b, n: bt.brain });
        if (bt.card) this.cards.push({ f0: f, f1: b, kind: bt.card, at: bt.at ?? bt.actor ?? "you", line: i });
        if (bt.prop) this.propOn.push({ name: bt.prop, f0: f, f1: b, pop: true });
        if (bt.kick) this.kicks.push([f + 2, bt.kick]);
        if (bt.flash) this.flashes.push(f);
      }
      pushSeg(b);
      for (const c of this.cards) if (c.line === i) { const nx = (ev[c.at] ?? []).find((e) => e.f > c.f0 && (e.spec.face || e.spec.lie !== undefined || e.spec.pose)); if (nx) c.f1 = Math.min(c.f1, nx.f); }
      // earlier text in the same slot ends when a new one starts
      this.overlays.sort((x, y) => x.f0 - y.f0);
      for (let k = 0; k < this.overlays.length; k++) for (let j = k + 1; j < this.overlays.length; j++)
        if (this.overlays[j].where === this.overlays[k].where && this.overlays[j].f0 < this.overlays[k].f1) { this.overlays[k].f1 = this.overlays[j].f0; break; }
      for (const p of line.props ?? []) if (!beats.some(({ bt }) => bt.prop === p)) this.propOn.push({ name: p, f0: a, f1: b, pop: false });
      for (const { bt, f } of beats) if (bt.hide) for (const po of this.propOn) if (po.name === bt.hide && po.f0 <= f && po.f1 > f) po.f1 = f;
      this.events.push(ev);
      this.clockAt.push([a, clock]); clock += line.clock ?? 0; this.clockAt.push([b, clock]);
      // what carries into the next line: final state of each actor
      const fin: Record<string, ActorSpec> = {};
      for (const [k, s0] of Object.entries(start)) {
        const st = { ...s0 };
        for (const e of ev[k] ?? []) { const s = e.spec; if (s.to) st.at = s.to; for (const f2 of ["pose", "face", "eye", "eyeY", "hold", "lie", "sweat"] as const) if (s[f2] !== undefined) (st as Record<string, unknown>)[f2] = s[f2]; }
        fin[k] = st;
      }
      prevActors = fin; prevSet = line.set;
    });
  }

  private markPos(set: SetDef, at?: string): V3 {
    if (!at) return add(set.origin, [0, 0, -1]);
    return set.marks[at] ?? set.spots[at] ?? add(set.origin, [0, 0, -1]);
  }
  private lineOf(f: number) { let i = 0; while (i + 1 < this.lineA.length && f >= this.lineA[i + 1]) i++; return i; }

  /** every actor on stage in line i at frame f */
  castAt(i: number, f: number): (CastState & { head: V3 })[] {
    const line = this.plan.lines[i], set = SETS[line.set] ?? SETS.bedroom, out: (CastState & { head: V3 })[] = [];
    let n = 0;
    for (const [key, s0] of Object.entries(this.actorStart[i])) {
      n++;
      let pos = this.markPos(set, s0.at), pose: Pose = s0.pose ?? "stand", face: Face = s0.face ?? "neutral";
      let eye = s0.eye ?? 0, eyeY = s0.eyeY ?? 0, hold: Thing | null = s0.hold ?? null, lie = !!s0.lie || s0.at === "bed.lie", sweat = !!s0.sweat;
      let give: [Thing, number] | null = null, phase = 0;
      for (const e of this.events[i][key] ?? []) {
        const s = e.spec;
        if (f < e.f) break;
        if (s.face) face = s.face; if (s.eye !== undefined) eye = s.eye; if (s.eyeY !== undefined) eyeY = s.eyeY;
        if (s.hold !== undefined) hold = s.hold; if (s.lie !== undefined) lie = s.lie; if (s.sweat !== undefined) sweat = s.sweat;
        if (s.pose) pose = s.pose;
        if (s.give) { give = [s.give, smooth((f - e.f) / 10)]; hold = null; }
        if (s.to) {
          const to = this.markPos(set, s.to), d = Math.hypot(to[0] - pos[0], to[2] - pos[2]), dur = Math.max(14, Math.min(48, Math.round((d / 1.3) * FPS)));
          const u = (f - e.f) / dur;
          if (u < 1) { const w = smooth(u); pos = add(pos, mulv(sub(to, pos), w)); pose = "walk"; phase = ((f - e.f) / 15) % 1; lie = false; }
          else { pos = to; if (s.pose === undefined && pose === "walk") pose = "stand"; }
        }
      }
      if (lie) pos = this.markPos(set, "bed.lie");
      const blink = face === "asleep" ? 1 : blinkAt(f, n * 11 + key.length * 3);
      const right: V3 = [set.front[2], 0, -set.front[0]];
      const head: V3 = lie ? add(pos, add(mulv(right, 1.3), [0, 0.1, 0])) : add(pos, [0, pose === "sit" ? 1.3 : 1.48, 0]);
      out.push({ key, look: this.looks[key] ?? LOOKS[key] ?? LOOKS.you, pos, pose, face, eyeX: eye, eyeY, blink, phase, hold, give, lie, sweat,
        shadow: !lie && pos[1] < 0.05, head });
    }
    return out;
  }

  private subject(i: number, f: number, who: string) { const c = this.castAt(i, f).find((x) => x.key === who) ?? this.castAt(i, f)[0]; return c; }
  /** camera for segment s at frame f (framing chosen at the segment start, then a slow push-in) */
  camAt(seg: Seg, f: number): Cam & { focus: V3; dof: number } {
    const set = seg.set, [kind, arg = "you"] = seg.shot.split(":"), x = f - seg.a, front = set.front, right: V3 = [front[2], 0, -front[0]];
    const roll = (seg.idx % 2 ? -1 : 1) * 0.035;
    let pos: V3, look: V3, fov = 44, dof = 0, focus: V3;
    if (kind === "wide") { [pos, look] = dolly(set.wide.pos, set.wide.look, pushK(x, 0.0018)); fov = set.wide.fov; focus = look; }
    else if (kind === "insert") { const p = set.spots[arg] ?? this.markPos(set, arg); [pos, look] = dolly(add(p, add(mulv(front, 0.95), [0, 0.45, 0])), p, pushK(x, 0.003)); fov = 40; dof = 12; focus = p; }
    else if (kind === "two") {
      const [a1, b1] = arg.split(","), A = this.subject(seg.line, seg.a, a1), B = this.subject(seg.line, seg.a, b1 ?? a1);
      const mid = mulv(add(A.pos, B.pos), 0.5), d = Math.hypot(A.pos[0] - B.pos[0], A.pos[2] - B.pos[2]);
      [pos, look] = dolly(add(mid, add(mulv(front, 3.8 + 1.0 * d), [0, 1.45, 0])), add(mid, [0, 1.0, 0]), pushK(x, 0.002)); fov = 46; dof = 4; focus = add(mid, [0, 1.4, 0]);
    } else {
      const S = this.subject(seg.line, seg.a, arg), h = S.head;
      if (kind === "close") { [pos, look] = dolly(add(h, add(mulv(front, 2.75), add(mulv(right, 0.24), [0, 0.04, 0]))), add(h, [0, -0.24, 0]), pushK(x, 0.003)); fov = 38; dof = 13; }
      else { [pos, look] = dolly(add(h, add(mulv(front, 4.1), add(mulv(right, 0.4), [0, -0.1, 0]))), add(h, [0, S.pose === "sit" || S.lie ? -0.45 : -0.62, 0]), pushK(x, 0.0022)); fov = 44; dof = 7; }
      focus = h;
    }
    let cam: Cam = { pos, look, fov, roll: kind === "close" ? roll : 0 };
    // impact kicks: the view flips sign every frame and decays over 7 frames
    let k = 0; for (const [f0, g] of this.kicks) { const n = f - f0; if (n >= 0 && n < 7) k += g * (n % 2 ? -1 : 1) * (1 - n / 7) ** 1.5; }
    if (k) { const d = sub(cam.look, cam.pos), L = Math.hypot(...d), hh = Math.hypot(d[0], d[2]) || 1, m = (3 / 640) * Math.tan((cam.fov * Math.PI) / 360) * L * k;
      cam = { ...cam, look: [cam.look[0] - (d[2] / hh) * m, cam.look[1] + 0.6 * m, cam.look[2] + (d[0] / hh) * m], roll: cam.roll + k * 0.004 }; }
    return { ...cam, focus, dof };
  }
  private sunFor(seg: Seg): V3 {
    const c = this.camAt(seg, seg.a), fx0 = c.look[0] - c.pos[0], fz0 = c.look[2] - c.pos[2], n = Math.hypot(fx0, fz0) || 1, fx = fx0 / n, fz = fz0 / n;
    const az = (seg.set.sun.az * Math.PI) / 180, el = (seg.set.sun.el * Math.PI) / 180;
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    return [hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)];
  }
  segAt(f: number) { return this.segs.find((s) => f >= s.a && f < s.b) ?? this.segs[this.segs.length - 1]; }
  /** layers to draw: the current segment, plus the next one fading in across a change of set */
  layersAt(f: number): { seg: Seg; alpha: number }[] {
    for (let k = 1; k < this.segs.length; k++) {
      const s = this.segs[k], p = this.segs[k - 1];
      if (s.set !== p.set && f >= s.a - 4 && f < s.a + 4) return [{ seg: p, alpha: 1 }, { seg: s, alpha: (f - (s.a - 4) + 1) / 9 }];
    }
    return [{ seg: this.segAt(f), alpha: 1 }];
  }

  stateAt(seg: Seg, f: number): FrameState {
    const i = seg.line, line = this.plan.lines[i], cast = this.castAt(i, Math.min(f, this.lineB[i] - 1));
    const cam = this.camAt(seg, f);
    const props: Record<string, number> = {};
    for (const p of this.propOn) if (f >= p.f0 && f < p.f1) props[p.name] = p.pop ? Math.min(1, 1.12 * Math.sin(Math.min(1, (f - p.f0) / 7) * Math.PI * 0.62) / Math.sin(Math.PI * 0.62)) : 1;
    if (line.set !== "lawn") props.car = 0;
    let clockSpin = 0;
    for (let k = 0; k + 1 < this.clockAt.length; k += 2) { const [a0, c0] = this.clockAt[k], [b0, c1] = this.clockAt[k + 1]; if (f >= a0 && f < b0) clockSpin = c0 + (c1 - c0) * glide((f - a0) / Math.max(1, b0 - a0)); else if (f >= b0) clockSpin = c1; }
    const cards: CardState[] = [];
    for (const c of this.cards) {
      if (c.line !== i || f < c.f0 || f >= c.f1) continue;
      const who = cast.find((x) => x.key === c.at), u = ((f - c.f0) / 36) % 1, k = Math.min(1, (f - c.f0) / 6);
      const base: V3 = who ? who.head : this.markPos(seg.set, c.at);
      const right: V3 = [seg.set.front[2], 0, -seg.set.front[0]];
      let pos: V3 = add(base, add(mulv(right, 0.42), [0, 0.42, 0.05])), size = 0.42 * k;
      if (c.kind === "zzz") { pos = add(base, add(mulv(right, 0.35), [0, 0.35, 0.1])); size = 0.7; }
      if (c.kind === "critter") { const j = cards.length; pos = add(base, add(mulv(right, (j % 2 ? -0.9 : 0.95) + 0.08 * Math.sin(f / 9 + j)), [0, 0.15 + 0.12 * Math.sin(f / 7 + j * 2), 0.2])); size = 0.55 * k; }
      if (c.kind === "burst") size = 0.6;
      cards.push({ kind: c.kind, pos, size, u: c.kind === "burst" ? Math.min(0.99, (f - c.f0) / 8) : u, rot: c.kind === "critter" ? 0.15 * Math.sin(f / 8) : 0 });
    }
    return { t: f / FPS, set: seg.set.name, light: seg.light, cam, sun: this.sunFor(seg), focus: cam.focus, dof: cam.dof,
      cast: cast.map(({ head: _h, ...c }) => c), props, clockSpin, cards };
  }
  overlaysAt(f: number) { return this.overlays.filter((o) => f >= o.f0 && f < o.f1); }
  flashAt(f: number) { for (const f0 of this.flashes) { const n = f - f0; if (n >= 0 && n < 4) return [1, 0.75, 0.45, 0.2][n]; } return 0; }
}
