"""Voice for any plan, then faster-whisper (open source) times every word.
usage: python scripts/make_voice.py videos/<id>/plan.json models_dir out_dir
writes out_dir/voice.wav (24 kHz) and out_dir/words.json ([{w, s, e, line}]).

Two voice sources, picked automatically:
  * recorded: if videos/<id>/voice.(m4a|mp3|wav|flac|ogg|aac) exists, that is the narration. Record the whole script
    in one take on a phone (small pauses between lines are fine; retakes are not). Whisper finds each line in it.
  * kokoro (default): open-source TTS. plan "voice": {"name": "am_michael", "speed": 1.2}
    name can blend voices: "am_michael:0.7,am_puck:0.3". A line can override speed with "speed".
Both go through the same clean-up chain (rumble cut, gentle compression, presence lift, de-ess, level)."""
import json, sys, os, re, glob, subprocess, difflib, numpy as np, soundfile as sf
from scipy.signal import resample_poly, butter, sosfilt

norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())
plan_path, M, OUT = sys.argv[1:4]
plan = json.load(open(plan_path))
voice = plan.get("voice", {})
L = plan["lines"]
SR = 24000


# ---------------- clean-up chain ----------------
def _sos(kind, f, order=2): return butter(order, f, btype=kind, fs=SR, output="sos")
def _env(x, att, rel):
    a, r_ = np.exp(-1 / (att * SR)), np.exp(-1 / (rel * SR)); e = np.empty_like(x); cur = 0.0
    for i, v in enumerate(np.abs(x)):
        k = a if v > cur else r_; cur = k * cur + (1 - k) * v; e[i] = cur
    return e
def polish(x, recorded=False):
    x = sosfilt(_sos("highpass", 85 if recorded else 70), x)
    if recorded:  # simple downward expander: hush room noise between words
        e = _env(x, 0.002, 0.12); fl = np.percentile(e, 20) * 2.2
        x = x * np.clip(e / max(fl, 1e-6), 0.12, 1.0) ** 0.8
    # compressor, ~3:1 above -24 dBFS-ish (relative to peak)
    x = x / (np.abs(x).max() + 1e-9)
    e = _env(x, 0.004, 0.09); th = 0.12; g = np.where(e > th, (th + (e - th) / 3) / np.maximum(e, 1e-9), 1.0); x = x * g
    # presence (+3 dB around 3 kHz) and air, warm body (+1.5 dB around 180 Hz)
    x = x + 0.4 * sosfilt(_sos("bandpass", [2200, 4200]), x) + 0.18 * sosfilt(_sos("bandpass", [140, 240]), x)
    # de-ess: duck 5-9 kHz when it gets hot
    s = sosfilt(_sos("bandpass", [5000, 9000]), x); es = _env(s, 0.001, 0.04); lim = np.percentile(es, 90)
    x = x - s * np.clip(1 - lim / np.maximum(es, 1e-9), 0, 0.6)
    return (x / (np.abs(x).max() + 1e-9) * 0.89).astype(np.float32)

def squeeze(a, text):
    """trim the ends and shorten long pauses to 0.3 s (0.45 s around '...')"""
    idx = np.where(np.abs(a) > 0.01)[0]
    if not len(idx): return a
    a = a[max(0, idx[0] - 300): idx[-1] + 900]
    env = np.convolve(np.abs(a), np.ones(240) / 240, mode="same"); quiet = env < 0.008
    keep, out, run = int((0.45 if "..." in text or "…" in text else 0.3) * SR), [], 0
    for j, s in enumerate(a):
        run = run + 1 if quiet[j] else 0
        if run <= keep: out.append(s)
    return np.array(out, dtype=np.float32)


# ---------------- source: recorded take or Kokoro ----------------
from faster_whisper import WhisperModel
wm = WhisperModel("base.en", device="cpu", compute_type="int8")
take = sorted(glob.glob(os.path.join(os.path.dirname(plan_path), "voice.*")))
take = [p for p in take if p.rsplit(".", 1)[-1].lower() in ("m4a", "mp3", "wav", "flac", "ogg", "aac", "opus")]
parts = []
if take:
    src = take[0]; wav = os.path.join(OUT, "_take.wav")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", src, "-ac", "1", "-ar", str(SR), wav], check=True)
    rec, _ = sf.read(wav, dtype="float32")
    ss, _ = wm.transcribe(resample_poly(rec, 2, 3).astype(np.float32), word_timestamps=True,
                          initial_prompt=" ".join(l["text"] for l in L)[:800], condition_on_previous_text=False)
    lw = [w for s in ss for w in s.words]
    T = [(i, t) for i, l in enumerate(L) for t in l["text"].split()]
    hit = {}
    for a, b, n in difflib.SequenceMatcher(None, [norm(t) for _, t in T], [norm(w.word) for w in lw], autojunk=False).get_matching_blocks():
        for k in range(n): hit[a + k] = lw[b + k]
    starts = []
    for i in range(len(L)):
        js = [j for j, (li, _) in enumerate(T) if li == i]
        got = [hit[j] for j in js if j in hit]
        if not got: sys.exit(f"recorded voice: could not find line {i + 1} in {src} ({L[i]['text'][:40]}...)")
        starts.append((got[0].start, got[-1].end))
    for i, (s0, s1) in enumerate(starts):
        a = max(0.0, s0 - 0.15) if i == 0 else max(starts[i - 1][1] + 0.02, s0 - 0.15)
        b = min(len(rec) / SR, s1 + 0.25) if i + 1 == len(L) else min(starts[i + 1][0] - 0.05, s1 + 0.25)
        parts.append(squeeze(polish(rec[int(a * SR): int(b * SR)], recorded=True), L[i]["text"]))
    print("voice: recorded take", src)
else:
    from kokoro_onnx import Kokoro
    k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
    name = voice.get("name", "am_michael")
    if ":" in name or "," in name:  # blend: "am_michael:0.7,am_puck:0.3"
        mix, tot = None, 0.0
        for part in name.split(","):
            n, _, w = part.partition(":"); w = float(w or 1); st = k.get_voice_style(n.strip()) * w
            mix = st if mix is None else mix + st; tot += w
        name = mix / tot
    for line in L:
        a, sr = k.create(line["text"], voice=name, speed=line.get("speed", voice.get("speed", 1.2)), lang="en-us")
        parts.append(squeeze(polish(a.astype(np.float32)), line["text"]))
    print("voice: kokoro", voice.get("name", "am_michael"))

# ---------------- word timings (script words, whisper times) ----------------
words, off, chunks = [], 0.0, []
for i, (seg, line) in enumerate(zip(parts, L)):
    gap = 0.0 if i == len(L) - 1 else float(line.get("gap", 0.3))
    ss, _ = wm.transcribe(resample_poly(seg, 2, 3).astype(np.float32), word_timestamps=True, initial_prompt=line["text"], condition_on_previous_text=False)
    dur = len(seg) / SR
    lw = [w for s in ss for w in s.words if w.start <= dur]
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
    chunks += [seg, np.zeros(int(gap * SR), np.float32)]
    off += dur + gap
sf.write(f"{OUT}/voice.wav", np.concatenate(chunks), SR)
json.dump(words, open(f"{OUT}/words.json", "w"), indent=0)
print("dur", round(off, 2), "frames", round(off * 30), "words", len(words))
