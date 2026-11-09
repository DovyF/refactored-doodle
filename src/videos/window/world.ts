// One three.js scene with three sets far apart: the bedroom (BED), the White House lawn (WH) and the office (OFF).
// Reuses the skill's look engine (two-tone shading, ink, card shading, canvas pool) from ../bridge; only the sets,
// cast and timeline are new. update(id, f, camera) poses everything for shot `id` at frame f.
import * as THREE from "three";
import { Batch, boxGeo, V, lam, quad, tri } from "../bridge/build";
import { grassHD, cobbleHD, stoneHD, cloudHD, ctex } from "../bridge/paint";
import { LIGHTS, LOOK, LightPreset } from "../bridge/lights";
import { TONE, CHAR, untone } from "../bridge/shade";
import { NOINK } from "../bridge/ink";
import { Pool, Actor, Fx } from "../bridge/cast";
import { Pen, bodyFront, fxContact, fxBurst, Outfit, FrontOpts } from "./toonx";
import { cardboard, parquet, glassTex } from "./paintw";
import {
  FPS, SHOTS, BED, WH, OFF, DIN, YOU_BED, YOU_DESK, DESK_TOP, TABLE_TOP, CAR_AT, RECEIPT_AT, V3, camAt, blink, LightName, castAt, pop,
  BOX_TIMES, FOOD_TIMES, receiptStage, Who, smooth,
} from "./story";
import { icon, receiptTex, planeTex, bellTex, qmarkTex } from "./paintw";
import { wallpaper, wainscot, carpet, ceiling, blanket, mahogany, drape, sheetTex, facade, balustrade, usFlag, officeWall, officeCarpet, folderTex, leather, BAY } from "./paintx";

// ---------------- light presets: the skill's day light, plus a brighter-shade interior version ----------------
const INT: LightPreset = { ...LIGHTS.day, shade: [0.6, 0.56, 0.66], lift: [0.06, 0.06, 0.1], fogNear: 60, fogFar: 600, charShade: 0.9 };
const PRESET: Record<LightName, LightPreset> = { int: INT, day: { ...LIGHTS.day, fogNear: 60, fogFar: 520 }, golden: { ...LIGHTS.golden, fogNear: 80, fogFar: 600 } };

// ---------------- cast ----------------
const HAIR = "#4a3324";
export const YOU_PJ: Outfit = { jacket: "#86acdc", pants: "#86acdc", boots: "#f4f1ea", hat: "hair", hair: HAIR, buttons: "#ffffff", stripes: "#6a92c9" };
export const YOU_SUIT: Outfit = { jacket: "#273452", pants: "#273452", boots: "#1d1b22", hat: "hair", hair: HAIR, buttons: "#1d2640", tie: "#c3343c", shirt: "#f6f3ec" };
const AIDE: Outfit = { jacket: "#2a2a30", pants: "#2a2a30", boots: "#151418", hat: "hair", hair: "#22191a", buttons: "#18181c", tie: "#3c4f7a", shirt: "#f6f3ec", skin: "#c99067" };
const AGENT: Outfit = { jacket: "#18181d", pants: "#18181d", boots: "#0f0f12", hat: "hair", hair: "#1b1516", buttons: "#101014", tie: "#18181d", shirt: "#f6f3ec", shades: true, skin: "#f1c9a3" };
const YOU_SEED = 4;
/** drawing resolution by distance: [canvas w, h, scale from the 600 x 1000 design] */
const tier = (d: number): [number, number, number] => (d < 3.2 ? [1800, 3000, 3.0] : d < 6.5 ? [1080, 1800, 1.8] : d < 16 ? [480, 800, 0.8] : [240, 400, 0.4]);
const q = (v: number, n = 120) => Math.round(v * n) / n;

// ---------------- small geometry helpers ----------------
const M4 = (x: number, y: number, z: number) => new THREE.Matrix4().makeTranslation(x, y, z);
const box = (b: Batch, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, m: THREE.Material, tile = 0) =>
  b.add(boxGeo(V(x0, y0, z0), V(x1, y1, z1), tile, true), m);
const cyl = (b: Batch, x: number, y0: number, z: number, r: number, h: number, m: THREE.Material, seg = 20, r2 = r) =>
  b.add(new THREE.CylinderGeometry(r2, r, h, seg), m, M4(x, y0 + h / 2, z));
/** upward quad x0..x1, z0..z1 at height y, one image over it (or tiled every `tile` m) */
const floorQ = (x0: number, x1: number, z0: number, z1: number, y: number, tile = 0) =>
  quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), tile ? (x1 - x0) / tile : 1, tile ? (z1 - z0) / tile : 1);
/** downward quad (ceiling) */
const ceilQ = (x0: number, x1: number, z0: number, z1: number, y: number) => quad(V(x0, y, z0), V(x1, y, z0), V(x1, y, z1), V(x0, y, z1));
type H4 = [number, number, number, number];
/** generic wall: P(u, y) -> world point; u x up must point out of the wall's front. Holes are [u0, u1, y0, y1].
 *  tile = metres per texture repeat (0 = one image over the whole wall). */
const wallP = (b: Batch, P: (u: number, y: number) => THREE.Vector3, u0: number, u1: number, y0: number, y1: number, m: THREE.Material, holes: H4[] = [], tile = 2) => {
  const us = [u0, u1, ...holes.flatMap((h) => [h[0], h[1]])].sort((a, c) => a - c);
  const U = (v: number) => (tile ? (v - u0) / tile : (v - u0) / (u1 - u0)), W = (v: number) => (tile ? (v - y0) / tile : (v - y0) / (y1 - y0));
  for (let i = 0; i < us.length - 1; i++) {
    const a = us[i], c = us[i + 1];
    if (c - a < 1e-4) continue;
    const mid = (a + c) / 2, inH = holes.filter((h) => mid > h[0] && mid < h[1]);
    const ys = [y0, y1, ...inH.flatMap((h) => [h[2], h[3]])].sort((p, q2) => p - q2);
    for (let j = 0; j < ys.length - 1; j++) {
      const y = ys[j], e = ys[j + 1], ym = (y + e) / 2;
      if (e - y < 1e-4 || inH.some((h) => ym > h[2] && ym < h[3])) continue;
      b.add(quad(P(a, y), P(c, y), P(c, e), P(a, e), U(c), W(e), U(a), W(y)), m);
    }
  }
};
/** wall in the plane z = z facing +z, x0..x1 */
const wallZ = (b: Batch, x0: number, x1: number, y0: number, y1: number, z: number, m: THREE.Material, holes: H4[] = [], tile = 2) =>
  wallP(b, (u, y) => V(u, y, z), x0, x1, y0, y1, m, holes, tile);
/** wall in the plane x = x facing +x (dir 1) or -x (dir -1), z0..z1; holes given in z */
const wallX = (b: Batch, x: number, z0: number, z1: number, y0: number, y1: number, dir: number, m: THREE.Material, holes: H4[] = [], tile = 2) =>
  dir > 0
    ? wallP(b, (u, y) => V(x, y, -u), -z1, -z0, y0, y1, m, holes.map((h) => [-h[1], -h[0], h[2], h[3]] as H4), tile)
    : wallP(b, (u, y) => V(x, y, u), z0, z1, y0, y1, m, holes, tile);
const treeAt = (b: Batch, x: number, z: number, h: number, bark: THREE.Material, leaf: THREE.Material[], seed: number) => {
  cyl(b, x, 0, z, 0.32 * h / 12, h * 0.45, bark, 10, 0.24 * h / 12);
  const blobs: [number, number, number, number][] = [[0, 0.62, 0, 0.32], [-0.2, 0.52, 0.12, 0.24], [0.22, 0.55, -0.08, 0.25], [0.05, 0.8, 0.02, 0.22]];
  blobs.forEach(([dx, dy, dz, r], i) => {
    const g = new THREE.IcosahedronGeometry(r * h, 2);
    b.add(g, leaf[(i + seed) % leaf.length], M4(x + dx * h, dy * h, z + dz * h));
  });
};

type Mats = Record<string, THREE.Material>;

export class World {
  root = new THREE.Group();
  private pool = new Pool();
  private actors: Actor[] = [];
  private fxs: Fx[] = [];
  private sun: THREE.DirectionalLight; private hemi: THREE.HemisphereLight;
  private sky: THREE.Mesh; private skyMat: THREE.ShaderMaterial;
  private fog = new THREE.Fog("#bccbec", 60, 600);
  private clouds: { m: THREE.Mesh; off: THREE.Vector3 }[] = [];
  private flags: THREE.Mesh[] = [];
  private folder: THREE.Mesh; private folderMats: THREE.Material[];
  private sunCache = new Map<number, THREE.Vector3>();
  private boxes: THREE.Mesh[] = [];
  private food: Record<string, THREE.Group> = {};
  private receipt: THREE.Mesh; private receiptMats: THREE.Material[];
  private v = new THREE.Vector3();

  constructor() {
    const R = this.root, M: Mats = {};
    // ---- sky (the skill's 5-stop elevation gradient) + clouds ----
    this.skyMat = new THREE.ShaderMaterial({
      uniforms: { c0: { value: new THREE.Color() }, c1: { value: new THREE.Color() }, c2: { value: new THREE.Color() },
        c3: { value: new THREE.Color() }, c4: { value: new THREE.Color() }, e: { value: new THREE.Vector4() } },
      vertexShader: "varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: `uniform vec3 c0, c1, c2, c3, c4; uniform vec4 e; varying vec3 vP;
        void main(){ float el = asin(clamp(normalize(vP).y, -1.0, 1.0));
          vec3 c = mix(c0, c1, smoothstep(0.0, e.x, el)); c = mix(c, c2, smoothstep(e.x, e.y, el));
          c = mix(c, c3, smoothstep(e.y, e.z, el)); c = mix(c, c4, smoothstep(e.z, e.w, el)); gl_FragColor = vec4(c, 1.0); }`,
      side: THREE.BackSide, depthWrite: false, fog: false,
    });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 48, 24), this.skyMat);
    this.sky.renderOrder = -1; this.sky.frustumCulled = false; this.sky.layers.set(NOINK);
    R.add(this.sky);
    const cm = [0, 1, 2, 3].map((k) => cloudHD(k, LOOK.day.cloud));
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2 + 0.3, d = 620 + (i % 3) * 60, w = 130 + (i % 4) * 30;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: cm[i % 4], color: new THREE.Color(1.1, 1.1, 1.1), transparent: true, depthWrite: false, fog: false }));
      m.scale.set(w, w / 2, 1); m.layers.set(NOINK); m.frustumCulled = false;
      this.clouds.push({ m, off: V(Math.cos(a) * d, 120 + (i % 4) * 38, Math.sin(a) * d) }); R.add(m);
    }
    this.hemi = new THREE.HemisphereLight("#dcecff", "#b49a78", 0.55);
    this.sun = new THREE.DirectionalLight("#fff3e0", 2.8);
    this.sun.castShadow = true; this.sun.shadow.mapSize.set(4096, 4096);
    R.add(this.hemi, this.sun, this.sun.target);

    // ---- materials ----
    const emis = (key: string, map: () => THREE.Texture, k: number) => lam(key, () => ({ map: map(), emissive: new THREE.Color(k, k, k), emissiveMap: map() }));
    M.wall = emis("p_wallM", wallpaper, 0.18); M.wains = emis("p_wainsM", wainscot, 0.1);
    M.carpet = lam("p_carpetM", () => ({ map: carpet() }));
    M.ceil = emis("p_ceilM", ceiling, 0.62);
    M.blanket = lam("p_blanketM", () => ({ map: blanket() }));
    M.sheet = lam("p_sheetM", () => ({ map: sheetTex() }));
    M.wood = lam("p_mahogM", () => ({ map: mahogany() }));
    M.drape = emis("p_drapeM", drape, 0.12);
    M.gold = lam("p_gold", () => ({ color: "#d9b45a" }));
    M.white = lam("p_white", () => ({ color: "#f3efe6" }));
    M.trim = lam("p_trim", () => ({ color: "#f7f4ec" }));
    M.lampshade = lam("p_shade", () => ({ color: "#f3e3b8", emissive: new THREE.Color(0.55, 0.45, 0.25) }));
    const bulb = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.6, 1.7) });
    const crystal = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.6, 1.75) });
    M.facade = lam("p_facadeM", () => ({ map: facade() }));
    M.stone = lam("p_stone", () => ({ map: stoneHD("p_stoneT", ["#f1ede3", "#ece7dc", "#f5f2ea", "#e8e2d5"], "#cfc8b9") }));
    M.balus = lam("p_balusM", () => ({ map: balustrade() }));
    M.roof = lam("p_roof", () => ({ color: "#9aa0a8" }));
    M.grass = lam("grassHD", () => ({ map: grassHD() }));
    M.cobble = lam("cobbleHD", () => ({ map: cobbleHD() }));
    M.hedge = lam("p_hedge", () => ({ color: "#4e9a45" }));
    M.bark = lam("p_bark", () => ({ color: "#7a5236" }));
    const leaves = ["#5aa64a", "#4f9c43", "#66b052"].map((c, i) => lam("p_leaf" + i, () => ({ color: c })));
    M.water = lam("p_water", () => ({ color: "#4fb0d4", emissive: new THREE.Color(0.08, 0.18, 0.25) }));
    M.room = emis("p_roomM", wallpaper, 0.25);
    M.flag = lam("p_flagM", () => ({ map: usFlag(), side: THREE.DoubleSide }));
    M.pole = lam("p_pole", () => ({ color: "#d9d6cf" }));
    M.owall = emis("p_owallM", officeWall, 0.2);
    M.ocarpet = lam("p_ocarpetM", () => ({ map: officeCarpet() }));
    M.leather = lam("p_leatherM", () => ({ map: leather() }));
    M.plant = lam("p_plant", () => ({ color: "#4f9c43" }));
    M.pot = lam("p_pot", () => ({ color: "#b9895a" }));

    // ================= BEDROOM (origin) =================
    const shell = new Batch(), bb = new Batch();
    const [bx, , bz] = BED, RW = 3.3, RH = 3.9;
    shell.add(floorQ(bx - RW, bx + RW, bz - RW, bz + 3.5, 0), M.carpet);
    shell.add(ceilQ(bx - RW, bx + RW, bz - RW, bz + 3.5, RH), M.ceil);
    // back wall: wainscot below 1 m, wallpaper above, a dado rail
    wallZ(shell, bx - RW, bx + RW, 0, 1.0, bz - RW, M.wains, [], 2);
    wallZ(shell, bx - RW, bx + RW, 1.0, RH, bz - RW, M.wall, [], 1.6);
    box(bb, bx - RW, 0.98, bz - RW, bx + RW, 1.08, bz - RW + 0.05, M.wood);
    // left wall (x = -RW, facing +x) and right wall with the tall window (facing -x)
    wallX(shell, bx - RW, bz - RW, bz + 3.5, 0, 1.0, 1, M.wains, [], 2);
    wallX(shell, bx - RW, bz - RW, bz + 3.5, 1.0, RH, 1, M.wall, [], 1.6);
    const WINZ: [number, number] = [bz - 2.0, bz - 0.4];
    wallX(shell, bx + RW, bz - RW, bz + 3.5, 0, 1.0, -1, M.wains, [], 2);
    wallX(shell, bx + RW, bz - RW, bz + 3.5, 1.0, RH, -1, M.wall, [[WINZ[0], WINZ[1], 1.1, 3.2]], 1.6);
    // crown moulding
    box(bb, bx - RW, RH - 0.22, bz - RW, bx + RW, RH, bz - RW + 0.14, M.gold);
    box(bb, bx - RW, RH - 0.22, bz - RW, bx - RW + 0.14, RH, bz + 3.5, M.gold);
    box(bb, bx + RW - 0.14, RH - 0.22, bz - RW, bx + RW, RH, bz + 3.5, M.gold);
    // window frame, muntins, sill, drapes
    for (const z of WINZ) box(bb, bx + RW - 0.12, 1.05, z - 0.06, bx + RW + 0.02, 3.25, z + 0.06, M.trim);
    box(bb, bx + RW - 0.12, 3.18, WINZ[0], bx + RW + 0.02, 3.3, WINZ[1], M.trim);
    box(bb, bx + RW - 0.22, 1.02, WINZ[0] - 0.1, bx + RW + 0.02, 1.12, WINZ[1] + 0.1, M.trim);
    box(bb, bx + RW - 0.05, 1.1, (WINZ[0] + WINZ[1]) / 2 - 0.025, bx + RW, 3.2, (WINZ[0] + WINZ[1]) / 2 + 0.025, M.trim);
    for (const y of [1.8, 2.5]) box(bb, bx + RW - 0.05, y - 0.025, WINZ[0], bx + RW, y + 0.025, WINZ[1], M.trim);
    for (const [z0, z1] of [[WINZ[0] - 0.75, WINZ[0] - 0.05], [WINZ[1] + 0.05, WINZ[1] + 0.75]]) box(bb, bx + RW - 0.3, 0.05, z0, bx + RW - 0.12, 3.5, z1, M.drape);
    box(bb, bx + RW - 0.32, 3.45, WINZ[0] - 0.85, bx + RW - 0.12, 3.62, WINZ[1] + 0.85, M.gold);
    // four-poster bed against the back wall
    const BX0 = bx - 1.05, BX1 = bx + 1.05, BZ0 = bz - 3.15, BZ1 = bz - 0.75;
    box(bb, BX0 - 0.05, 0.12, BZ0 + 0.1, BX1 + 0.05, 0.42, BZ1, M.wood);                         // frame
    box(bb, BX0, 0.42, BZ0 + 0.12, BX1, 0.62, BZ1 - 0.02, M.sheet);                               // mattress
    box(bb, BX0 - 0.04, 0.6, BZ0 + 0.85, BX1 + 0.04, 0.72, BZ1 + 0.02, M.blanket);                 // blanket over the legs
    box(bb, BX0 - 0.03, 0.7, YOU_BED[2] + 0.06, BX1 + 0.03, 0.8, YOU_BED[2] + 0.26, M.sheet);      // folded-over edge
    for (const x of [-0.5, 0.5]) box(bb, bx + x - 0.38, 0.62, BZ0 + 0.18, bx + x + 0.38, 0.84, BZ0 + 0.62, M.sheet); // pillows
    box(bb, BX0 - 0.1, 0.1, BZ0, BX1 + 0.1, 2.0, BZ0 + 0.12, M.wood);                             // headboard
    box(bb, BX0 + 0.12, 1.2, BZ0 + 0.11, BX1 - 0.12, 1.85, BZ0 + 0.14, lam("p_inlay", () => ({ color: "#4a2518" }))); // carved panel
    box(bb, BX0 - 0.12, 1.98, BZ0 - 0.02, BX1 + 0.12, 2.08, BZ0 + 0.16, M.gold);
    box(bb, BX0 - 0.1, 0.1, BZ1 - 0.1, BX1 + 0.1, 0.95, BZ1 + 0.02, M.wood);                      // footboard
    for (const [x, z] of [[BX0 - 0.1, BZ0 + 0.06], [BX1 + 0.1, BZ0 + 0.06], [BX0 - 0.1, BZ1 - 0.04], [BX1 + 0.1, BZ1 - 0.04]]) {
      cyl(bb, x, 0, z, 0.075, 2.55, M.wood, 12);
      bb.add(new THREE.SphereGeometry(0.11, 12, 8), M.gold, M4(x, 2.62, z));
    }
    // nightstands + lamps
    for (const s of [-1, 1]) {
      const nx = bx + s * 1.62, nz = BZ0 + 0.45;
      box(bb, nx - 0.32, 0, nz - 0.28, nx + 0.32, 0.62, nz + 0.28, M.wood);
      cyl(bb, nx, 0.62, nz, 0.08, 0.38, M.gold, 12);
      bb.add(new THREE.CylinderGeometry(0.14, 0.26, 0.3, 16, 1), M.lampshade, M4(nx, 1.12, nz));
    }
    // chandelier (bulbs bloom)
    const CH = V(bx, 3.0, bz - 1.35);
    cyl(bb, CH.x, CH.y + 0.35, CH.z, 0.025, RH - CH.y - 0.35, M.gold, 8);
    bb.add(new THREE.TorusGeometry(0.5, 0.04, 8, 32).rotateX(Math.PI / 2), M.gold, M4(CH.x, CH.y, CH.z));
    bb.add(new THREE.TorusGeometry(0.28, 0.035, 8, 24).rotateX(Math.PI / 2), M.gold, M4(CH.x, CH.y + 0.25, CH.z));
    bb.add(new THREE.SphereGeometry(0.12, 12, 8), M.gold, M4(CH.x, CH.y - 0.12, CH.z));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, x = CH.x + Math.cos(a) * 0.5, z = CH.z + Math.sin(a) * 0.5;
      cyl(bb, x, CH.y, z, 0.03, 0.12, M.white, 8);
      const bl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulb); bl.position.set(x, CH.y + 0.17, z); bl.layers.set(NOINK); R.add(bl);
      const cr = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), crystal); cr.position.set(CH.x + Math.cos(a + 0.4) * 0.42, CH.y - 0.16, CH.z + Math.sin(a + 0.4) * 0.42); cr.scale.y = 1.8; R.add(cr);
    }
    // a painting on the left wall
    box(bb, bx - RW, 1.65, bz - 2.3, bx - RW + 0.06, 2.75, bz - 1.0, M.gold);
    box(bb, bx - RW + 0.05, 1.75, bz - 2.2, bx - RW + 0.07, 2.65, bz - 1.1, lam("p_paint", () => ({ color: "#5d7d6e" })));
    shell.build(R, false); bb.build(R);

    // ================= WHITE HOUSE (north lawn) =================
    const wn = new Batch(), wc = new Batch(), [wx] = WH;
    wn.add(floorQ(wx - 260, wx + 260, -80, 260, 0, 6), M.grass);
    wn.add(floorQ(wx - 3.5, wx + 3.5, 8.8, 120, 0.012, 3), M.cobble);
    // main block (does not cast: keeps the room behind the open window lit); front facade with the window hole
    const L = wx - 20, Rr = wx + 20, D = -15, HB = 15;
    const hole: [number, number, number, number] = [L + BAY(-3) - 0.75, L + BAY(-3) + 0.75, 9.2, 11.6];
    wallZ(wn, L, Rr, 0, HB, 0, M.facade, [hole], 0);
    wn.add(quad(V(L, 0, D), V(L, 0, 0), V(L, HB, 0), V(L, HB, D), 4, 3), M.stone);
    wn.add(quad(V(Rr, 0, 0), V(Rr, 0, D), V(Rr, HB, D), V(Rr, HB, 0), 4, 3), M.stone);
    wn.add(floorQ(L, Rr, D, 0, HB), M.roof);
    // the room behind the open window
    const [h0, h1] = [hole[0] - 1.4, hole[1] + 1.4];
    wallZ(wn, h0, h1, 8.5, 12.4, -3.4, M.room, [], 1.6);
    wallX(wn, h0, -3.4, -0.02, 8.5, 12.4, 1, M.room, [], 1.6);
    wallX(wn, h1, -3.4, -0.02, 8.5, 12.4, -1, M.room, [], 1.6);
    wn.add(floorQ(h0, h1, -3.4, -0.02, 8.5), lam("p_roomFloor", () => ({ color: "#7a5236" })));
    wn.add(ceilQ(h0, h1, -3.4, -0.02, 12.4), M.room);
    for (const [z0, z1, s] of [[-0.25, -0.1, -1], [-0.25, -0.1, 1]] as const)
      box(wn, s < 0 ? hole[0] - 0.05 : hole[1] - 0.55, 9.1, z0 - 0.05, s < 0 ? hole[0] + 0.55 : hole[1] + 0.05, 11.7, z1, M.drape);
    // window surround + open sash (raised), sill
    box(wc, hole[0] - 0.14, 9.05, -0.02, hole[0], 11.75, 0.12, M.trim);
    box(wc, hole[1], 9.05, -0.02, hole[1] + 0.14, 11.75, 0.12, M.trim);
    box(wc, hole[0] - 0.14, 11.6, -0.02, hole[1] + 0.14, 11.78, 0.12, M.trim);
    box(wc, hole[0] - 0.3, 8.95, -0.05, hole[1] + 0.3, 9.2, 0.3, M.trim);
    box(wc, hole[0], 9.2, -0.1, hole[1], 11.6, -0.04, lam("p_glass", () => ({ color: "#6f8aa6" })));
    box(wc, (hole[0] + hole[1]) / 2 - 0.03, 9.2, -0.04, (hole[0] + hole[1]) / 2 + 0.03, 11.6, 0.0, M.trim);
    box(wc, hole[0], 10.37, -0.04, hole[1], 10.43, 0.0, M.trim);
    // cornice, roof balustrade, chimneys
    box(wc, L - 0.4, HB - 0.6, -0.1, Rr + 0.4, HB, 0.55, M.trim);
    wn.add(quad(V(L - 0.3, HB, 0.4), V(Rr + 0.3, HB, 0.4), V(Rr + 0.3, HB + 1.1, 0.4), V(L - 0.3, HB + 1.1, 0.4), 10, 1), M.balus);
    box(wc, L - 0.3, HB + 1.05, 0.25, Rr + 0.3, HB + 1.2, 0.6, M.trim);
    for (const x of [L + 6, Rr - 6]) box(wc, x - 0.6, HB, -9, x + 0.6, HB + 2.6, -7.6, M.stone);
    // portico: stylobate + steps, columns, entablature, pediment
    const PX0 = wx - 7.2, PX1 = wx + 7.2, PZ = 6.4;
    box(wc, PX0, 0, 0, PX1, 1.2, PZ, M.stone, 2);
    for (let i = 0; i < 4; i++) box(wc, wx - 3.2 - i * 0.15, 0, PZ + i * 0.6, wx + 3.2 + i * 0.15, 1.2 - (i + 1) * 0.3 + 0.3, PZ + (i + 1) * 0.6, M.stone, 2);
    const colX = [-6.0, -2.0, 2.0, 6.0];
    for (const z of [PZ - 0.8, 1.6]) for (const x of colX) {
      if (z < 3 && Math.abs(x) < 3) continue;
      box(wc, wx + x - 0.7, 1.2, z - 0.7, wx + x + 0.7, 1.55, z + 0.7, M.trim);
      cyl(wc, wx + x, 1.55, z, 0.52, 11.6, M.white, 24, 0.46);
      box(wc, wx + x - 0.68, 13.15, z - 0.68, wx + x + 0.68, 13.55, z + 0.68, M.trim);
    }
    box(wc, PX0 - 0.3, 13.55, -0.1, PX1 + 0.3, 14.7, PZ + 0.3, M.trim);
    const TY = 14.7, AY = 17.6;
    wc.add(tri(V(PX0 - 0.3, TY, PZ + 0.3), V(PX1 + 0.3, TY, PZ + 0.3), V(wx, AY, PZ + 0.3)), M.trim);
    wc.add(quad(V(PX1 + 0.3, TY, PZ + 0.3), V(PX1 + 0.3, TY, -0.1), V(wx, AY, -0.1), V(wx, AY, PZ + 0.3)), M.roof);
    wc.add(quad(V(PX0 - 0.3, TY, -0.1), V(PX0 - 0.3, TY, PZ + 0.3), V(wx, AY, PZ + 0.3), V(wx, AY, -0.1)), M.roof);
    const lantern = new THREE.Mesh(new THREE.SphereGeometry(0.35, 14, 10), bulb); lantern.position.set(wx, 11.8, 3.3); lantern.layers.set(NOINK); R.add(lantern);
    cyl(wc, wx, 12.1, 3.3, 0.03, 1.45, M.pole, 6);
    // flag on the roof
    cyl(wc, wx, HB + 1.1, -6, 0.09, 7.5, M.pole, 10);
    // hedges, fountain, trees
    for (const s of [-1, 1]) box(wc, wx + s * 8.5, 0, 9.5, wx + s * 19.5, 1.1, 11.0, M.hedge);
    const FZ = 34;
    wc.add(new THREE.CylinderGeometry(4.2, 4.3, 0.7, 48, 1, true), M.stone, M4(wx, 0.35, FZ));
    wc.add(new THREE.RingGeometry(3.85, 4.25, 48).rotateX(-Math.PI / 2), M.trim, M4(wx, 0.71, FZ));
    wc.add(new THREE.CircleGeometry(3.9, 48).rotateX(-Math.PI / 2), M.water, M4(wx, 0.55, FZ));
    cyl(wc, wx, 0.5, FZ, 0.55, 0.9, M.stone, 20, 0.35);
    for (const [x, z, h, s] of [[-34, 18, 15, 0], [-44, -2, 17, 1], [-30, 46, 12, 2], [34, 18, 15, 1], [44, -2, 17, 2], [30, 46, 12, 0], [-18, -26, 16, 1], [18, -26, 16, 2], [-58, 30, 14, 0], [58, 30, 14, 1]] as const)
      treeAt(wc, wx + x, z, h, M.bark, leaves, s);
    wn.build(R, false); wc.build(R);

    // ================= OFFICE =================
    const os = new Batch(), ob = new Batch(), [ox] = OFF, OW = 4.6, OH = 4.3, OB = -4.7;
    os.add(floorQ(ox - OW, ox + OW, OB, 3.6, 0), M.ocarpet);
    os.add(ceilQ(ox - OW, ox + OW, OB, 3.6, OH), M.ceil);
    const winX = [-2.6, 0, 2.6].map((x) => ox + x);
    wallZ(os, ox - OW, ox + OW, 0, OH, OB, M.owall, winX.map((x) => [x - 0.72, x + 0.72, 0.95, 3.45] as [number, number, number, number]), 2.2);
    wallX(os, ox - OW, OB, 3.6, 0, OH, 1, M.owall, [], 2.2);
    wallX(os, ox + OW, OB, 3.6, 0, OH, -1, M.owall, [], 2.2);
    box(ob, ox - OW, OH - 0.25, OB, ox + OW, OH, OB + 0.16, M.trim);
    for (const x of winX) {
      box(ob, x - 0.86, 0.85, OB - 0.02, x - 0.72, 3.6, OB + 0.1, M.trim); box(ob, x + 0.72, 0.85, OB - 0.02, x + 0.86, 3.6, OB + 0.1, M.trim);
      box(ob, x - 0.86, 3.45, OB - 0.02, x + 0.86, 3.6, OB + 0.1, M.trim); box(ob, x - 0.9, 0.82, OB - 0.05, x + 0.9, 0.95, OB + 0.22, M.trim);
      box(ob, x - 0.025, 0.95, OB - 0.02, x + 0.025, 3.45, OB + 0.01, M.trim);
      for (const y of [1.75, 2.6]) box(ob, x - 0.72, y - 0.02, OB - 0.02, x + 0.72, y + 0.02, OB + 0.01, M.trim);
      for (const s of [-1, 1]) box(ob, x + s * 0.86 - (s < 0 ? 0.42 : 0), 0.02, OB + 0.12, x + s * 0.86 + (s > 0 ? 0.42 : 0), 3.9, OB + 0.32, M.drape);
      box(ob, x - 1.35, 3.82, OB + 0.1, x + 1.35, 3.98, OB + 0.36, M.gold);
    }
    // desk (dark wood, panelled front), chair behind
    const DX0 = ox - 1.25, DX1 = ox + 1.25, DZ0 = -2.05, DZ1 = -1.05;
    box(ob, DX0, 0, DZ0, DX1, DESK_TOP - 0.05, DZ1, M.wood);
    box(ob, DX0 - 0.06, DESK_TOP - 0.05, DZ0 - 0.04, DX1 + 0.06, DESK_TOP, DZ1 + 0.06, M.wood);
    for (const x of [-0.8, 0, 0.8]) box(ob, ox + x - 0.32, 0.12, DZ1, ox + x + 0.32, 0.62, DZ1 + 0.02, lam("p_panel", () => ({ color: "#4a2518" })));
    box(ob, ox - 0.42, 0.45, YOU_DESK[2] - 0.5, ox + 0.42, 0.6, YOU_DESK[2] - 0.05, M.leather);
    box(ob, ox - 0.4, 0.6, YOU_DESK[2] - 0.55, ox + 0.4, 1.95, YOU_DESK[2] - 0.38, M.leather);
    // flag stand, plant
    cyl(ob, ox + 1.75, 0, OB + 0.75, 0.025, 2.75, M.pole, 8);
    ob.add(new THREE.SphereGeometry(0.06, 10, 8), M.gold, M4(ox + 1.75, 2.8, OB + 0.75));
    cyl(ob, ox - 2.2, 0, OB + 0.8, 0.28, 0.55, M.pot, 16, 0.22);
    for (const [dx, dy, r] of [[0, 1.0, 0.42], [-0.18, 0.75, 0.3], [0.2, 0.8, 0.3]] as const) ob.add(new THREE.IcosahedronGeometry(r, 2), M.plant, M4(ox - 2.2 + dx, dy, OB + 0.8));
    os.build(R, false); ob.build(R);
    // the folder (appears on the desk after the hand-off)
    this.folderMats = [folderTex(false), folderTex(true)].map((t, i) => lam("p_folderM" + i, () => ({ map: t })));
    const fg = boxGeo(V(-0.17, 0, -0.13), V(0.17, 0.018, 0.13), 0, true);
    this.folder = new THREE.Mesh(fg, this.folderMats[0]);
    this.folder.position.set(OFF[0], DESK_TOP + 0.012, -1.5); this.folder.rotation.y = 0.16; this.folder.castShadow = true; this.folder.receiveShadow = true;
    R.add(this.folder);

    // ================= NEW FOR THIS VIDEO =================
    // bedroom: closed glass in the tall window, moving boxes that pop in
    const glassM = new THREE.MeshBasicMaterial({ map: glassTex(), transparent: true, depthWrite: false });
    const gl = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 2.1), glassM); gl.rotation.y = -Math.PI / 2; gl.position.set(BED[0] + 3.28, 2.15, BED[2] - 1.2); R.add(gl);
    const boxM = lam("p_cardboard", () => ({ map: cardboard() }));
    const BOXES: [number, number, number, number][] = [[-0.85, 0, -0.25, 0.55], [0.45, 0, 0.05, 0.5], [-0.85, 0.44, -0.25, 0.42], [-1.35, 0, -1.3, 0.5], [1.55, 0, -0.55, 0.5],
      [1.55, 0.4, -0.55, 0.4], [-0.2, 0, 0.55, 0.45], [1.1, 0, 0.65, 0.5], [-1.35, 0.4, -1.3, 0.38], [0.45, 0.4, 0.05, 0.4]];
    for (const [x, y, z, sz] of BOXES) {
      const m = new THREE.Mesh(boxGeo(V(-sz / 2, 0, -sz / 2), V(sz / 2, sz * 0.8, sz / 2), 0, true), boxM);
      m.position.set(BED[0] + x, y, BED[2] + z); m.rotation.y = (x * 7) % 0.6; m.castShadow = true; m.receiveShadow = true; m.visible = false;
      this.boxes.push(m); R.add(m);
    }
    // White House driveway: a black SUV
    const car = new Batch(), [cx, , cz] = CAR_AT, carM = lam("p_car", () => ({ color: "#323a48" })), winM = lam("p_carWin", () => ({ color: "#6a84a3" }));
    const wheelM = lam("p_tire", () => ({ color: "#141417" })), chromeM = lam("p_chrome", () => ({ color: "#c9ccd2" }));
    box(car, cx - 2.6, 0.45, cz - 1.0, cx + 2.6, 1.35, cz + 1.0, carM);
    box(car, cx - 1.9, 1.35, cz - 0.95, cx + 1.7, 2.05, cz + 0.95, carM);
    for (const sd of [-1, 1]) box(car, cx - 1.75, 1.42, cz + sd * 0.96 - 0.01, cx + 1.55, 1.95, cz + sd * 0.96 + 0.01, winM);
    box(car, cx - 2.62, 1.42, cz - 0.8, cx - 1.88, 1.95, cz + 0.8, winM);
    box(car, cx - 2.66, 0.55, cz - 0.9, cx - 2.6, 0.75, cz + 0.9, chromeM);
    for (const [wx2, wz2] of [[-1.6, -1.0], [1.6, -1.0], [-1.6, 1.0], [1.6, 1.0]]) car.add(new THREE.CylinderGeometry(0.45, 0.45, 0.3, 20).rotateX(Math.PI / 2), wheelM, M4(cx + wx2, 0.45, cz + wz2));
    for (const sd of [-0.62, 0.62]) car.add(new THREE.SphereGeometry(0.12, 10, 8), lam("p_headl", () => ({ color: "#fff6d8", emissive: new THREE.Color(0.6, 0.55, 0.4) })), M4(cx - 2.6, 1.05, cz + sd));
    car.build(R);
    // dining room: walls with windows, a long table with a white cloth, chairs, chandelier, breakfast props
    const ds = new Batch(), db = new Batch(), [dx, , dz] = DIN, DW = 4.4, DH = 4.0, DB = dz - 3.6;
    ds.add(floorQ(dx - DW, dx + DW, DB, dz + 3.5, 0), lam("p_dfloor", () => ({ map: parquet() })));
    ds.add(ceilQ(dx - DW, dx + DW, DB, dz + 3.5, DH), M.ceil);
    const dwin = [-2.4, 0, 2.4].map((x) => dx + x);
    wallZ(ds, dx - DW, dx + DW, 0, DH, DB, M.owall, dwin.map((x) => [x - 0.7, x + 0.7, 1.0, 3.3] as H4), 2.2);
    wallX(ds, dx - DW, DB, dz + 3.5, 0, DH, 1, M.wall, [], 1.6);
    wallX(ds, dx + DW, DB, dz + 3.5, 0, DH, -1, M.wall, [], 1.6);
    box(db, dx - DW, DH - 0.22, DB, dx + DW, DH, DB + 0.15, M.gold);
    for (const x of dwin) {
      for (const sd of [-1, 1]) box(db, x + sd * 0.7 - 0.07, 0.95, DB - 0.02, x + sd * 0.7 + 0.07, 3.4, DB + 0.1, M.trim);
      box(db, x - 0.77, 3.3, DB - 0.02, x + 0.77, 3.42, DB + 0.1, M.trim); box(db, x - 0.8, 0.9, DB - 0.05, x + 0.8, 1.02, DB + 0.2, M.trim);
      for (const sd of [-1, 1]) box(db, x + sd * 0.78 - (sd < 0 ? 0.36 : 0), 0.02, DB + 0.12, x + sd * 0.78 + (sd > 0 ? 0.36 : 0), 3.7, DB + 0.3, M.drape);
    }
    const clothM = lam("p_cloth", () => ({ color: "#f7f4ec" }));
    box(db, dx - 1.6, TABLE_TOP - 0.04, dz - 0.75, dx + 1.6, TABLE_TOP, dz + 0.15, clothM);
    box(db, dx - 1.62, TABLE_TOP - 0.3, dz - 0.77, dx + 1.62, TABLE_TOP - 0.04, dz + 0.17, clothM);
    for (const [x, z2] of [[-1.4, -0.6], [1.4, -0.6], [-1.4, 0.0], [1.4, 0.0]]) cyl(db, dx + x, 0, dz + z2, 0.05, TABLE_TOP - 0.3, M.wood, 8);
    box(db, dx - 0.32, 0.45, dz - 1.75, dx + 0.32, 0.55, dz - 1.2, M.wood);
    box(db, dx - 0.3, 0.55, dz - 1.75, dx + 0.3, 1.75, dz - 1.62, M.wood);
    box(db, dx - 0.22, 1.0, dz - 1.62, dx + 0.22, 1.6, dz - 1.6, lam("p_seat", () => ({ color: "#8c2d33" })));
    const DC = V(dx, 3.0, dz - 0.4);
    cyl(db, DC.x, DC.y + 0.3, DC.z, 0.025, DH - DC.y - 0.3, M.gold, 8);
    db.add(new THREE.TorusGeometry(0.45, 0.04, 8, 32).rotateX(Math.PI / 2), M.gold, M4(DC.x, DC.y, DC.z));
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; const bl = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), bulb); bl.position.set(DC.x + Math.cos(a) * 0.45, DC.y + 0.12, DC.z + Math.sin(a) * 0.45); bl.layers.set(NOINK); R.add(bl); }
    ds.build(R, false); db.build(R);
    // breakfast props (pop in on their words), a plate, the receipt
    const plateM = lam("p_plate", () => ({ color: "#ffffff" })), pancakeM = lam("p_pancake", () => ({ color: "#d99a4e" })), syrupM = lam("p_syrup", () => ({ color: "#8a4a18" }));
    const baconM = lam("p_bacon", () => ({ color: "#b8433a" })), juiceM = lam("p_juice", () => ({ color: "#f5a623", emissive: new THREE.Color(0.25, 0.12, 0) })), yolkM = lam("p_yolk", () => ({ color: "#ffc93c" }));
    const T0 = TABLE_TOP;
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.17, 0.025, 28), plateM); plate.position.set(dx, T0 + 0.013, dz - 0.5); R.add(plate);
    const mk = (name: string, build: (g: THREE.Group) => void, at: V3) => { const g = new THREE.Group(); build(g); g.position.set(...at); g.visible = false; g.traverse((o) => { o.castShadow = true; }); this.food[name] = g; R.add(g); };
    mk("pancakes", (g) => { for (let i = 0; i < 5; i++) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.028, 24), pancakeM); m.position.y = 0.015 + i * 0.03; g.add(m); }
      const sy = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.012, 20), syrupM); sy.position.y = 0.165; g.add(sy);
      const bt = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.05), yolkM); bt.position.y = 0.185; g.add(bt); }, [dx, T0 + 0.025, dz - 0.5]);
    mk("bacon", (g) => { for (let i = 0; i < 3; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.012, 0.22), baconM); m.position.set(i * 0.07, 0.01, 0); m.rotation.z = 0.15 * Math.sin(i); g.add(m); } }, [dx + 0.3, T0, dz - 0.45]);
    mk("juice", (g) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.04, 0.16, 16), juiceM); m.position.y = 0.08; g.add(m); }, [dx - 0.32, T0, dz - 0.6]);
    mk("eggs", (g) => { for (const x of [0, 0.1]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.01, 18), plateM); w.position.set(x, 0.006, 0); g.add(w); const y = new THREE.Mesh(new THREE.SphereGeometry(0.025, 12, 8), yolkM); y.position.set(x, 0.015, 0); y.scale.y = 0.5; g.add(y); } }, [dx - 0.42, T0, dz - 0.3]);
    mk("toast", (g) => { for (let i = 0; i < 2; i++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.11, 0.015), pancakeM); m.position.set(i * 0.03, 0.06, i * 0.02); m.rotation.x = -0.3; g.add(m); } }, [dx + 0.48, T0, dz - 0.25]);
    mk("fancy", (g) => { for (let i = 0; i < 6; i++) { const x = -1.3 + i * 0.52; const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.02, 24), plateM); p.position.set(x, 0.01, -0.05); g.add(p);
        const c = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 10), clothM); c.position.set(x + 0.26, 0.11, -0.3); g.add(c);
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), bulb); fl.position.set(x + 0.26, 0.24, -0.3); fl.scale.y = 1.6; fl.layers.set(NOINK); g.add(fl); } }, [dx, T0, dz]);
    this.receiptMats = [0, 1, 2, 3].map((k) => new THREE.MeshLambertMaterial({ map: receiptTex(k), emissive: new THREE.Color(0.35, 0.35, 0.35), emissiveMap: receiptTex(k) }));
    this.receipt = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.42), this.receiptMats[0]);
    this.receipt.rotation.set(-Math.PI / 2, 0, 0.12); this.receipt.position.set(...RECEIPT_AT); this.receipt.visible = false; this.receipt.receiveShadow = true;
    R.add(this.receipt);

    // flags: roof (big) + office stand (small); waving planes
    for (const [x, y, z, w, h] of [[wx, HB + 8.6 - 1.0, -6, 3.0, 1.6], [ox + 1.75, 2.72 - 0.35, OB + 0.75, 1.0, 0.56]] as const) {
      const f = new THREE.Mesh(new THREE.PlaneGeometry(w, h, 14, 1), M.flag);
      f.position.set(x, y, z); f.castShadow = true; f.frustumCulled = false; f.userData = { w, h };
      this.flags.push(f); R.add(f);
    }
  }

  /** camera-relative sun, frozen per shot */
  private shotSun(id: number) {
    let v = this.sunCache.get(id);
    if (v) return v;
    const s = SHOTS[id - 1];
    let fx = 0, fz = 0;
    for (let f = s.a; f < s.b; f += 3) { const c = camAt(id, f), x = c.look[0] - c.pos[0], z = c.look[2] - c.pos[2], n = Math.hypot(x, z) || 1; fx += x / n; fz += z / n; }
    const n = Math.hypot(fx, fz) || 1; fx /= n; fz /= n;
    const az = THREE.MathUtils.degToRad(s.sunAz), el = THREE.MathUtils.degToRad(s.sunEl);
    const hx = fx * Math.cos(az) - fz * Math.sin(az), hz = fz * Math.cos(az) + fx * Math.sin(az);
    v = new THREE.Vector3(hx * Math.cos(el), Math.sin(el), hz * Math.cos(el)).normalize();
    this.sunCache.set(id, v);
    return v;
  }
  private actor(i: number) { while (this.actors.length <= i) this.actors.push(new Actor(this.root)); return this.actors[i]; }
  private fx(i: number) { while (this.fxs.length <= i) this.fxs.push(new Fx(this.root)); return this.fxs[i]; }

  update(id: number, f: number, cam: THREE.PerspectiveCamera, scene: THREE.Scene) {
    const t = f / FPS, s = SHOTS[id - 1], L = PRESET[s.light];
    const c = camAt(id, f);
    cam.position.set(...c.pos); cam.up.set(0, 1, 0); cam.lookAt(...c.look); cam.rotateZ(c.roll);
    cam.fov = c.fov; cam.near = 0.05; cam.far = 1500; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
    cam.layers.enable(NOINK);
    const focus = V(...c.look), dist = cam.position.distanceTo(focus);
    // ---- light rig ----
    const sunDir = this.shotSun(id);
    this.hemi.color.set(L.sky); this.hemi.groundColor.set(L.ground); this.hemi.intensity = L.hemiI;
    this.sun.color.set(L.sunCol); this.sun.intensity = L.sunI;
    const Rr = THREE.MathUtils.clamp(dist * 1.15 + 7, 10, 70);
    this.sun.position.copy(focus).addScaledVector(sunDir, 220); this.sun.target.position.copy(focus);
    const sc = this.sun.shadow.camera;
    sc.left = -Rr; sc.right = Rr; sc.top = Rr; sc.bottom = -Rr; sc.near = 20; sc.far = 480; sc.updateProjectionMatrix();
    this.sun.shadow.bias = L.bias; this.sun.shadow.normalBias = L.normalBias * (Rr / 12);
    TONE.uLitCol.value.set(...L.lit); TONE.uShadeCol.value.set(...L.shade); TONE.uShadeLift.value.set(...L.lift);
    TONE.uLambert.value = L.lambert; TONE.uSideK.value = L.sideK; TONE.uTerm.value = L.term; TONE.uBounce.value.set(...LOOK.day.bounce); TONE.uSat.value = LOOK.day.sat;
    CHAR.uCharTint.value.set(...L.charTint); CHAR.uCharShade.value = L.charShade; CHAR.uGrad.value = L.charGrad;
    CHAR.uBodyGrad.value = L.bodyGrad; CHAR.uSideTint.value.set(...L.sideTint);
    // ---- sky + fog ----
    const su = this.skyMat.uniforms, K = LOOK.day;
    K.sky.c.forEach((h, i) => untone(h, su["c" + i].value));
    const e = K.sky.e.map((deg) => THREE.MathUtils.degToRad(deg));
    su.e.value.set(e[1], e[2], e[3], e[4]);
    this.sky.position.copy(cam.position);
    untone(L.fog, this.fog.color); this.fog.near = L.fogNear; this.fog.far = L.fogFar;
    scene.fog = this.fog; scene.background = null;
    for (const cl of this.clouds) { cl.m.position.copy(cam.position).add(cl.off); cl.m.lookAt(cam.position.x, cl.m.position.y, cam.position.z); }
    // ---- props ----
    this.folder.visible = false;
    const inBed = id >= 3 && id <= 4;
    this.boxes.forEach((b, i) => { const k = id === 3 ? pop(f, BOX_TIMES[i]) : inBed || id === 2 || id === 18 ? 1 : 0; b.visible = k > 0; b.scale.setScalar(Math.max(0.001, k)); });
    const dining = id >= 8 && id <= 14;
    for (const [name, g] of Object.entries(this.food)) {
      if (name === "fancy") { g.visible = !!s.fancy; continue; }
      const t0 = FOOD_TIMES[name as keyof typeof FOOD_TIMES], k = !dining || s.fancy ? 0 : id === 8 ? pop(f, t0) : 1;
      g.visible = k > 0; g.scale.setScalar(Math.max(0.001, k));
    }
    this.receipt.visible = (id === 9 && f >= 1016) || id === 14 || id === 10;
    if (id === 9 && f < 1024) { const u = smooth((f - 1016) / 8); this.receipt.position.set(RECEIPT_AT[0] + 0.5 * (1 - u), RECEIPT_AT[1], RECEIPT_AT[2] + 0.2 * (1 - u)); }
    else this.receipt.position.set(...RECEIPT_AT);
    this.receipt.material = this.receiptMats[id === 9 ? receiptStage(f) : 3];
    for (const fl of this.flags) {
      const p = fl.geometry.attributes.position as THREE.BufferAttribute, { w, h } = fl.userData as { w: number; h: number };
      for (let i = 0; i < p.count; i++) {
        const u = (i % 15) / 14, y = i < 15 ? h / 2 : -h / 2;
        p.setXYZ(i, u * w, y + 0.05 * w * u * Math.sin(t * 4 - u * 3), 0.12 * w * u * Math.sin(t * 5.5 - u * 5));
      }
      p.needsUpdate = true;
    }
    // ---- cast ----
    const right = V(0, 0, 0).setFromMatrixColumn(cam.matrixWorld, 0);
    const sx = sunDir.dot(right), light = Math.round(Math.atan2(-sunDir.y, sx) / (Math.PI / 4)) * (Math.PI / 4);
    const places: { key: string; draw: (p: Pen) => void; x: number; y: number; z: number; size: [number, number, number] }[] = [];
    const fx: { key: string; cw: number; ch: number; draw: (p: Pen) => void; x: number; y: number; z: number; w: number; h: number; flat?: boolean; rot?: number }[] = [];
    const person = (key: string, o: Outfit, x: number, y: number, z: number, opts: FrontOpts) => {
      const d = cam.position.distanceTo(this.v.set(x, y + 1.2, z)), size = tier(d);
      const o2: FrontOpts = { ...opts, light };
      places.push({ key: `${key}|${JSON.stringify(o2, (_k, v) => (typeof v === "number" ? q(v) : v))}`, draw: (p) => bodyFront(p, o, o2), x, y, z, size });
    };
    const contact = (x: number, y: number, z: number, sc2 = 1) =>
      fx.push({ key: "blob|contact|#5a5f86", cw: 128, ch: 128, draw: (p) => fxContact(p as unknown as Pen, "#5a5f86"), x, y: y + 0.02, z, w: 0.52 * sc2, h: 0.4 * sc2, flat: true });
    const OUT: Record<Who, Outfit> = { youPJ: YOU_PJ, youSuit: YOU_SUIT, aide: AIDE, agent: AGENT };
    for (const c2 of castAt(id, f)) {
      const seed = c2.seed;
      person(c2.who, OUT[c2.who], ...c2.pos, {
        mode: c2.mode, expr: c2.expr, look: c2.look ?? 0, facing: c2.facing ?? 0, phase: q(c2.phase ?? 0, 60), blink: blink(f, seed * 7 + c2.who.length), seed: c2.who.startsWith("you") ? YOU_SEED : seed,
        prop: (c2.prop as FrontOpts["prop"]) ?? null, wave: c2.wave === undefined ? undefined : q(c2.wave, 30),
      });
      if (c2.mode !== "sit") contact(c2.pos[0], c2.pos[1], c2.pos[2]);
    }
    // effects on cue
    const card = (key: string, draw: (p: Pen) => void, x: number, y: number, z: number, w: number, h: number, cw = 256, ch = 256, rot = 0) => fx.push({ key, cw, ch, draw, x, y, z, w, h, rot });
    if (id === 11 && f >= 1287) { const k = pop(f, 1287); card("bell", bellTex, WH[0] + 4.5, 2.6, 9.5, 1.6 * k, 1.6 * k); }
    if (id === 13) { const u = (f - 1415) / 34; card("plane", planeTex, WH[0] + 60 - 120 * u, 34 + 4 * u, -40, 22, 11, 512, 256, -0.05); }
    if (id === 14) for (const [k0, kind, dxi] of [[1454, 0, -0.5], [1476, 1, 0], [1499, 2, 0.5]] as const) {
      const k = pop(f, k0); if (k > 0) card(`icon${kind}`, (p) => icon(p, kind), DIN[0] + dxi, 1.88, DIN[2] - 0.8, 0.42 * k, 0.42 * k);
    }
    if (id === 15 && f >= 1655 && f < 1665) { const u = (f - 1655) / 10; fx.push({ key: `burst${q(u, 30)}`, cw: 500, ch: 500, draw: (p) => fxBurst(p as unknown as Pen, q(u, 30)), x: OFF[0] + 0.62, y: 1.22, z: -1.48, w: 0.6, h: 0.6 }); }
    if (id === 16 && f >= 1719) for (let i = 0; i < 3; i++) { const k = pop(f, 1719 + i * 7); const bob = 0.04 * Math.sin(f * 0.3 + i); card("qmark", qmarkTex, OFF[0] + 1.0 + i * 0.26, 1.86 + bob + (i % 2) * 0.1, -1.35, 0.24 * k, 0.24 * k, 256, 256, (i - 1) * 0.25); }
    let ai = 0;
    for (const p of places) {
      const a = this.actor(ai++);
      const [w, h, k] = p.size;
      a.r = this.pool.req(p.key, w, h, k, p.draw as unknown as (pp: never) => void);
      a.mesh.visible = true; a.mesh.position.set(p.x, p.y, p.z);
      a.mesh.rotation.set(0, Math.atan2(cam.position.x - p.x, cam.position.z - p.z), 0);
      a.mesh.scale.set(1, 1, 1); a.mesh.castShadow = false;
    }
    for (let i = ai; i < this.actors.length; i++) this.actors[i].mesh.visible = false;
    let fi = 0;
    const used: Fx[] = [];
    for (const p of fx) {
      const e2 = this.fx(fi++);
      e2.r = this.pool.req(p.key, p.cw, p.ch, 1, p.draw as unknown as (pp: never) => void);
      e2.use(p.key === "spray");
      e2.mesh.visible = true; e2.mesh.position.set(p.x, p.y, p.z);
      if (p.flat) e2.mesh.rotation.set(-Math.PI / 2, 0, p.rot ?? 0);
      else { e2.mesh.quaternion.copy(cam.quaternion); e2.mesh.rotateZ(p.rot ?? 0); }
      e2.mesh.scale.set(p.w, p.h, 1);
      used.push(e2);
    }
    for (let i = fi; i < this.fxs.length; i++) this.fxs[i].mesh.visible = false;
    this.pool.flush();
    for (let i = 0; i < ai; i++) this.actors[i].bind();
    for (const e2 of used) e2.bind();
    return focus;
  }
}
const spray = (p: Pen) => {
  const g = p.g, gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, "rgba(255,255,255,0.9)"); gr.addColorStop(0.6, "rgba(230,245,255,0.5)"); gr.addColorStop(1, "rgba(230,245,255,0)");
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
};
export { ctex };
