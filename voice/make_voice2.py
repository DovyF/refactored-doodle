"""Voice v2: Kokoro (open source) -> faster-whisper word timings (open source). Lines kept separate so pauses can be set per line."""
import json, numpy as np, soundfile as sf
from scipy.signal import resample_poly
from kokoro_onnx import Kokoro
from faster_whisper import WhisperModel
M = "/tmp/claude-0/-home-claude/c34e06d0-e903-5fb3-a309-ca6cb278759f/scratchpad/models"
LINES = [
 "You just became the most powerful person on Earth... and you're not allowed to open a window.",
 "It's your first morning in the White House. While you gave your big speech, staff moved your whole life in, in about five hours.",
 "You walk to the window for some fresh air. It doesn't open. None of them do.",
 "Fine. You grab your phone to call a friend. Security takes it. Even Obama wasn't allowed an iPhone.",
 "So you grab your car keys. The Secret Service takes those too. The last president to drive on a public road was Lyndon Johnson.",
 "At least breakfast is free. You order pancakes, bacon, the works.",
 "Then the end of the month comes, and so does the bill. Every meal. Every snack. Even your toothpaste.",
 "Wait... you run the country, and you're paying for your own groceries?",
 "You see, the White House works like a hotel that comes with your job. The government pays for the job, like state dinners and Air Force One. But your food, your dry cleaning, your toothpaste? That's your tab.",
 "And the one thing they do hand you? A card with the nuclear launch codes. One president's aide reportedly lost it for months.",
 "So now you can end the world... you just can't open a window.",
]
GAP = [0.32, 0.28, 0.28, 0.28, 0.3, 0.26, 0.4, 0.3, 0.32, 0.4, 0.0]  # pause after each line (s)
k = Kokoro(f"{M}/kokoro-v1.0.onnx", f"{M}/voices-v1.0.bin")
parts, sr = [], 24000
for i, line in enumerate(LINES):
    a, sr = k.create(line, voice="am_michael", speed=1.22, lang="en-us")
    idx = np.where(np.abs(a) > 0.01)[0]; a = a[max(0, idx[0] - 300): idx[-1] + 900]
    # squeeze long internal pauses (> 0.35 s) down to 0.3 s, but keep "..." beats at 0.45 s
    env = np.convolve(np.abs(a), np.ones(240) / 240, mode="same"); quiet = env < 0.008
    out, run = [], 0
    keep = int((0.45 if "..." in line else 0.3) * sr)
    for j, s in enumerate(a):
        run = run + 1 if quiet[j] else 0
        if run <= keep: out.append(s)
    parts.append(np.array(out, dtype=np.float32)); parts.append(np.zeros(int(GAP[i] * sr), np.float32))
voice = np.concatenate(parts); sf.write("voice2.wav", voice, sr)
m = WhisperModel("base.en", device="cpu", compute_type="int8")
words, off = [], 0.0
for i, line in enumerate(LINES):
    seg = parts[2 * i]
    ss, _ = m.transcribe(resample_poly(seg, 2, 3).astype(np.float32), word_timestamps=True, initial_prompt=line, condition_on_previous_text=False)
    lw = [w for s in ss for w in s.words]
    for w in lw: words.append({"w": w.word.strip(), "s": round(off + w.start, 3), "e": round(off + w.end, 3), "line": i + 1})
    print(f"L{i+1} @{round(off*30)}: " + " ".join(f'{w.word.strip()}@{round((off + w.start)*30)}' for w in lw))
    off += len(seg) / sr + GAP[i]
json.dump(words, open("words2.json", "w"), indent=0)
print("dur", round(len(voice) / sr, 2), "frames", round(len(voice) / sr * 30), "words", len(words))
