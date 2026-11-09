// Painted canvas textures for the president sample: bedroom, White House facade, office, flag, folder.
import { ctex, jit } from "../bridge/paint";

const INKL = "rgba(40,30,40,0.85)";
const rr = (g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, fill: string, line?: string, lw = 3) => {
  g.fillStyle = fill; g.fillRect(x, y, w, h);
  if (line) { g.strokeStyle = line; g.lineWidth = lw; g.strokeRect(x, y, w, h); }
};

/** pale gold striped wallpaper with small damask dots */
export const wallpaper = () => ctex("p_wall", 512, 512, (g, r) => {
  rr(g, 0, 0, 512, 512, "#ddd3ad");
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? "#d3c79c" : "#e2d9b6"; g.fillRect(i * 64, 0, 64, 512); }
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    g.fillStyle = jit(r, "#c4b483", 0.06); g.beginPath();
    g.ellipse(x * 64 + 32, y * 64 + (x % 2 ? 0 : 32), 7, 11, 0, 0, Math.PI * 2); g.fill();
  }
});
/** dark wood wainscot panels (1 image = 2 m wide x 1 m tall) */
export const wainscot = () => ctex("p_wains", 512, 256, (g, r) => {
  rr(g, 0, 0, 512, 256, "#6e3f27");
  for (let i = 0; i < 4; i++) {
    rr(g, i * 128 + 14, 30, 100, 196, jit(r, "#7d4a2f", 0.05), INKL, 3);
    g.strokeStyle = "rgba(255,220,180,0.18)"; g.lineWidth = 3; g.strokeRect(i * 128 + 20, 36, 88, 184);
  }
  rr(g, 0, 0, 512, 16, "#5a321f"); rr(g, 0, 240, 512, 16, "#4c2a1a");
});
/** red carpet with a gold border (one image over the whole floor) */
export const carpet = () => ctex("p_carpet", 1024, 1024, (g, r) => {
  rr(g, 0, 0, 1024, 1024, "#8a2a30");
  for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(60,10,20,${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 3 + r() * 6, 3 + r() * 6); }
  g.strokeStyle = "#d8b45a"; g.lineWidth = 26; g.strokeRect(90, 90, 844, 844);
  g.strokeStyle = "#5c1a20"; g.lineWidth = 8; g.strokeRect(130, 130, 764, 764);
  for (let k = 0; k < 4; k++) { g.save(); g.translate(512, 512); g.rotate((k * Math.PI) / 2);
    g.fillStyle = "#d8b45a"; g.beginPath(); g.moveTo(0, -300); g.lineTo(26, -250); g.lineTo(0, -200); g.lineTo(-26, -250); g.closePath(); g.fill(); g.restore(); }
  g.fillStyle = "#c79a45"; g.beginPath(); g.ellipse(512, 512, 120, 120, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#8a2a30"; g.beginPath(); g.ellipse(512, 512, 92, 92, 0, 0, Math.PI * 2); g.fill();
});
/** cream ceiling with gold mouldings and a centre medallion */
export const ceiling = () => ctex("p_ceil", 1024, 1024, (g) => {
  rr(g, 0, 0, 1024, 1024, "#efe5cb");
  g.strokeStyle = "#cfa955"; g.lineWidth = 18; g.strokeRect(70, 70, 884, 884);
  g.strokeStyle = "#b88f3e"; g.lineWidth = 6; g.strokeRect(110, 110, 804, 804);
  g.lineWidth = 10; g.strokeStyle = "#d8b65f";
  for (let k = 0; k < 2; k++) { g.beginPath(); g.ellipse(512, 512, 170 - k * 50, 170 - k * 50, 0, 0, Math.PI * 2); g.stroke(); }
  for (let a = 0; a < 16; a++) { g.save(); g.translate(512, 512); g.rotate((a * Math.PI) / 8);
    g.fillStyle = "#d8b65f"; g.beginPath(); g.ellipse(0, -145, 9, 22, 0, 0, Math.PI * 2); g.fill(); g.restore(); }
});
export const blanket = () => ctex("p_blanket", 512, 512, (g) => {
  rr(g, 0, 0, 512, 512, "#2e4475");
  for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.05)"; g.fillRect(0, i * 32, 512, 32); }
  rr(g, 0, 36, 512, 22, "#d8b45a");
});
export const mahogany = () => ctex("p_mahog", 512, 512, (g, r) => {
  rr(g, 0, 0, 512, 512, "#5b2f1f");
  for (let i = 0; i < 70; i++) {
    g.strokeStyle = `rgba(${r() < 0.5 ? "35,15,10" : "120,70,45"},${0.15 + r() * 0.2})`; g.lineWidth = 1 + r() * 3;
    const y = r() * 512; g.beginPath(); g.moveTo(0, y);
    for (let x = 0; x <= 512; x += 64) g.lineTo(x, y + Math.sin(x * 0.02 + i) * 6);
    g.stroke();
  }
});
export const drape = () => ctex("p_drape", 256, 512, (g) => {
  const gr = g.createLinearGradient(0, 0, 256, 0);
  for (let i = 0; i <= 8; i++) gr.addColorStop(i / 8, i % 2 ? "#b8852f" : "#d9a845");
  g.fillStyle = gr; g.fillRect(0, 0, 256, 512);
  rr(g, 0, 0, 256, 40, "#a87728");
});
export const sheetTex = () => ctex("p_sheet", 256, 256, (g) => { rr(g, 0, 0, 256, 256, "#f6f2e8"); rr(g, 0, 0, 256, 18, "#e6dfcf"); });

// ---------------- White House north facade (40 m x 15 m, 51.2 px/m) ----------------
const PX = 51.2, FW = 40, FH = 15;
export const BAY = (k: number) => 20 + (k * 11) / 3; // bay centres in facade metres, k = -5..5 (k = -3 is the open window)
export const facade = () => ctex("p_facade", 2048, 768, (g, r) => {
  const X = (m: number) => m * PX, Y = (m: number) => (FH - m) * PX;
  rr(g, 0, 0, 2048, 768, "#f2eee4");
  // stone courses
  for (let y = 0.5; y < FH; y += 0.5) { g.strokeStyle = "rgba(150,140,125,0.22)"; g.lineWidth = 1.5; g.beginPath(); g.moveTo(0, Y(y)); g.lineTo(2048, Y(y)); g.stroke(); }
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(160,150,135,${0.03 + r() * 0.05})`; g.fillRect(r() * 2048, r() * 768, 6 + r() * 20, 2 + r() * 5); }
  // base and string course
  rr(g, 0, Y(1.2), 2048, X(1.2), "#e3ddd0"); g.fillStyle = "rgba(90,80,70,0.35)"; g.fillRect(0, Y(1.2), 2048, 3);
  rr(g, 0, Y(7.3), 2048, X(0.35), "#ebe6da"); g.fillStyle = "rgba(90,80,70,0.4)"; g.fillRect(0, Y(6.95), 2048, 3);
  const win = (cx: number, y0: number, h: number, ped: "tri" | "seg" | "flat") => {
    const w = 1.5, x0 = X(cx - w / 2);
    rr(g, x0 - 9, Y(y0 + h) - 9, X(w) + 18, X(h) + 18, "#fbf9f3", INKL, 2.5);       // surround
    const gr = g.createLinearGradient(0, Y(y0 + h), 0, Y(y0)); gr.addColorStop(0, "#5c7590"); gr.addColorStop(1, "#33465d");
    g.fillStyle = gr; g.fillRect(x0, Y(y0 + h), X(w), X(h));
    g.strokeStyle = "#f8f6ef"; g.lineWidth = 5;
    g.beginPath(); g.moveTo(x0 + X(w) / 2, Y(y0 + h)); g.lineTo(x0 + X(w) / 2, Y(y0));
    for (let k = 1; k < 4; k++) { g.moveTo(x0, Y(y0 + (h * k) / 4)); g.lineTo(x0 + X(w), Y(y0 + (h * k) / 4)); }
    g.stroke(); g.strokeStyle = INKL; g.lineWidth = 2; g.strokeRect(x0, Y(y0 + h), X(w), X(h));
    rr(g, x0 - 16, Y(y0) - 2, X(w) + 32, 12, "#ece7da", INKL, 2);                   // sill
    const top = Y(y0 + h) - 12;
    g.fillStyle = "#f8f5ec"; g.strokeStyle = INKL; g.lineWidth = 2.5;
    if (ped === "tri") { g.beginPath(); g.moveTo(x0 - 22, top); g.lineTo(x0 + X(w) / 2, top - 30); g.lineTo(x0 + X(w) + 22, top); g.closePath(); g.fill(); g.stroke(); }
    else if (ped === "seg") { g.beginPath(); g.moveTo(x0 - 22, top); g.quadraticCurveTo(x0 + X(w) / 2, top - 34, x0 + X(w) + 22, top); g.closePath(); g.fill(); g.stroke(); }
    else rr(g, x0 - 18, top - 10, X(w) + 36, 12, "#f8f5ec", INKL, 2);
  };
  for (let k = -5; k <= 5; k++) {
    const cx = BAY(k);
    if (k !== 0) win(cx, 2.6, 2.8, Math.abs(k) % 2 ? "tri" : "seg");
    if (k !== -3) win(cx, 9.2, 2.4, "flat");
  }
  // front door behind the portico (arched, with a fanlight)
  const dx = X(20), dw = X(1.9);
  rr(g, dx - dw / 2 - 10, Y(5.6), dw + 20, X(4.4), "#fbf9f3", INKL, 2.5);
  g.fillStyle = "#3a3640"; g.fillRect(dx - dw / 2, Y(4.4), dw, X(3.2));
  g.fillStyle = "#d9c27a"; g.beginPath(); g.ellipse(dx, Y(4.4), dw / 2, 34, 0, Math.PI, 0); g.fill(); g.stroke();
  g.strokeStyle = "rgba(255,255,255,0.15)"; g.lineWidth = 4; g.beginPath(); g.moveTo(dx, Y(4.4)); g.lineTo(dx, Y(1.2)); g.stroke();
});
/** roof balustrade strip: posts and balusters (one image = 4 m) */
export const balustrade = () => ctex("p_balus", 512, 128, (g) => {
  rr(g, 0, 0, 512, 128, "#f2eee4");
  rr(g, 0, 0, 512, 22, "#f7f4ec", INKL, 2); rr(g, 0, 106, 512, 22, "#e7e2d6", INKL, 2);
  for (let i = 0; i < 16; i++) {
    const x = i * 32 + 16;
    g.fillStyle = "#dcd6c8"; g.beginPath(); g.ellipse(x, 64, 9, 34, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = INKL; g.lineWidth = 1.5; g.stroke();
  }
  rr(g, 0, 22, 20, 84, "#f2eee4", INKL, 2);
});
/** US flag (13 stripes, canton with a dotted star field) */
export const usFlag = () => ctex("p_flag", 494, 260, (g) => {
  for (let i = 0; i < 13; i++) { g.fillStyle = i % 2 ? "#f5f2ea" : "#c8323b"; g.fillRect(0, (i * 260) / 13, 494, 260 / 13 + 1); }
  g.fillStyle = "#2c3e78"; g.fillRect(0, 0, 198, 140);
  g.fillStyle = "#f5f2ea";
  for (let row = 0; row < 9; row++) for (let c = 0; c < (row % 2 ? 5 : 6); c++) {
    const x = 16 + c * 33 + (row % 2 ? 16 : 0), y = 10 + row * 14.5;
    g.beginPath(); g.arc(x, y, 3.6, 0, Math.PI * 2); g.fill();
  }
});

// ---------------- office ----------------
export const officeWall = () => ctex("p_owall", 512, 512, (g, r) => {
  rr(g, 0, 0, 512, 512, "#efe6cf");
  for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(190,170,130,${0.04 + r() * 0.05})`; g.fillRect(r() * 512, r() * 512, 4 + r() * 8, 4 + r() * 8); }
  rr(g, 0, 440, 512, 72, "#e2d6b8", INKL, 2);
  g.strokeStyle = "rgba(170,140,90,0.5)"; g.lineWidth = 3; g.strokeRect(24, 40, 464, 370);
});
export const officeCarpet = () => ctex("p_ocarpet", 1024, 1024, (g, r) => {
  rr(g, 0, 0, 1024, 1024, "#2f4c80");
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(10,20,50,${0.05 + r() * 0.08})`; g.fillRect(r() * 1024, r() * 1024, 3 + r() * 6, 3 + r() * 6); }
  g.fillStyle = "#e3d3a6"; g.beginPath(); g.ellipse(512, 560, 420, 300, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = "#2f4c80"; g.beginPath(); g.ellipse(512, 560, 380, 262, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = "#d8b45a"; g.lineWidth = 6; g.beginPath(); g.ellipse(512, 560, 340, 226, 0, 0, Math.PI * 2); g.stroke();
  for (let a = 0; a < 24; a++) { const t = (a / 24) * Math.PI * 2; g.fillStyle = "#d8b45a"; g.beginPath(); g.arc(512 + Math.cos(t) * 400, 560 + Math.sin(t) * 281, 6, 0, Math.PI * 2); g.fill(); }
});
export const folderTex = (stamped: boolean) => ctex(stamped ? "p_folderS" : "p_folder", 512, 400, (g) => {
  rr(g, 0, 0, 512, 400, "#b5222b");
  g.strokeStyle = "#e8c55c"; g.lineWidth = 12; g.strokeRect(22, 22, 468, 356);
  g.fillStyle = "rgba(0,0,0,0.12)"; g.fillRect(0, 0, 512, 40);
  if (stamped) {
    g.save(); g.translate(256, 210); g.rotate(-0.16);
    g.strokeStyle = "#fff6e0"; g.lineWidth = 10; g.strokeRect(-210, -62, 420, 124);
    g.fillStyle = "#fff6e0"; g.font = "bold 84px Inter, 'DejaVu Sans', sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText("TOP SECRET", 0, 6); g.restore();
  }
});
export const leather = () => ctex("p_leather", 256, 256, (g) => {
  rr(g, 0, 0, 256, 256, "#3b2722");
  for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = "rgba(0,0,0,0.25)"; g.beginPath(); g.arc(32 + x * 64, 32 + y * 64, 5, 0, Math.PI * 2); g.fill(); }
});
