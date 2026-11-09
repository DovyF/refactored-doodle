# Handoff: read this first

You are the "brain" for an animated YouTube Shorts channel: "What if you…" videos starring **Toy** (chunky cartoon character, big eyes, yellow beanie).
Everything you need is in this repo. Claude only writes words (plans, fixes); free GitHub machines make the videos.

## From a normal Claude chat (no Claude Code needed)
Write the plan, then output it as **one line of minified JSON** in a single code block. The owner copies it, opens
github.com/DovyF/refactored-doodle/actions/workflows/make.yml on his phone → **Run workflow** → pastes it into
"Paste the whole plan here" → Run. ~25 min later the run page has **video** and **sheet** downloads.

## How a video is made
1. Write `videos/<id>/plan.json` following **PLAN_FORMAT.md** (script rules + every set, pose, face, prop, effect, sound).
2. Commit + push, then run it: Actions → **make** → Run workflow → plan path (or `gh api -X POST repos/DovyF/refactored-doodle/actions/workflows/make.yml/dispatches -f ref=main -f 'inputs[plan]=videos/<id>/plan.json'`).
3. ~25 min later the run has two downloads: **video** (MP4) and **sheet** (contact sheet). Check the sheet, fix only specific beats.
Example plan: `videos/awake/plan.json` ("What if you stayed awake for 11 days?").

## Rules to keep usage low
- New chat per job; never continue a long chat. This file + PLAN_FORMAT.md are the memory.
- No style mockups, no test images except one contact sheet per check, render only on GitHub.
- Use existing sets; a new set only when a topic proves popular.
- After each job, add a line to the log below: date, job, tokens used (if known).

## Code map
- `src/lib/toy.ts` character drawing · `sets.ts` sets/marks · `world.ts` 3D world + props · `plan.ts` plan → timeline · `PlanShort.tsx` render + on-screen text · `cards.ts` floating effects.
- `scripts/make_voice.py` (Kokoro voice + Whisper timings) · `scripts/make_sound.py` (music + SFX) · `.github/workflows/make.yml`.
- Old: `src/videos/window`, `src/videos/bridge` (look engine from the MIT cartoon-3d-short skill).

## Improvement queue (one per chat, in order)
Done: overlays kept off faces, real night look, 10 render chunks, stronger awake script, better sound/voice (own-voice option), more shots and faces.
1. Re-render the awake plan and review the sheet; fix only specific beats.
2. Visuals: more camera/character polish where the sheet shows weak spots.
3. New general sets: street, school, kitchen, outdoors.
4. Weekly loop: write 7 plans at once on Monday, run make, post one a day, review numbers Sunday.

## Log
- 2026-11-09 · built plan pipeline + "awake" video (54 s, 26.5 min on GitHub) · ~8.8M effective tokens (Opus, one long chat).
