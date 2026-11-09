// Extra textures and effect cards for "can't open a window": cardboard, parquet, the receipt, icons, plane, bell, "?".
import { ctex } from "../bridge/paint";
import type { Pen } from "./toonx";

const INK = "#241726";
const ol = (g: CanvasRenderingContext2D, w = 8) => { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = "round"; g.lineCap = "round"; g.stroke(); };
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
};

export const cardboard = () => ctex("w_cardboard", 256, 256, (g, r) => {
  g.fillStyle = "#c79a5e"; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(120,80,40,${0.05 + r() * 0.08})`; g.fillRect(0, r() * 256, 256, 1 + r() * 2); }
  g.fillStyle = "#e3c27f"; g.fillRect(112, 0, 32, 256);                     // tape
  g.strokeStyle = "rgba(60,40,20,0.5)"; g.lineWidth = 3; g.strokeRect(4, 4, 248, 248);
});
export const parquet = () => ctex("w_parquet", 1024, 1024, (g, r) => {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 8; x++) {
    const c = ["#9a6338", "#8a5530", "#a56c3d", "#93603a"][Math.floor(r() * 4)];
    g.fillStyle = c; g.fillRect(x * 128 + (y % 2) * 64, y * 64, 128, 64);
    g.strokeStyle = "rgba(50,25,10,0.5)"; g.lineWidth = 2; g.strokeRect(x * 128 + (y % 2) * 64, y * 64, 128, 64);
  }
});

/** the monthly bill: header, then line items appear one by one (k = 0..3): meal, snack, toothpaste */
export const receiptTex = (k: number) => ctex(`w_receipt${k}`, 416, 672, (g) => {
  g.fillStyle = "#fbf8ef"; g.fillRect(0, 0, 416, 672);
  for (let x = 0; x < 416; x += 26) { g.fillStyle = "#d9d3c4"; g.beginPath(); g.moveTo(x, 672); g.lineTo(x + 13, 656); g.lineTo(x + 26, 672); g.fill(); }
  g.fillStyle = "#3a3540"; g.font = "bold 46px Inter, 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("BILL", 208, 82);
  g.fillStyle = "#8a8490"; g.font = "28px Inter, 'DejaVu Sans', sans-serif"; g.fillText("Residence  ·  this month", 208, 126);
  g.strokeStyle = "#c9c2b4"; g.setLineDash([10, 8]); g.lineWidth = 3; g.beginPath(); g.moveTo(30, 156); g.lineTo(386, 156); g.stroke(); g.setLineDash([]);
  const items = ["Every meal", "Every snack", "Toothpaste"];
  g.textAlign = "left"; g.font = "bold 36px Inter, 'DejaVu Sans', sans-serif";
  for (let i = 0; i < k; i++) {
    const y = 226 + i * 92;
    g.fillStyle = "#2c2832"; g.fillText(items[i], 40, y);
    g.fillStyle = "#b8242c"; g.textAlign = "right"; g.fillText("$", 376, y); g.textAlign = "left";
    g.strokeStyle = "#e4ded2"; g.lineWidth = 2; g.beginPath(); g.moveTo(40, y + 26); g.lineTo(376, y + 26); g.stroke();
  }
  if (k >= 3) { g.fillStyle = "#b8242c"; g.font = "bold 44px Inter, 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.fillText("PAY THIS", 208, 560); g.strokeStyle = "#b8242c"; g.lineWidth = 5; g.strokeRect(96, 512, 224, 66); }
});

/** round badge icons: 0 pancakes, 1 shirt on a hanger, 2 toothpaste */
export const icon = (p: Pen, kind: number) => {
  const g = p.g;
  g.beginPath(); g.arc(128, 128, 112, 0, Math.PI * 2); g.fillStyle = "#fff6dc"; g.fill(); ol(g, 9);
  if (kind === 0) {
    for (let i = 0; i < 4; i++) { g.beginPath(); g.ellipse(128, 170 - i * 22, 66, 18, 0, 0, Math.PI * 2); g.fillStyle = "#d99a4e"; g.fill(); ol(g, 6); }
    g.beginPath(); g.ellipse(128, 100, 50, 13, 0, 0, Math.PI * 2); g.fillStyle = "#8a4a18"; g.fill();
    g.fillStyle = "#ffd55a"; g.fillRect(116, 84, 24, 14); g.strokeRect(116, 84, 24, 14);
  } else if (kind === 1) {
    g.beginPath(); g.moveTo(128, 60); g.quadraticCurveTo(150, 60, 140, 80); g.lineTo(128, 92); ol(g, 6);
    g.beginPath(); g.moveTo(60, 120); g.lineTo(128, 92); g.lineTo(196, 120); ol(g, 7);
    g.beginPath(); g.moveTo(80, 110); g.lineTo(176, 110); g.lineTo(196, 140); g.lineTo(172, 150); g.lineTo(172, 200); g.lineTo(84, 200); g.lineTo(84, 150); g.lineTo(60, 140); g.closePath();
    g.fillStyle = "#7fb2e5"; g.fill(); ol(g, 7);
  } else {
    g.save(); g.translate(128, 140); g.rotate(-0.5);
    rr(g, -80, -26, 130, 52, 10); g.fillStyle = "#f4f1ea"; g.fill(); ol(g, 7);
    g.fillStyle = "#3f86d6"; g.fillRect(-60, -26, 40, 52);
    rr(g, 50, -14, 26, 28, 6); g.fillStyle = "#e0e3ea"; g.fill(); ol(g, 6);
    g.beginPath(); g.moveTo(76, 0); g.quadraticCurveTo(100, -30, 92, -50); g.lineWidth = 16; g.strokeStyle = "#ffffff"; g.stroke(); g.lineWidth = 6; g.strokeStyle = "#5fc1e8"; g.stroke();
    g.restore();
  }
};
/** a generic jet (no markings) seen from the side, flying left */
export const planeTex = (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.moveTo(40, 130); g.quadraticCurveTo(60, 104, 120, 104); g.lineTo(430, 104); g.quadraticCurveTo(470, 104, 480, 80); g.lineTo(500, 80); g.lineTo(488, 140); g.lineTo(120, 150); g.quadraticCurveTo(52, 150, 40, 130); g.closePath();
  g.fillStyle = "#f4f6fa"; g.fill(); ol(g, 6);
  g.fillStyle = "#4d77b8"; g.fillRect(120, 128, 360, 9);
  g.beginPath(); g.moveTo(220, 128); g.lineTo(300, 128); g.lineTo(250, 200); g.lineTo(215, 200); g.closePath(); g.fillStyle = "#dfe4ee"; g.fill(); ol(g, 5);
  g.beginPath(); g.moveTo(440, 104); g.lineTo(480, 104); g.lineTo(500, 50); g.lineTo(476, 50); g.closePath(); g.fillStyle = "#4d77b8"; g.fill(); ol(g, 5);
  for (let i = 0; i < 9; i++) { g.beginPath(); g.arc(140 + i * 30, 116, 5, 0, Math.PI * 2); g.fillStyle = "#3b4a63"; g.fill(); }
  g.beginPath(); g.moveTo(56, 118); g.quadraticCurveTo(68, 108, 88, 108); g.lineTo(88, 120); g.closePath(); g.fillStyle = "#3b4a63"; g.fill();
};
/** a hotel front-desk bell */
export const bellTex = (p: Pen) => {
  const g = p.g;
  g.beginPath(); g.ellipse(128, 200, 100, 22, 0, 0, Math.PI * 2); g.fillStyle = "#3a3540"; g.fill(); ol(g, 6);
  g.beginPath(); g.moveTo(40, 192); g.quadraticCurveTo(40, 84, 128, 84); g.quadraticCurveTo(216, 84, 216, 192); g.closePath(); g.fillStyle = "#f2c94c"; g.fill(); ol(g, 8);
  g.beginPath(); g.ellipse(100, 130, 18, 30, -0.5, 0, Math.PI * 2); g.fillStyle = "rgba(255,255,255,0.6)"; g.fill();
  g.fillStyle = "#c9a03a"; g.fillRect(120, 60, 16, 26); g.beginPath(); g.arc(128, 58, 14, 0, Math.PI * 2); g.fill(); ol(g, 6);
  for (const [x, y, a] of [[40, 50, -0.6], [216, 50, 0.6]]) { g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-14, 0); g.lineTo(14, 0); ol(g, 7); g.restore(); }
};
export const qmarkTex = (p: Pen) => {
  const g = p.g;
  g.font = "bold 220px Inter, 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
  g.lineWidth = 18; g.strokeStyle = INK; g.strokeText("?", 128, 132); g.fillStyle = "#ffd447"; g.fillText("?", 128, 132);
};
/** window glass: faint blue tint with two white reflection streaks, so it reads as closed */
export const glassTex = () => ctex("w_glass", 256, 340, (g) => {
  g.fillStyle = "rgba(170,205,235,0.28)"; g.fillRect(0, 0, 256, 340);
  g.fillStyle = "rgba(255,255,255,0.75)";
  for (const [x, w] of [[40, 34], [110, 14], [150, 30]]) { g.beginPath(); g.moveTo(x, 340); g.lineTo(x + w, 340); g.lineTo(x + w + 120, 0); g.lineTo(x + 120, 0); g.closePath(); g.fill(); }
});
