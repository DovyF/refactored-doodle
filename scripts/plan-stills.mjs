// Test stills for a plan: node scripts/plan-stills.mjs <plan.json> <words.json> <outPrefix> <f1,f2,...> [scale]
import fs from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
const [planP, wordsP, prefix, frames, scale = "0.5"] = process.argv.slice(2);
const inputProps = { plan: JSON.parse(fs.readFileSync(planP, "utf8")), words: JSON.parse(fs.readFileSync(wordsP, "utf8")) };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const chromiumOptions = { gl: process.env.GL || "swangle" };
const composition = await selectComposition({ serveUrl, id: "PlanShort", inputProps, chromiumOptions });
const onBrowserLog = (l) => { if (l.type === "error") console.log("[error]", l.text.slice(0, 300)); };
for (const f of frames.split(",").map(Number)) {
  const t0 = Date.now();
  await renderStill({ composition, serveUrl, frame: f, inputProps, output: `${prefix}${f}.jpg`, imageFormat: "jpeg", jpegQuality: 85, scale: Number(scale), chromiumOptions, timeoutInMilliseconds: 180000, onBrowserLog });
  console.log("still", f, ((Date.now() - t0) / 1000).toFixed(1) + "s");
}
