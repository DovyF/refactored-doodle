// Bundle the Remotion project once (the render jobs reuse it instead of each re-bundling).
import path from "node:path";
import { bundle } from "@remotion/bundler";
const out = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public"), outDir: path.resolve(process.argv[2] || "out/bundle") });
console.log("bundle:", out);
