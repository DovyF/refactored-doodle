// One composition for every video: it takes plan.json + words.json as input props and draws the result.
// Same post chain as the skill (ink -> lens blur -> bloom -> tone map -> grade), plus on-screen text/icons as crisp DOM.
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { useThree } from "@react-three/fiber";
import { EffectComposer } from "@react-three/postprocessing";
import { BlendFunction, BloomEffect, ToneMappingEffect, ToneMappingMode } from "postprocessing";
import { World } from "./world";
import { InkPass, noInkFallback } from "../videos/bridge/ink";
import { LensBlur } from "../videos/bridge/lensblur";
import { GradeEffect, GRADES, GRADE_STRENGTH, gradeFor } from "../videos/bridge/grade";
import { Timeline, Plan, Word, Overlay, FPS, SLOT_Y } from "./plan";

export type PlanProps = { plan: Plan; words: Word[] };
export const planFrames = (words: Word[]) => Math.round((words[words.length - 1].e + 0.6) * FPS);

const makeBloom = () => {
  const b = new BloomEffect({ blendFunction: BlendFunction.ADD, intensity: 0.5, luminanceThreshold: 1.0, luminanceSmoothing: 0.2, mipmapBlur: true, levels: 6, radius: 0.6 });
  const mip = b.mipmapBlurPass, setSize = mip.setSize.bind(mip);
  mip.setSize = (w: number, h: number) => setSize(Math.round((1920 * w) / Math.max(h, 1)), 1920);
  return b;
};
const fwd = new THREE.Vector3(), fpt = new THREE.Vector3();

const Inner: React.FC<{ tl: Timeline; segIdx: number }> = ({ tl, segIdx }) => {
  const f = useCurrentFrame();
  const { camera, scene } = useThree();
  const world = useMemo(() => new World(), []);
  const fx = useMemo(() => ({
    ink: new InkPass(scene, camera as THREE.PerspectiveCamera), lens: new LensBlur({ maxCoC: 24, nearScale: 1.2 }), bloom: makeBloom(),
    tone: new ToneMappingEffect({ mode: ToneMappingMode.NEUTRAL }), grade: new GradeEffect(GRADES.day, GRADE_STRENGTH.day),
  }), [camera, scene]);
  useEffect(() => () => { const i = fx.ink as unknown as { dispose?: () => void }; if (typeof i.dispose === "function") i.dispose(); }, [fx]);
  const post = useMemo(() => (
    <EffectComposer multisampling={4}>
      <primitive object={fx.ink} dispose={null} />
      <primitive object={fx.lens.pre} dispose={null} />
      <primitive object={fx.lens.main} dispose={null} />
      <primitive object={fx.bloom} dispose={null} />
      <primitive object={fx.tone} dispose={null} />
      <primitive object={fx.grade} dispose={null} />
    </EffectComposer>
  ), [fx]);
  const cam = camera as THREE.PerspectiveCamera;
  const st = tl.stateAt(tl.segs[segIdx], f);
  world.update(st, cam, scene);
  noInkFallback(world.root);
  cam.getWorldDirection(fwd); fpt.set(...st.focus);
  fx.lens.focus = Math.max(0.3, fpt.sub(cam.position).dot(fwd)); fx.lens.cInf = st.dof;
  gradeFor(fx.grade, st.light === "golden" ? "golden" : st.light === "night" ? "night" : "day");
  return (<><primitive object={world.root} dispose={null} />{post}</>);
};

const View: React.FC<{ tl: Timeline; segIdx: number; alpha: number }> = ({ tl, segIdx, alpha }) => (
  <AbsoluteFill style={{ opacity: alpha }}>
    <ThreeCanvas width={1080} height={1920} shadows gl={{ antialias: false, stencil: false, powerPreference: "high-performance", toneMappingExposure: 1.0 }} camera={{ fov: 40, near: 0.2, far: 1500 }}>
      <Inner tl={tl} segIdx={segIdx} />
    </ThreeCanvas>
  </AbsoluteFill>
);

// ---------------- on-screen overlays ----------------
const INK = "#241726";
const pop = (n: number) => (n >= 7 ? 1 : 1 + 0.28 * Math.sin((n / 7) * Math.PI) * (1 - n / 7) + (n < 2 ? -0.35 + n * 0.17 : 0));
const ICONS: Record<string, React.ReactNode> = {
  book: (<g><rect x="30" y="40" width="140" height="120" rx="10" fill="#2f6fd6" stroke={INK} strokeWidth="9" /><rect x="44" y="52" width="112" height="96" rx="4" fill="#fbf6ea" stroke={INK} strokeWidth="5" /><path d="M100 52 V148" stroke={INK} strokeWidth="6" />{[70, 90, 110].map((y) => <path key={y} d={`M56 ${y} H90 M110 ${y} H144`} stroke="#9aa3b5" strokeWidth="5" />)}</g>),
  clock: (<g><circle cx="100" cy="100" r="74" fill="#fbf6ea" stroke={INK} strokeWidth="10" /><path d="M100 100 V52 M100 100 L136 120" stroke={INK} strokeWidth="10" strokeLinecap="round" /></g>),
  calendar: (<g><rect x="34" y="44" width="132" height="122" rx="12" fill="#fbf6ea" stroke={INK} strokeWidth="9" /><rect x="34" y="44" width="132" height="36" rx="12" fill="#e8333a" stroke={INK} strokeWidth="9" /><text x="100" y="146" textAnchor="middle" fontSize="64" fontWeight="700" fill={INK} fontFamily="Inter">11</text></g>),
  trophy: (<g><path d="M60 40 H140 V90 A40 40 0 0 1 60 90 Z" fill="#ffd447" stroke={INK} strokeWidth="9" /><rect x="88" y="128" width="24" height="26" fill="#ffd447" stroke={INK} strokeWidth="7" /><rect x="64" y="152" width="72" height="18" rx="4" fill="#8a5a3a" stroke={INK} strokeWidth="7" /></g>),
  bed: (<g><rect x="30" y="100" width="140" height="40" rx="8" fill="#7fb2df" stroke={INK} strokeWidth="9" /><rect x="34" y="80" width="46" height="26" rx="10" fill="#fbf6ea" stroke={INK} strokeWidth="7" /><path d="M30 140 V160 M170 140 V160" stroke={INK} strokeWidth="9" /></g>),
};
const Brain: React.FC<{ n: number; off: number }> = ({ n, off }) => (
  <svg width="560" height="420" viewBox="0 0 560 420">
    <path d="M280 60 C200 20 110 50 100 120 C40 140 40 230 90 260 C80 330 160 370 220 340 C250 380 310 380 340 340 C400 370 480 330 470 260 C520 230 520 140 460 120 C450 50 360 20 280 60 Z" fill="#f6a6b8" stroke={INK} strokeWidth="14" />
    <path d="M280 70 V350 M150 150 C190 170 210 200 200 240 M410 150 C370 170 350 200 360 240 M150 290 C190 280 220 300 230 330 M410 290 C370 280 340 300 330 330" fill="none" stroke="#c46a84" strokeWidth="10" strokeLinecap="round" />
    {Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2, x = 280 + Math.cos(a) * 150, y = 200 + Math.sin(a) * 105, lit = i >= off;
      return (<g key={i}>{lit ? <circle cx={x} cy={y} r="40" fill="rgba(255,236,120,0.45)" /> : null}<circle cx={x} cy={y} r="22" fill={lit ? "#ffe36b" : "#5a5560"} stroke={INK} strokeWidth="8" /></g>); })}
  </svg>
);
const OverlayView: React.FC<{ o: Overlay; f: number }> = ({ o, f }) => {
  const n = f - o.f0, s = pop(n), y = o.y ?? SLOT_Y[o.where] ?? 820, x = o.x ?? 0;
  const box: React.CSSProperties = { position: "absolute", left: x, right: -x, top: y, display: "flex", justifyContent: "center", transform: `scale(${s})`, transformOrigin: "50% 0%" };
  if (o.kind === "text") return (<div style={box}><div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 112, lineHeight: 1.0, color: "#ffffff", textAlign: "center", padding: "0 60px",
    WebkitTextStroke: `14px ${INK}`, paintOrder: "stroke fill", textShadow: "0 10px 0 rgba(36,23,38,0.35)", letterSpacing: 1 }}>{o.value}</div></div>);
  if (o.kind === "icon") return (<div style={box}><svg width="300" height="300" viewBox="0 0 200 200">{ICONS[o.value] ?? null}</svg></div>);
  if (o.kind === "stamp") { const k = Math.min(1, n / 5); return (<div style={{ ...box, transform: `scale(${2.2 - 1.2 * k}) rotate(-11deg)`, opacity: k }}>
    <div style={{ fontFamily: "Inter", fontWeight: 700, fontSize: 92, color: "#e8333a", border: "14px solid #e8333a", borderRadius: 18, padding: "10px 34px", background: "rgba(255,255,255,0.85)" }}>{o.value}</div></div>); }
  const total = o.f1 - o.f0, nOn = o.n ?? 6, off = Math.min(nOn, Math.floor((n / Math.max(1, total * 0.85)) * (nOn + 1)));
  return (<div style={{ ...box, transform: `scale(${0.72 * s})` }}><Brain n={nOn} off={off} /></div>);
};

const useFont = () => {
  const [h] = React.useState(() => delayRender("font"));
  useEffect(() => { const ff = new FontFace("Inter", `url(${staticFile("fonts/inter-latin-700-normal.woff2")})`, { weight: "700" });
    ff.load().then((x) => { (document.fonts as unknown as { add: (f: FontFace) => void }).add(x); continueRender(h); }).catch(() => continueRender(h)); }, [h]);
};

export const PlanShort: React.FC<PlanProps> = ({ plan, words }) => {
  const f = useCurrentFrame();
  useFont();
  const tl = useMemo(() => new Timeline(plan, words), [plan, words]);
  const flash = tl.flashAt(f);
  return (
    <AbsoluteFill style={{ background: "#cfe3f2" }}>
      {tl.layersAt(f).map((l, i) => <View key={i ? "over" : "base"} tl={tl} segIdx={l.seg.idx} alpha={l.alpha} />)}
      {tl.overlaysAt(f).map((o, i) => <OverlayView key={`${o.kind}${o.f0}${i}`} o={o} f={f} />)}
      {flash > 0 ? <AbsoluteFill style={{ background: "#ffffff", opacity: flash }} /> : null}
    </AbsoluteFill>
  );
};
