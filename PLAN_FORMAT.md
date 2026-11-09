# How to write a video (for the "brain")

A video is one file: `videos/<id>/plan.json`. Everything else (voice, word timing, animation, camera, music,
sound effects, render, stitch) is done for free by the **make** workflow (Actions → make → Run workflow → plan path).

## Script rules (what makes it good)
1. **Hook = a paradox in line 1**, no setup. ("Stay awake for eleven days, and your brain starts sleeping without telling you.")
2. **Second person**: "you" is the hero. Present tense, short spoken sentences, 3.5–4 words per second, 40–60 s total.
3. **Escalate** 3–5 beats, each bigger than the last; one visible gag per line.
4. **"Wait…"** beat (a question the viewer is already asking), then **"You see,"** + one everyday comparison.
5. **Ironic payoff** in the last line that loops back to the first.
6. **Only checked facts.** Spell numbers as words in `text` ("seventeen"), so the voice reads them right.

## plan.json
```json
{ "id": "awake", "voice": { "name": "am_michael", "speed": 1.2 },
  "cast": { "you": "you-pj", "friend": "friend" },
  "lines": [ { "text": "…", "set": "bedroom", "light": "night", "shot": "close:you", "music": "dream",
               "props": ["clock"], "clock": 2,
               "actors": { "you": { "at": "bed", "pose": "sit", "face": "sleepy" } },
               "beats": [ { "on": "sleeping", "actor": "you", "face": "asleep" }, { "on": "days", "text": "11 DAYS" } ] } ] }
```
- **cast**: key → look. Looks: `you`, `you-pj`, `you-suit`, `you-old`, `friend`, `friend2`, `scientist`, `agent`, `mom`, `dad`, `kid`, `reporter`.
- **set** / marks (`at`) / insert spots:
  - `bedroom`: bed, bed.left, bed.right, window, floor, left, right, door · spots: clock, window, lamp, chandelier, bed
  - `office`: desk, desk.side, desk.front, floor, left, right, pinball, pinball.side · spots: desk, pinball, window, flag
  - `dining`: table, table.left, table.right, table.front, floor, left, right · spots: table, plate, receipt, poster
  - `lawn` (White House): path, path.left, path.right, car, car.side, fountain · spots: house, window, car, sky
- **light**: `int` (default indoors), `day`, `golden`, `night`.
- **shot**: `wide`, `mid:<actor>`, `close:<actor>`, `two:<a>,<b>`, `insert:<spot>`. A beat with `shot` cuts to a new shot on that word.
- **actors**: `at` (mark), `pose`, `face`, `eye` (-1 left … 1 right), `hold` (thing), `lie` (true = lying in bed), `sweat`.
  Actors carry over to the next line if it is in the same set and has no `actors`.
- **pose**: stand, walk, sit, lie, wave, point, push, shrug, cheer, think, facepalm.
- **face**: neutral, smile, grin, laugh, shock, nervous, strain, stern, sleepy, dazed, sad, smug, asleep, wide, think.
- **things** (`hold`, `give`): phone, keys, card, folder, coffee, paper, pencil.
- **props** (on for the whole line, or pop in with a beat `prop`): boxes, car, pancakes, bacon, juice, eggs, toast, fancy, receipt, folder, pinball, poster, clock, coffee. `clock: n` spins the bedroom clock n hours over the line.
- **beats** (`on` = a word of the line; `word#2` = its 2nd time; `start`/`end`), any of:
  - change an actor: `actor` + `pose` / `face` / `eye` / `hold` / `give` (hands a thing) / `to` (walks to a mark) / `lie`
  - `shot` (cut), `kick` (camera shake 0.3–1), `flash` (white flash)
  - on-screen: `text` + `where` (top/middle/bottom), `icon` (book, clock, calendar, trophy, bed), `stamp` (red stamp text), `brain` (n lights that switch off)
  - floating card: `card` (zzz, qmark, exclaim, bulb, stars, burst, note, anger, sweat, critter, heart, check, cross) + `at` (actor)
  - `prop` (pop in), `hide` (remove a prop)
  - `sfx`: boing, wobble, ding, pop, thud, tick, click, whoosh, snore, scratch, stamp, pinball, register, cymbal, fanfare
- **music** (on a line, lasts until changed): march, dream, soft, tense, stop.

A topic that needs a place not in this list needs a new set (one-time code), then it joins the library.
