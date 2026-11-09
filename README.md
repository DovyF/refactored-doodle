# refactored-doodle

Free parallel renderer for animated "What if you…" Shorts: flat cartoon characters in a 3D toon world
(three.js inside Remotion), voice from Kokoro, word timings from Whisper, synthesized music and sound effects.

## Render a video
Actions → **render** → Run workflow. It splits the frames across 10 runners, then stitches them with the
sound mix. Download the finished MP4 from the run's **video** artifact.

## Layout
- `src/videos/bridge/` — the look engine (ink, lens blur, grade, card shading, character drawing) from the
  MIT-licensed cartoon-3d-short skill (see `LICENSE-cartoon-3d-short`).
- `src/videos/window/` — "You can end the world… but you can't open a window": `story.ts` is the shot plan
  (shots, cameras, who is on screen, faces, props, all timed to the voice); `world.ts` holds the sets.
- `voice/` — narration script, voice and word timings. `audio/` — the music + SFX mix.
- `scripts/render-chunk.mjs` — renders one slice of frames; `.github/workflows/render.yml` runs the slices in parallel.
