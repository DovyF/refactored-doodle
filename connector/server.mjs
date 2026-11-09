// "Video maker" custom connector for Claude. Lets a normal Claude chat (phone or web) read the channel guide,
// start a video from a plan, and get watch/download links when it is done. Hosted on Railway.
// Env: GITHUB_TOKEN (fine-grained, this repo only, Actions read+write), SECRET (long random string),
// REPO (default DovyF/refactored-doodle). Railway sets PORT and RAILWAY_PUBLIC_DOMAIN.
import express from "express";
import AdmZip from "adm-zip";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

const { GITHUB_TOKEN, SECRET, REPO = "DovyF/refactored-doodle", PORT = 3000 } = process.env;
const BASE = process.env.PUBLIC_URL || (process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${PORT}`);
if (!SECRET || SECRET.length < 16) { console.error("Set SECRET to a long random string"); process.exit(1); }
const text = (t) => ({ content: [{ type: "text", text: t }] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const gh = async (path, opts = {}) => {
  const r = await fetch(`https://api.github.com/repos/${REPO}${path}`, { ...opts, headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", ...(opts.headers || {}) } });
  if (!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0, 300)}`);
  return r;
};
const raw = async (file) => { const r = await fetch(`https://raw.githubusercontent.com/${REPO}/main/${file}`); if (!r.ok) throw new Error(`${file}: ${r.status}`); return r.text(); };

function buildServer() {
  const s = new McpServer({ name: "video-maker", version: "1.0.0" });
  s.tool("read_guide", "Read the channel handoff notes and the plan-writing guide (script rules, sets, poses, faces, props, effects, sounds). Always call this before writing a plan.", {},
    async () => text(`${await raw("HANDOFF.md")}\n\n---\n\n${await raw("PLAN_FORMAT.md")}`));
  s.tool("read_example_plan", "Read a finished example plan (the 'stay awake 11 days' video) to copy its structure.", {},
    async () => text(await raw("videos/awake/plan.json")));
  s.tool("make_video", "Start making a video. Pass the complete plan as a JSON string (same format as the example). Returns a run id; the video takes about 25 minutes.",
    { plan_json: z.string().describe("The full plan.json content") },
    async ({ plan_json }) => {
      let plan;
      try { plan = JSON.parse(plan_json); } catch (e) { return text(`The plan is not valid JSON: ${e.message}. Fix it and call make_video again.`); }
      if (!Array.isArray(plan.lines) || !plan.lines.length || !plan.lines.every((l) => l.text && l.set)) return text("Every plan needs lines, and every line needs text and set. Fix it and call make_video again.");
      const since = new Date(Date.now() - 5000).toISOString();
      await gh("/actions/workflows/make.yml/dispatches", { method: "POST", body: JSON.stringify({ ref: "main", inputs: { plan_json: JSON.stringify(plan) } }) });
      for (let i = 0; i < 8; i++) {
        await sleep(3000);
        const runs = await (await gh(`/actions/workflows/make.yml/runs?per_page=3&event=workflow_dispatch&created=>=${since}`)).json();
        if (runs.workflow_runs?.length) { const run = runs.workflow_runs[0];
          return text(`Started "${plan.title || plan.id}" (run ${run.id}). It takes about 25 minutes. Check later with video_status run_id ${run.id}.`); }
      }
      return text("Started, but the run id is not visible yet. Call video_status with run_id 'latest' in a minute.");
    });
  s.tool("video_status", "Check a video run. When it is finished, returns links to watch/download the video and its contact sheet. Use 'latest' for the newest run.",
    { run_id: z.string() },
    async ({ run_id }) => {
      const run = run_id === "latest" ? (await (await gh("/actions/workflows/make.yml/runs?per_page=1")).json()).workflow_runs[0] : await (await gh(`/actions/runs/${run_id}`)).json();
      if (!run) return text("No runs yet.");
      if (run.status !== "completed") { const mins = Math.round((Date.now() - Date.parse(run.run_started_at)) / 60000); return text(`Run ${run.id} is still ${run.status} (${mins} min so far, usually ~25).`); }
      if (run.conclusion !== "success") return text(`Run ${run.id} ended: ${run.conclusion}. Details: ${run.html_url}`);
      return text(`Run ${run.id} is done.\nWatch/download the video: ${BASE}/video/${run.id}/${SECRET}\nContact sheet: ${BASE}/sheet/${run.id}/${SECRET}`);
    });
  return s;
}

const app = express();
app.use(express.json({ limit: "4mb" }));
app.get("/", (_q, r) => r.send("video-maker connector is running"));
app.post(`/mcp/${SECRET}`, async (req, res) => {
  const server = buildServer(), transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on("close", () => { transport.close(); server.close(); });
  try { await server.connect(transport); await transport.handleRequest(req, res, req.body); }
  catch (e) { console.error(e); if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal error" }, id: null }); }
});
app.all(`/mcp/${SECRET}`, (_q, r) => r.status(405).set("Allow", "POST").end());

// video / contact-sheet links: unzip the run's artifact and stream the file (no GitHub login needed on the phone)
const cache = new Map();
app.get("/:kind/:run/:secret", async (req, res) => {
  const { kind, run, secret } = req.params;
  if (secret !== SECRET || !["video", "sheet"].includes(kind) || !/^\d+$/.test(run)) return res.status(404).end();
  try {
    const key = `${kind}:${run}`;
    if (!cache.has(key)) {
      const arts = await (await gh(`/actions/runs/${run}/artifacts`)).json();
      const art = arts.artifacts.find((a) => a.name === kind);
      if (!art) return res.status(404).send("Not ready yet.");
      const zip = new AdmZip(Buffer.from(await (await gh(`/actions/artifacts/${art.id}/zip`)).arrayBuffer()));
      const entry = zip.getEntries()[0];
      if (cache.size > 6) cache.delete(cache.keys().next().value);
      cache.set(key, { name: entry.entryName, data: entry.getData() });
    }
    const f = cache.get(key);
    res.set("Content-Type", kind === "video" ? "video/mp4" : "image/jpeg").set("Content-Disposition", `inline; filename="${run}-${f.name}"`).send(f.data);
  } catch (e) { console.error(e); res.status(502).send("Could not fetch the file from GitHub."); }
});

app.listen(PORT, () => console.log(`video-maker on ${BASE}  (MCP endpoint: /mcp/<SECRET>)`));
