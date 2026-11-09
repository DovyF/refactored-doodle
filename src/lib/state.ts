// What the world needs to draw one frame. The plan compiler produces it; World.update() consumes it.
import type { V3, LightName } from "./sets";
import type { ToyLook, Pose, Face, Thing } from "./toy";

export type Cam = { pos: V3; look: V3; fov: number; roll: number };
export type CastState = {
  key: string; look: ToyLook; pos: V3; pose: Pose; face: Face; eyeX: number; eyeY: number; blink: number; phase: number;
  hold: Thing | null; give: [Thing, number] | null; lie: boolean; sweat: boolean; shadow: boolean;
};
export type CardState = { kind: string; pos: V3; size: number; u: number; rot: number };
export type FrameState = {
  t: number; set: string; light: LightName; cam: Cam; sun: V3; focus: V3; dof: number;
  cast: CastState[]; props: Record<string, number>; clockSpin: number; cards: CardState[];
};
