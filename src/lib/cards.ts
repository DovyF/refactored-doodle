// Little effect cards that float in the 3D world near a character: zzz, ?, !, idea bulb, stars, anger mark,
// hallucination critters, music notes, bursts. Each draws on a square canvas; u (0..1) animates it.
import { Pen, INK, fxStars, fxBurst, fxNote } from "../videos/bridge/toon";

const g2 = (p: Pen) => p.g;
const txt = (p: Pen, s: string, x: number, y: number, size: number, fill: string, rot = 0) => {
  const g = g2(p); g.save(); g.translate(x, y); g.rotate(rot); g.font = `900 ${size}px 'Arial Black', 'DejaVu Sans', sans-serif`; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineJoin = "round"; g.lineWidth = size * 0.16; g.strokeStyle = INK; g.strokeText(s, 0, 0); g.fillStyle = fill; g.fillText(s, 0, 0); g.restore();
};
export const CARD_DRAW: Record<string, (p: Pen, u: number) => void> = {
  zzz: (p, u) => { for (let i = 0; i < 3; i++) { const k = (u + i / 3) % 1; const a = Math.min(1, k * 4) * (k > 0.8 ? (1 - k) / 0.2 : 1); if (a < 0.05) continue;
    p.g.globalAlpha = a; txt(p, "Z", 80 + i * 55 + k * 30, 220 - k * 160, 60 + i * 18, "#bfe3ff", -0.2); } p.g.globalAlpha = 1; },
  qmark: (_p, _u) => txt(_p, "?", 128, 132, 200, "#ffd447"),
  exclaim: (p) => txt(p, "!", 128, 132, 210, "#ff5b3a"),
  bulb: (p, u) => { const g = g2(p); const r = 70 + 6 * Math.sin(u * 12); const gr = g.createRadialGradient(128, 110, 10, 128, 110, 125); gr.addColorStop(0, "rgba(255,240,150,0.9)"); gr.addColorStop(1, "rgba(255,240,150,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 256, 256); p.ell(128, 110, r * 0.75, r * 0.8, "#ffe36b", 7); p.poly([[104, 160], [152, 160], [148, 200], [108, 200]], "#b7bcc6", 6); },
  stars: (p, u) => fxStars(p, u),
  burst: (p, u) => fxBurst(p, u, "#fff3b0", 10, 30, 125),
  note: (p, u) => fxNote(p, Math.floor(u * 2) % 2),
  anger: (p) => { for (let i = 0; i < 4; i++) { const a = (i * Math.PI) / 2 + Math.PI / 4; p.arc(128 + Math.cos(a) * 46, 128 + Math.sin(a) * 46, 34, 34, (a * 180) / Math.PI + 120, (a * 180) / Math.PI + 240, 16, "#e8333a"); } },
  sweat: (p) => p.poly([[128, 40], [170, 150], [128, 200], [86, 150]], "#9fd8ff", 8),
  critter: (p, u) => { const g = g2(p); const w = Math.sin(u * 6.28) * 8; const pts: [number, number][] = [];
    for (let i = 0; i <= 40; i++) { const a = (i / 40) * 6.283; pts.push([128 + (80 + 10 * Math.sin(a * 3 + u * 6)) * Math.cos(a), 140 + (70 + 8 * Math.cos(a * 4 + u * 5)) * Math.sin(a)]); }
    p.poly(pts, "#b07bff", 7); p.ell(128 + w, 120, 34, 38, "#ffffff", 6); p.dot(128 + w * 1.4, 126, 14); g.globalAlpha = 1;
    for (const s of [-1, 1]) p.stroke([[128 + s * 40, 70], [128 + s * 55, 30 + w]], 7); },
  heart: (p) => { p.poly([[128, 210], [40, 120], [60, 60], [128, 90], [196, 60], [216, 120]], "#ff5577", 8); },
  check: (p) => txt(p, "✓", 128, 132, 190, "#5ed36a"),
  cross: (p) => txt(p, "✗", 128, 132, 190, "#ff5b3a"),
};
export const CARD_NAMES = Object.keys(CARD_DRAW);
