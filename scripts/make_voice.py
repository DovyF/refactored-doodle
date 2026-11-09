"""Voice for any plan: Kokoro (open source) speaks each line, faster-whisper (open source) times every word.
usage: python scripts/make_voice.py videos/<id>/plan.json models_dir out_dir
writes out_dir/voice.wav (24 kHz) and out_dir/words.json ([{w, s, e, line}])."""
import json, sys, re, difflib, numpy as np, soundfile as sf
norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel

plan_path, M, OUT = sys.argv[1:4]
plan = json.load(open(plan_path))
voice = plan.get("voice", {})
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
sr, parts, gaps = 24000, [], []
for i, line in enumerate(plan["lines"]):
    text = line["text"]
    a, sr = k.create(text, voice=voice.get("name", "am_michael"), speed=voice.get("speed", 1.2), lang="en-us")
    idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0] - 300): idx[-1] + 900]
    # squeeze long internal pauses down to 0.3 s (0.45 s for "..." beats)
    env = np.convolve(np.abs(a), np.ones(240) / 240, mode="same"); quiet = env < 0.008
    keep, out, run = int((0.45 if "..." in text else 0.3) * sr), [], 0
    for j, s in enumerate(a):
        run = run + 1 if quiet[j] else 0
        if run <= keep: out.append(s)
    parts.append(np.array(out, dtype=np.float32))
    gaps.append(0.0 if i == len(plan["lines"]) - 1 else float(line.get("gap", 0.3)))
m = WhisperModel("base.en", device="cpu", compute_type="int8")
words, off, chunks = [], 0.0, []
for i, (seg, line) in enumerate(zip(parts, plan["lines"])):
    ss, _ = m.transcribe(resample_poly(seg, 2, 3).astype(np.float32), word_timestamps=True, initial_prompt=line["text"], condition_on_previous_text=False)
    lw = [w for s in ss for w in s.words if w.start <= len(seg) / sr]
    dur = len(seg) / sr
    # keep the script's own words (beats match them exactly); take times from whisper, aligned word by word
    T = line["text"].split(); Tn = [norm(t) for t in T]; Wn = [norm(w.word) for w in lw]
    tm = [None] * len(T)
    for a, b, n in difflib.SequenceMatcher(None, Tn, Wn, autojunk=False).get_matching_blocks():
        for k2 in range(n): tm[a + k2] = (lw[b + k2].start, min(lw[b + k2].end, dur))
    if tm and tm[0] is None: tm[0] = (lw[0].start if lw else 0.0, lw[0].end if lw else 0.2)
    if tm and tm[-1] is None: tm[-1] = (max(tm[0][0], dur - 0.4), dur)
    j = 0
    while j < len(tm):
        if tm[j] is None:
            k3 = j
            while tm[k3] is None: k3 += 1
            t0, t1 = tm[j - 1][1], tm[k3][0]
            for q in range(j, k3): step = (t1 - t0) / (k3 - j); tm[q] = (t0 + step * (q - j), t0 + step * (q - j + 1))
            j = k3
        j += 1
    for t, (a2, b2) in zip(T, tm): words.append({"w": t, "s": round(off + a2, 3), "e": round(off + b2, 3), "line": i + 1})
    print(f"L{i+1} @{round(off*30)}: " + " ".join(f'{t}@{round((off + a2)*30)}' for t, (a2, b2) in zip(T, tm)))
    chunks += [seg, np.zeros(int(gaps[i] * sr), np.float32)]
    off += dur + gaps[i]
sf.write(f"{OUT}/voice.wav", np.concatenate(chunks), sr)
json.dump(words, open(f"{OUT}/words.json", "w"), indent=0)
print("dur", round(off, 2), "frames", round(off * 30), "words", len(words))
