// Renders one slice of a composition to JPEG frames named by their absolute frame number.
// usage: node scripts/render-chunk.mjs <compId> <chunkIndex> <chunkCount> <outDir> [scale] [bundleDir] [propsJson]
// Every GitHub runner gets the same command with a different chunkIndex, so frames split evenly across machines.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderFrames, selectComposition } from "@remotion/renderer";

const [comp, idxS, nS, outDir, scaleS = "1", bundleDir, propsFile] = process.argv.slice(2);
const idx = Number(idxS), n = Number(nS), scale = Number(scaleS);
const t0 = Date.now();
const serveUrl = bundleDir ? path.resolve(bundleDir) : await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const inputProps = propsFile ? JSON.parse(fs.readFileSync(propsFile, "utf8")) : {};
const chromiumOptions = { gl: "swangle" };
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions, inputProps });
const total = composition.durationInFrames, per = Math.ceil(total / n);
const a = idx * per, b = Math.min(total - 1, a + per - 1);
if (a > b) { console.log("nothing to render for chunk", idx); process.exit(0); }
const tmp = path.resolve(`${outDir}-tmp`);
fs.mkdirSync(tmp, { recursive: true }); fs.mkdirSync(outDir, { recursive: true });
console.log(`chunk ${idx}/${n}: frames ${a}-${b} of ${total}, ${os.cpus().length} cores, bundle ${((Date.now() - t0) / 1000).toFixed(0)} s`);
await renderFrames({
  composition, serveUrl, outputDir: tmp, inputProps, imageFormat: "jpeg", jpegQuality: 93, frameRange: [a, b], scale,
  concurrency: os.cpus().length, chromiumOptions, timeoutInMilliseconds: 300000,
  onStart: () => {}, onFrameUpdate: (done) => { if (done % 10 === 0) console.log(`  ${done}/${b - a + 1} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s`); },
});
// rename to absolute frame numbers (Remotion names frames inside the range, padding varies by range)
const files = fs.readdirSync(tmp).filter((f) => f.endsWith(".jpeg")).sort((x, y) => Number(x.match(/(\d+)\./)[1]) - Number(y.match(/(\d+)\./)[1]));
if (files.length !== b - a + 1) throw new Error(`expected ${b - a + 1} frames, got ${files.length}`);
const first = Number(files[0].match(/(\d+)\./)[1]);
for (const f of files) {
  const k = Number(f.match(/(\d+)\./)[1]) - first + a;
  fs.renameSync(path.join(tmp, f), path.join(outDir, `frame_${String(k).padStart(5, "0")}.jpg`));
}
console.log(`done: ${files.length} frames in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
