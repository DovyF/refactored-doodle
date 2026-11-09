"""Sound for the president sample: an original light march score + synthesized SFX, ducked under the voice.
Uses the skill's synth helpers (dsp.py, instruments.py). Frame of an event = round(seconds * 30)."""
import numpy as np, soundfile as sf
from scipy.signal import resample_poly
from dsp import SR, ns, rng, place, st, lp, hp, bp, norm_to, integrated, true_peak, dbg, make_ir, convolve_st
from instruments import m2f, brass, glock, snare, timpani, pluck, pad, triangle, cymbal, brush

V = "/home/claude/shorts/voice/voice2.wav"
OUT = "/home/claude/shorts/audio/mix2.wav"
FPS = 30
TOTAL = 1868 / FPS
F = lambda f: f / FPS
r = rng(7)

voice, vsr = sf.read(V)
voice = resample_poly(voice, SR, vsr)
N = ns(TOTAL)
vbuf = np.zeros((2, N)); place(vbuf, voice, 0.0)

# ---------------- music ----------------
mus = np.zeros((2, N))
BPM = 112; B = 60 / BPM
C, Fm, G, Am, E, Dm = [48, 52, 55], [53, 57, 60], [55, 59, 62], [57, 60, 64], [52, 56, 59], [50, 53, 57]
tune = [76, 79, 81, 79, 77, 76, 74, 76, 72, 74, 76, 77, 79, 77, 76, 72]
def march(t0, t1, prog, vel=1.0, glk=True):
    t, bar = t0, 0
    while t < t1 - 0.05:
        ch = prog[bar % len(prog)]
        for beat in range(4):
            tb = t + beat * B
            if tb >= t1 - 0.05: return
            if beat in (0, 2): place(mus, brass(m2f(ch[0] - 12 if beat == 0 else ch[2] - 24), 0.28, 0.7, r, "tuba"), tb, 0.55 * vel)
            else:
                place(mus, snare(0.35, r, tune=1.1), tb, 0.35 * vel)
                for n in ch: place(mus, pluck(m2f(n + 12), 0.35, r, 0.35), tb, 0.18 * vel)
            if glk and beat % 2 == 0: place(mus, glock(m2f(tune[(bar * 2 + beat // 2) % len(tune)]), 0.5, r, 1.0), tb, 0.22 * vel)
        t += 4 * B; bar += 1
march(0.0, F(1134), [C, Fm, G, C])                       # the story: bouncy march, cut dead on "Wait..."
# "You see" explanation: soft pizzicato, no drums
for k in range(int((F(1542) - F(1245)) / B)):
    tb = F(1245) + k * B; ch = [C, Am, Fm, G][(k // 4) % 4]
    place(mus, pluck(m2f(ch[k % 3] + 12), 0.45, r, 0.6), tb, 0.3)
    if k % 4 == 0: place(mus, pluck(m2f(ch[0] - 12), 0.6, r, 0.9, bright=0.3), tb, 0.35)
# the codes: low tense pad + snare roll into "codes"
place(mus, pad([m2f(45), m2f(52), m2f(57)], F(1771) - F(1568), 0.5, r, att=0.5, rel=0.3, warm=600), F(1568), 0.7)
for i, tb in enumerate(np.arange(F(1610), F(1654), 1 / 24)): place(mus, snare(0.15 + 0.5 * i / 44, r, dur=0.12, buzz=True), tb, 0.3)
march(F(1771), F(1868) + 0.05, [C, G], vel=0.8)           # the loop line: the march comes back
place(mus, glock(m2f(84), 0.6, r, 1.6), F(1855), 0.35)

# ---------------- sfx ----------------
sfx = np.zeros((2, N))
def whoosh(dur=0.32, lo=500, hi=4000, vel=0.6):
    n = ns(dur); tt = np.arange(n) / SR
    return bp(r.standard_normal(n), lo, hi, 2) * np.sin(np.pi * tt / dur) ** 2 * vel
def thud(vel=1.0, dur=0.5):
    n = ns(dur); tt = np.arange(n) / SR
    return (lp(r.standard_normal(n), 180, 4) * np.exp(-tt / 0.06) * 2.5 + np.sin(2 * np.pi * 55 * tt) * np.exp(-tt / 0.12)) * vel
def click(vel=0.5):
    n = ns(0.06); tt = np.arange(n) / SR
    return (hp(r.standard_normal(n), 1800, 2) * np.exp(-tt / 0.006) + bp(r.standard_normal(n), 300, 900, 2) * np.exp(-tt / 0.012) * 0.6) * vel
def boing(f0=220, f1=520, dur=0.35, vel=0.5):
    n = ns(dur); tt = np.arange(n) / SR; f = f0 + (f1 - f0) * (1 - np.exp(-tt / 0.05)) + 30 * np.sin(2 * np.pi * 18 * tt)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt / 0.12) * vel
def scratch(dur=0.28, vel=0.6):
    n = ns(dur); tt = np.arange(n) / SR; fc = 3000 * np.exp(-tt / 0.08) + 300
    y = np.zeros(n); x = r.standard_normal(n)
    for i in range(0, n, 256): y[i:i + 256] = bp(x[i:i + 256 + 0], max(100, fc[i] * 0.7), fc[i] * 1.3, 2)[:len(y[i:i + 256])]
    return y * np.sin(np.pi * tt / dur) * vel
def ding(m=96, vel=0.6): return glock(m2f(m), vel, r, 1.0)
def register(t): place(sfx, click(0.8), t, 0.5); place(sfx, ding(96), t + 0.04, 0.5); place(sfx, ding(100), t + 0.1, 0.5)
for m, dt in [(60, 0), (64, 0), (67, 0), (72, 0)]: place(sfx, brass(m2f(m), 0.5, 0.8, r, "stab"), F(27), 0.25)   # "powerful": fanfare stab
place(sfx, cymbal(0.5, r, 1.4), F(27), 0.2)
place(sfx, scratch(), F(92), 0.6)                                              # "not allowed"
place(sfx, whoosh(0.3), F(146) - 0.1, 0.5); place(sfx, ding(91, 0.4), F(147), 0.4)
for f in [256, 262, 268, 274, 280, 287, 294, 300, 306, 313]: place(sfx, thud(0.35, 0.25), F(f), 0.5); place(sfx, click(0.4), F(f), 0.3)   # boxes
for f in (413, 421, 429, 1840, 1848): place(sfx, thud(0.55, 0.3), F(f), 0.6)  # window strains
for f in (441, 468, 634, 855, 1238, 1562): place(sfx, whoosh(0.3), F(f) - 0.12, 0.45)
place(sfx, whoosh(0.18, 1500, 7000, 0.6), F(543), 0.5); place(sfx, boing(400, 200, 0.2, 0.3), F(547), 0.4)   # phone snatch
for i in range(6): place(sfx, ding(98 + (i % 3) * 3, 0.25), F(657) + i * 0.035, 0.25)                       # keys jingle
place(sfx, whoosh(0.18, 1500, 7000, 0.6), F(720), 0.5)
for i in range(6): place(sfx, ding(98 + (i % 3) * 3, 0.2), F(724) + i * 0.035, 0.2)
for f, m in [(910, 79), (932, 83), (945, 86), (948, 88), (951, 91)]: place(sfx, ding(m, 0.4), F(f), 0.35); place(sfx, click(0.3), F(f), 0.3)
place(sfx, whoosh(0.4, 3000, 9000, 0.25), F(932), 0.3)                         # bacon sizzle
place(sfx, brush(0.6, r, 0.35, swish=True), F(1015), 0.5); place(sfx, thud(0.3, 0.2), F(1022), 0.4)
for f in (1038, 1065, 1099): register(F(f))                                    # every meal, every snack, toothpaste
place(sfx, timpani(m2f(38), 0.9, r, 1.8), F(1208), 0.8); place(sfx, thud(0.6), F(1208), 0.4)   # "groceries"
place(sfx, triangle(0.6, r, 1.2), F(1287), 0.4); place(sfx, ding(100, 0.7), F(1287), 0.5)       # hotel bell
place(sfx, ding(88, 0.4), F(1386), 0.3)
place(sfx, whoosh(1.3, 200, 1800, 0.7), F(1415), 0.6)                          # jet flyover
for f, m in [(1454, 84), (1476, 88), (1499, 91)]: place(sfx, ding(m, 0.4), F(f), 0.4)
register(F(1542)); place(sfx, thud(0.8), F(1542), 0.5)                         # "your tab"
place(sfx, timpani(m2f(31), 1.0, r, 2.2), F(1655), 0.8); place(sfx, brass(m2f(45), 0.4, 0.9, r, "stab"), F(1655), 0.35)   # "codes"
for i in range(3): place(sfx, boing(220, 520, 0.3, 0.45), F(1719 + i * 7), 0.4) # "?"
for i, m in enumerate([88, 91, 93, 96]): place(sfx, ding(m, 0.3), F(1773) + i * 0.05, 0.3)

# ---------------- mix: voice -16 LUFS, music ducked ~13 dB under speech, sfx under the voice ----------------
vbuf = norm_to(vbuf, -16, "integrated")
env = np.abs(vbuf[0]); k = ns(0.12)
env = np.convolve(env, np.ones(k) / k, mode="same"); env = env / (env.max() + 1e-9)
duck = 1 - 0.78 * np.clip(env * 6, 0, 1)
ir = make_ir(0.9, 3)
mus_w = 0.8 * mus + 0.2 * convolve_st(mus, ir)[:, :N]
mus_w = norm_to(mus_w, -19, "integrated") * dbg(3) * duck[None, :]
sfx = norm_to(sfx, -14, "momentary") * dbg(-6)
mix = vbuf + mus_w + sfx
def limit(x, ceil_db=-1.5, rel=0.08, look=0.004):
    # look-ahead peak limiter: gain follows the max peak in a short window, fast attack, smooth release
    c = dbg(ceil_db); pk = np.abs(x).max(0); L = ns(look)
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(pk, 2 * L + 1)
    g = np.minimum(1.0, c / np.maximum(pk, 1e-9))
    a = np.exp(-1 / (rel * SR)); out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        cur = g[i] if g[i] < cur else a * cur + (1 - a) * g[i]
        out[i] = cur
    return x * out[None, :]
for _ in range(3):
    mix = norm_to(mix, -14, "integrated")
    mix = limit(mix)
tp = true_peak(mix)
if tp > -1.0: mix *= dbg(-1.0 - tp)
sf.write(OUT, mix.T, SR, subtype="PCM_24")
print("len", N / SR, "LUFS", round(integrated(mix), 1), "TP", round(true_peak(mix), 1))
