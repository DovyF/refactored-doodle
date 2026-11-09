"""Sound for any plan: original music that follows each line's "music" mood, sound effects on the plan's cue words,
automatic whooshes on set changes and thuds on camera kicks, all ducked under the voice and mastered to -14 LUFS.
usage: python scripts/make_sound.py videos/<id>/plan.json work_dir   (reads work_dir/voice.wav + words.json, writes work_dir/mix.wav)"""
import json, re, sys, os, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from scipy.ndimage import maximum_filter1d
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "audio"))
from dsp import SR, ns, rng, place, lp, hp, bp, norm_to, integrated, true_peak, dbg, make_ir, convolve_st
from instruments import m2f, brass, glock, snare, timpani, pluck, pad, triangle, cymbal, brush, musicbox, vibes

plan_p, W = sys.argv[1:3]
plan = json.load(open(plan_p)); words = json.load(open(f"{W}/words.json"))
FPS = 30
norm = lambda x: re.sub(r"[^a-z0-9']", "", x.lower())
TOTAL = words[-1]["e"] + 0.6
N = ns(TOTAL)
r = rng(7)
voice, vsr = sf.read(f"{W}/voice.wav"); voice = resample_poly(voice, SR, vsr)
vbuf = np.zeros((2, N)); place(vbuf, voice, 0.0)

# ---- line timing + beat frames (same rules as src/lib/plan.ts) ----
L = plan["lines"]
A = [0 if i == 0 else max(0, round(next(w["s"] for w in words if w["line"] == i + 1) * FPS) - 3) for i in range(len(L))]
B = A[1:] + [round(TOTAL * FPS)]
def beat_t(i, on):
    if on == "start": return A[i] / FPS
    if on == "end": return max(A[i], B[i] - 10) / FPS
    word, _, nth = on.partition("#"); k = int(nth or 1); ws = [w for w in words if w["line"] == i + 1]
    for w in ws:
        if norm(w["w"]) == norm(word):
            k -= 1
            if k == 0: return max(A[i], round(w["s"] * FPS) - 2) / FPS
    for w in ws:
        if norm(w["w"]).startswith(norm(word)): return max(A[i], round(w["s"] * FPS) - 2) / FPS
    return A[i] / FPS

# ---------------- music ----------------
mus = np.zeros((2, N))
BPM = 112; Bt = 60 / BPM
C, Fm, G, Am, E, Dm, Em = [48, 52, 55], [53, 57, 60], [55, 59, 62], [57, 60, 64], [52, 56, 59], [50, 53, 57], [52, 55, 59]
tune = [76, 79, 81, 79, 77, 76, 74, 76, 72, 74, 76, 77, 79, 77, 76, 72]
tuneB = [81, 79, 77, 76, 74, 76, 77, 79, 76, 74, 72, 74, 76, 74, 72, 67]
grid = lambda t: round(t / (Bt / 2)) * (Bt / 2)          # every mood starts on the same eighth-note grid -> no tempo jumps
def kick(vel=1.0):
    n = ns(0.35); t = np.arange(n) / SR; f = 48 + 90 * np.exp(-t / 0.03)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16) + lp(r.standard_normal(n), 2500, 2) * np.exp(-t / 0.004) * 0.3) * vel
def hat(vel=0.5, open_=False):
    n = ns(0.25 if open_ else 0.06); t = np.arange(n) / SR
    return hp(r.standard_normal(n), 7000, 2) * np.exp(-t / (0.07 if open_ else 0.012)) * vel
def groove(t0, t1, vel=1.0, half=False):
    for k, tb in enumerate(np.arange(t0, t1 - 0.05, Bt / 2)):
        if k % (8 if half else 4) == 0: place(mus, kick(0.9), tb, 0.5 * vel)
        place(mus, hat(0.5 if k % 2 else 0.3, open_=(k % 8 == 7)), tb, 0.16 * vel)
def march(t0, t1, vel=1.0):
    t, bar = t0, 0
    groove(t0, t1, 0.8 * vel)
    while t < t1 - 0.05:
        ch = ([C, Fm, G, C] if (bar // 4) % 2 == 0 else [Am, Fm, Dm, G])[bar % 4]
        mel = tune if (bar // 4) % 2 == 0 else tuneB
        for beat in range(4):
            tb = t + beat * Bt
            if tb >= t1 - 0.05: return
            if beat in (0, 2): place(mus, brass(m2f(ch[0] - 12 if beat == 0 else ch[2] - 24), 0.28, 0.7, r, "tuba"), tb, 0.55 * vel)
            else:
                place(mus, snare(0.35, r, tune=1.1), tb, 0.35 * vel)
                for n in ch: place(mus, pluck(m2f(n + 12), 0.35, r, 0.35), tb, 0.18 * vel)
            if beat % 2 == 0: place(mus, glock(m2f(mel[(bar * 2 + beat // 2) % len(mel)]), 0.5, r, 1.0), tb, 0.22 * vel)
        t += 4 * Bt; bar += 1
def dream(t0, t1):
    k = 0
    for tb in np.arange(t0, t1 - 0.1, Bt / 2):
        ch = [C, Am, Fm, G][(k // 8) % 4]; n = (ch + [ch[0] + 12])[[0, 1, 2, 3, 2, 1, 0, 1][k % 8]]
        place(mus, musicbox(m2f(n + 24), 0.45, r, 1.4), tb, 0.3); k += 1
    place(mus, pad([m2f(48), m2f(55), m2f(64)], max(0.2, t1 - t0), 0.35, r, att=0.6, rel=0.5, warm=500), t0, 0.35)
def soft(t0, t1):
    place(mus, pad([m2f(48), m2f(55), m2f(60), m2f(64)], max(0.2, t1 - t0), 0.25, r, att=0.8, rel=0.6, warm=700), t0, 0.25)
    for k, tb in enumerate(np.arange(t0, t1 - 0.1, Bt)):
        if k % 2 == 1: place(mus, vibes(m2f([72, 76, 79, 76][(k // 2) % 4]), 0.35, r, 1.4), tb, 0.18)
        ch = [C, Am, Fm, G][(k // 4) % 4]; place(mus, pluck(m2f(ch[k % 3] + 12), 0.45, r, 0.6), tb, 0.3)
        if k % 4 == 0: place(mus, pluck(m2f(ch[0] - 12), 0.6, r, 0.9, bright=0.3), tb, 0.35)
def tense(t0, t1):
    place(mus, pad([m2f(45), m2f(52), m2f(57)], max(0.2, t1 - t0), 0.5, r, att=0.4, rel=0.3, warm=600), t0, 0.7)
    for k, tb in enumerate(np.arange(t0, t1 - 0.1, Bt / 2)):
        up = (k // 16) % 3                                   # creeps up a semitone every two bars
        place(mus, pluck(m2f([45, 48, 52, 51][k % 4] + up), 0.5, r, 0.4, bright=0.2), tb, 0.3)
        if k % 4 == 0: place(mus, kick(0.7), tb, 0.35); place(mus, kick(0.5), tb + 0.18, 0.25)   # heartbeat
        if k % 2 == 1: place(mus, hat(0.35), tb, 0.08)
MOODS = {"march": march, "dream": dream, "soft": soft, "tense": tense}
def swell(t_end, dur=0.7, vel=0.35):
    """reverse-cymbal style rise that lands on a mood change"""
    n = ns(dur); t = np.arange(n) / SR; x = hp(r.standard_normal(n), 3000, 2) * (t / dur) ** 3
    place(mus, np.vstack([x, np.roll(x, 37)]), max(0.0, t_end - dur), vel)
mood, start = "march", 0.0
for i, line in enumerate(L + [{"music": "_end"}]):
    if "music" in line and (i == 0 or line["music"] != mood):
        t = (grid(A[i] / FPS) if i < len(L) else TOTAL)
        if i > 0 and mood in MOODS: MOODS[mood](start, t)
        if 0 < i < len(L) and line["music"] in MOODS and mood in MOODS: swell(t)
        mood, start = line["music"], t
# a closing chord under the last word, then fade
place(mus, pad([m2f(48), m2f(55), m2f(64), m2f(72)], 1.6, 0.4, r, att=0.05, rel=1.2, warm=900), max(0.0, TOTAL - 1.6), 0.4)
fo = ns(0.6); mus[:, -fo:] *= np.linspace(1, 0, fo)[None, :]

# ---------------- sound effects ----------------
sfx = np.zeros((2, N))
def whoosh(dur=0.32, lo=500, hi=4000, vel=0.6): n = ns(dur); t = np.arange(n) / SR; return bp(r.standard_normal(n), lo, hi, 2) * np.sin(np.pi * t / dur) ** 2 * vel
def thud(vel=1.0, dur=0.5): n = ns(dur); t = np.arange(n) / SR; return (lp(r.standard_normal(n), 180, 4) * np.exp(-t / 0.06) * 2.5 + np.sin(2 * np.pi * 55 * t) * np.exp(-t / 0.12)) * vel
def click(vel=0.5): n = ns(0.06); t = np.arange(n) / SR; return (hp(r.standard_normal(n), 1800, 2) * np.exp(-t / 0.006) + bp(r.standard_normal(n), 300, 900, 2) * np.exp(-t / 0.012) * 0.6) * vel
def sweep(f0, f1, dur, vel=0.5, wob=18):
    n = ns(dur); t = np.arange(n) / SR; f = f0 + (f1 - f0) * (1 - np.exp(-t / (dur / 3))) + 30 * np.sin(2 * np.pi * wob * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (dur / 2.5)) * vel
def snore(dur=0.9): n = ns(dur); t = np.arange(n) / SR; return lp(r.standard_normal(n), 400, 3) * np.sin(np.pi * t / dur) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * 28 * t)) * 1.4
def ding(m=96, vel=0.6): return glock(m2f(m), vel, r, 1.0)
def scratch(dur=0.28):
    n = ns(dur); t = np.arange(n) / SR; x = r.standard_normal(n); y = np.zeros(n); fc = 3000 * np.exp(-t / 0.08) + 300
    for i in range(0, n, 256): y[i:i + 256] = bp(x[i:i + 256], max(100, fc[i] * 0.7), fc[i] * 1.3, 2)[: len(y[i:i + 256])]
    return y * np.sin(np.pi * t / dur) * 0.7
def vary(x):
    """small random pitch + level change so repeated effects don't sound copy-pasted"""
    up, dn = [(20, 19), (1, 1), (19, 20), (21, 20), (20, 21)][r.integers(5)]
    y = resample_poly(x, up, dn, axis=-1) if up != dn else x
    return y * dbg(r.uniform(-1.5, 1.5))
def coin():
    n = ns(0.9); t = np.arange(n) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t / d) * a for f, d, a in ((2600, 0.35, 0.5), (4100, 0.22, 0.35), (6300, 0.12, 0.2))) * (1 + 0.3 * np.sin(2 * np.pi * 14 * t))
def crowd(dur=1.4):
    n = ns(dur); t = np.arange(n) / SR; x = sum(bp(r.standard_normal(n), lo, lo * 2.2, 2) for lo in (300, 700, 1500))
    return x * np.sin(np.pi * np.minimum(t / dur * 1.6, 1)) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * 6 * t)) * 0.6
def heartbeat():
    out = np.zeros(ns(1.0))
    for t0 in (0.0, 0.22): k = kick(0.9 if t0 == 0 else 0.6); i = ns(t0); out[i:i + len(k)] += k[: len(out) - i]
    return lp(out, 160, 2) * 1.6
def riser(dur=1.0):
    n = ns(dur); t = np.arange(n) / SR; f = 200 * 2 ** (3 * t / dur)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.4 + hp(r.standard_normal(n), 2000, 2) * 0.5) * (t / dur) ** 2
def hit():
    n = ns(1.2); t = np.arange(n) / SR; f = 40 + 60 * np.exp(-t / 0.05)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.4) * 1.2 + lp(r.standard_normal(n), 900, 2) * np.exp(-t / 0.08)
SFX = {
    "boing": lambda t: place(sfx, vary(sweep(220, 520, 0.35)), t, 0.45),
    "wobble": lambda t: place(sfx, vary(sweep(300, 180, 0.8, 0.4, 7)), t, 0.45),
    "ding": lambda t: (place(sfx, ding(96), t, 0.5), place(sfx, ding(100), t + 0.07, 0.45)),
    "pop": lambda t: (place(sfx, click(0.5), t, 0.4), place(sfx, ding(91, 0.4), t, 0.35)),
    "thud": lambda t: place(sfx, vary(thud(0.6)), t, 0.55),
    "tick": lambda t: (place(sfx, click(0.9), t, 0.6), place(sfx, click(0.6), t + 0.5, 0.4)),
    "click": lambda t: place(sfx, vary(click(0.9)), t, 0.6),
    "whoosh": lambda t: place(sfx, whoosh(), t - 0.12, 0.45),
    "snore": lambda t: place(sfx, vary(snore()), t, 0.35),
    "scratch": lambda t: place(sfx, vary(scratch()), t, 0.6),
    "stamp": lambda t: (place(sfx, thud(1.2), t, 0.9), place(sfx, timpani(m2f(31), 1.0, r, 2.0), t, 0.7)),
    "pinball": lambda t: [place(sfx, ding(84 + (k % 4) * 4, 0.45), t + k * 0.07, 0.4) for k in range(8)],
    "register": lambda t: (place(sfx, click(0.8), t, 0.5), place(sfx, ding(96), t + 0.04, 0.5), place(sfx, ding(100), t + 0.1, 0.5)),
    "cymbal": lambda t: place(sfx, cymbal(0.5, r, 1.4), t, 0.25),
    "fanfare": lambda t: [place(sfx, brass(m2f(m), 0.5, 0.8, r, "stab"), t, 0.22) for m in (60, 64, 67, 72)],
    "coin": lambda t: place(sfx, vary(coin()), t, 0.35),
    "crowd": lambda t: place(sfx, crowd(), t, 0.45),
    "heartbeat": lambda t: (place(sfx, heartbeat(), t, 0.7), place(sfx, heartbeat(), t + 0.75, 0.55)),
    "riser": lambda t: place(sfx, riser(), t - 1.0, 0.35),
    "hit": lambda t: place(sfx, hit(), t, 0.8),
}
prev_set = None
for i, line in enumerate(L):
    if prev_set and line["set"] != prev_set: SFX["whoosh"](A[i] / FPS)
    prev_set = line["set"]
    for bt in line.get("beats", []):
        t = beat_t(i, bt["on"])
        if bt.get("sfx") in SFX: SFX[bt["sfx"]](t)
        if bt.get("kick") and bt.get("sfx") not in ("stamp", "thud"): place(sfx, thud(0.35 * bt["kick"], 0.3), t + 0.07, 0.5)
        if bt.get("text") and not bt.get("sfx"): place(sfx, click(0.35), t, 0.3)
        if bt.get("shot") and not bt.get("sfx"): place(sfx, whoosh(0.18, 1500, 6000, 0.25), t - 0.06, 0.25)

# ---------------- mix ----------------
vbuf = norm_to(vbuf, -16, "integrated")
env = np.abs(vbuf[0]); k = ns(0.12); env = np.convolve(env, np.ones(k) / k, mode="same"); env = env / (env.max() + 1e-9)
duck = 1 - 0.78 * np.clip(env * 6, 0, 1)
if np.abs(mus).max() > 0:
    mus = 0.8 * mus + 0.2 * convolve_st(mus, make_ir(0.9, 3))[:, :N]
    mus = norm_to(mus, -19, "integrated") * dbg(3) * duck[None, :]
if np.abs(sfx).max() > 0: sfx = norm_to(sfx, -14, "momentary") * dbg(-6)
mix = vbuf + mus + sfx
def limit(x, ceil_db=-1.5, rel=0.08, look=0.004):
    c = dbg(ceil_db); pk = maximum_filter1d(np.abs(x).max(0), 2 * ns(look) + 1); g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    a = np.exp(-1 / (rel * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)): cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]; out[i] = cur
    return x * out[None, :]
for _ in range(3): mix = limit(norm_to(mix, -14, "integrated"))
tp = true_peak(mix)
if tp > -1.0: mix *= dbg(-1.0 - tp)
sf.write(f"{W}/mix.wav", mix.T, SR, subtype="PCM_24")
print("len", round(N / SR, 2), "LUFS", round(integrated(mix), 1), "TP", round(true_peak(mix), 1))
