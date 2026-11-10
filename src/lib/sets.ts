// The set library. Every set lives at its own origin in one shared world. A shot plan names a set, marks (places
// people stand) and props; cameras are worked out from the marks, so a new video needs no code unless it needs a new set.
export type V3 = [number, number, number];
export type LightName = "int" | "day" | "golden" | "night";

export const BED: V3 = [0, 0, 0];
export const WH: V3 = [400, 0, 0];
export const OFF: V3 = [-400, 0, 0];
export const DIN: V3 = [0, 0, -400];
export const DESK_TOP = 0.8;
export const TABLE_TOP = 0.78;
export const YOU_BED: V3 = [0, 0.64, -2.3];
export const YOU_DESK: V3 = [OFF[0], 0, -2.45];
export const CAR_AT: V3 = [WH[0] + 9.5, 0, 15];
export const RECEIPT_AT: V3 = [DIN[0] + 0.38, TABLE_TOP + 0.004, DIN[2] - 0.02];
export const PINBALL_AT: V3 = [OFF[0] + 2.85, 0, -0.95];
export const CLOCK_AT: V3 = [BED[0] - 1.9, 2.55, BED[2] - 3.27];

export type SetDef = {
  name: string; origin: V3; light: LightName;
  /** unit vector from the subject toward where cameras stand (cameras look the other way) */
  front: V3;
  wide: { pos: V3; look: V3; fov: number };
  marks: Record<string, V3>;
  /** points of interest for insert shots */
  spots: Record<string, V3>;
  sun: { az: number; el: number };
};
const n3 = (v: V3): V3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const at = (o: V3, d: V3): V3 => [o[0] + d[0], o[1] + d[1], o[2] + d[2]];

export const SETS: Record<string, SetDef> = {
  bedroom: {
    name: "bedroom", origin: BED, light: "int", front: n3([0.25, 0, 1]), sun: { az: 140, el: 38 },
    wide: { pos: [1.05, 1.6, 1.45], look: [0.2, 1.2, -2.0], fov: 50 },
    marks: { bed: YOU_BED, "bed.lie": [-0.95, 0.98, -1.85], "bed.left": [-1.35, 0, -1.2], "bed.right": [1.45, 0, -1.25], window: [2.72, 0, -2.45],
      floor: [0.2, 0, -0.5], left: [-1.6, 0, -0.4], right: [1.6, 0, -0.2], door: [-2.6, 0, 1.2] },
    spots: { clock: CLOCK_AT, window: [3.2, 1.9, -1.2], lamp: [1.62, 1.1, -2.7], chandelier: [0, 3.0, -1.35], bed: [0, 0.8, -2.0] },
  },
  office: {
    name: "office", origin: OFF, light: "int", front: n3([0.15, 0, 1]), sun: { az: 155, el: 34 },
    wide: { pos: at(OFF, [-0.25, 1.7, 3.0]), look: at(OFF, [0.45, 1.2, -1.9]), fov: 48 },
    marks: { desk: YOU_DESK, "desk.side": [OFF[0] + 1.25, 0, -1.45], "desk.front": [OFF[0] - 0.2, 0, -0.55], floor: [OFF[0] + 0.3, 0, 0.4],
      left: [OFF[0] - 1.8, 0, -0.6], right: [OFF[0] + 1.6, 0, -0.4], pinball: [PINBALL_AT[0] - 0.68, 0, PINBALL_AT[2] + 0.4], "pinball.side": [PINBALL_AT[0] - 1.7, 0, PINBALL_AT[2] + 0.75] },
    spots: { desk: [OFF[0] + 0.05, DESK_TOP, -1.5], pinball: [PINBALL_AT[0], 1.05, PINBALL_AT[2] + 0.35], window: [OFF[0], 2.2, -4.6], flag: [OFF[0] + 1.75, 2.4, -3.95] },
  },
  dining: {
    name: "dining", origin: DIN, light: "int", front: n3([0.2, 0, 1]), sun: { az: 150, el: 36 },
    wide: { pos: at(DIN, [1.4, 1.75, 2.0]), look: at(DIN, [0, 1.0, -0.9]), fov: 46 },
    marks: { table: [DIN[0], 0, DIN[2] - 1.05], "table.left": [DIN[0] - 1.05, 0, DIN[2] - 1.05], "table.right": [DIN[0] + 1.05, 0, DIN[2] - 1.05],
      "table.front": [DIN[0] + 0.4, 0, DIN[2] + 0.75], floor: [DIN[0] + 0.3, 0, DIN[2] + 1.2], left: [DIN[0] - 2.0, 0, DIN[2] + 0.4], right: [DIN[0] + 2.0, 0, DIN[2] + 0.4] },
    spots: { cups: [DIN[0], TABLE_TOP + 0.06, DIN[2] - 0.22], table: [DIN[0], TABLE_TOP, DIN[2] - 0.35], plate: [DIN[0], TABLE_TOP + 0.05, DIN[2] - 0.5], receipt: RECEIPT_AT, poster: [DIN[0] - 0.95, TABLE_TOP + 0.45, DIN[2] - 0.45] },
  },
  lawn: {
    name: "lawn", origin: WH, light: "day", front: n3([0, 0, 1]), sun: { az: 125, el: 42 },
    wide: { pos: at(WH, [-9, 2.4, 52]), look: at(WH, [0, 9.5, 0]), fov: 44 },
    marks: { path: [WH[0], 0, 22], "path.left": [WH[0] - 2.5, 0, 22], "path.right": [WH[0] + 2.5, 0, 22], car: [CAR_AT[0] - 3.4, 0, CAR_AT[2] + 1.3],
      "car.side": [CAR_AT[0] - 2.2, 0, CAR_AT[2] + 1.5], fountain: [WH[0] + 3, 0, 30] },
    spots: { house: [WH[0], 9, 0], window: [WH[0] - 11, 10.4, 0], car: CAR_AT, sky: [WH[0], 26, 0] },
  },
};

/** props the plan can switch on, and the set each belongs to */
export const PROPS = ["boxes", "car", "pancakes", "bacon", "juice", "eggs", "toast", "fancy", "receipt", "folder", "pinball", "poster", "clock", "coffee"] as const;
export type PropName = (typeof PROPS)[number];
