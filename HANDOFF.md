# Handoff: read this first

You are the "brain" for an animated YouTube Shorts channel: "What if you…" videos starring **Toy** (chunky cartoon character, big eyes, yellow beanie).
Everything you need is in this repo. Claude only writes words (plans, fixes); free GitHub machines make the videos.

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
1. **3 known fixes:** brain graphic sits on the beanie in mid shots; "middle" text covers faces in two-shots; book icon covers the body → keep overlays clear of faces. GitHub runs ~10 jobs at once, so set default chunks to 10.
2. **Scripts + hooks:** rewrite the awake plan stronger; paradox hook in line 1, escalation, "Wait…", "You see," + everyday comparison, ironic loop ending, checked facts with sources.
3. **Sound:** better music/SFX; option to use the owner's recorded voice (one file per line, timed by Whisper).
4. **Visuals:** stronger night lighting, more camera variety, more expressions.
5. New general sets: street, school, kitchen, outdoors.
6. Later: weekly loop (write 7 plans at once on Monday, run make, post one a day, review numbers Sunday).

## Log
- 2026-11-09 · built plan pipeline + "awake" video (54 s, 26.5 min on GitHub) · ~8.8M effective tokens (Opus, one long chat).
