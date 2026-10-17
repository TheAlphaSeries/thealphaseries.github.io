# An original piece for Half Life: a lone flute over harp, strings joining on the second pass. A minor, 3/4, 72 bpm.
import numpy as np, wave
from scipy.signal import fftconvolve, butter, lfilter
SR = 44100; BPM = 72; BEAT = 60 / BPM; BAR = BEAT * 3
rng = np.random.default_rng(3)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def hz(n):
    m = n[0]; acc = 1 if '#' in n else -1 if (len(n) > 2 and n[1] == 'b') else 0; o = int(n[-1])
    return 440 * 2 ** ((NOTE[m] + acc + (o + 1) * 12 - 69) / 12)
CHORDS = [['A2','E3','A3','C4','E4'], ['G2','E3','A3','C4','E4'], ['F2','C3','F3','A3','C4'], ['E2','B2','E3','G#3','B3'],
          ['A2','E3','A3','C4','E4'], ['G2','D3','G3','B3','D4'], ['F2','C3','F3','A3','C4'], ['E2','B2','E3','G#3','B3'],
          ['D2','A2','D3','F3','A3'], ['A2','E3','A3','C4','E4'], ['F2','C3','F3','A3','C4'], ['C3','G3','C4','E4','G4'],
          ['D2','A2','D3','F3','A3'], ['E2','B2','E3','G#3','B3'], ['A2','E3','A3','C4','E4'], ['E2','B2','E3','G#3','B3']]
TUNE = [[('E5',2),('A4',1)], [('C5',1.5),('B4',.5),('A4',1)], [('A4',2),('C5',1)], [('B4',3)],
        [('E5',2),('A5',1)], [('G5',1.5),('F5',.5),('E5',1)], [('F5',1),('E5',1),('D5',1)], [('E5',3)],
        [('D5',2),('F5',1)], [('E5',1.5),('C5',.5),('A4',1)], [('C5',1),('D5',1),('E5',1)], [('G5',2),('E5',1)],
        [('F5',1.5),('E5',.5),('D5',1)], [('B4',1),('G#4',1),('B4',1)], [('A4',3)], [(None,2),('E5',1)]]
PASSES = 2; LOOP = len(CHORDS) * BAR * PASSES; TAIL = 5.0
L = int((LOOP + TAIL) * SR)
flute = np.zeros(L); harp = np.zeros(L); strings = np.zeros(L)
def lp(x, fc, order=2): b, a = butter(order, fc / (SR / 2)); return lfilter(b, a, x)
def bp(x, lo, hi): b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)

def flute_note(f, t0, dur, vel=1.0):
    n = int((dur + .25) * SR); t = np.arange(n) / SR
    vib = 1 + 0.0045 * np.sin(2 * np.pi * 5.1 * t + rng.random() * 6) * np.clip((t - .25) / .5, 0, 1)
    ph = 2 * np.pi * np.cumsum(f * vib) / SR
    tone = np.sin(ph) + .32 * np.sin(2 * ph) + .11 * np.sin(3 * ph) + .04 * np.sin(4 * ph)
    breath = bp(rng.standard_normal(n), f * .8, min(f * 3.5, 15000)) * .09
    chiff = bp(rng.standard_normal(n), 1500, 6000) * np.exp(-t / .03) * .25
    env = np.clip(t / .08, 0, 1) * (1 + .12 * np.clip(t / max(dur, .1), 0, 1)) * np.clip((dur + .12 - t) / .18, 0, 1)
    x = (tone + breath + chiff) * env * .22 * vel
    i = int(t0 * SR); flute[i:i + n] += x[:L - i]

def harp_note(f, t0, vel):
    n = int(4.5 * SR); t = np.arange(n) / SR
    x = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.1 + k * .9)) for k, a in ((1, 1), (2, .45), (3, .22), (4, .1), (5, .05)))
    x *= np.clip(t / .004, 0, 1) * vel * .12
    i = int(t0 * SR); harp[i:i + n] += x[:L - i]

def string_chord(notes, t0, dur):
    n = int((dur + 1.5) * SR); t = np.arange(n) / SR; x = np.zeros(n)
    for nt in notes[1:4]:
        f = hz(nt) * 2
        for det in (-.004, .003):
            ph = 2 * np.pi * f * (1 + det) * t
            x += sum(np.sin(k * ph) / k for k in range(1, 7))
    x = lp(x, 1800); env = np.clip(t / 1.2, 0, 1) * np.clip((dur + .8 - t) / 1.4, 0, 1)
    x *= env * .012
    i = int(t0 * SR); strings[i:i + n] += x[:L - i]

for p in range(PASSES):
    for b, (ch, mel) in enumerate(zip(CHORDS, TUNE)):
        t0 = (p * len(CHORDS) + b) * BAR
        # harp: an arpeggio in eighths, root first, up and back
        seq = [ch[0], ch[1], ch[2], ch[3], ch[4], ch[3]]
        for k, nt in enumerate(seq):
            harp_note(hz(nt), t0 + k * BEAT / 2 + rng.random() * .008, (1.0 if k == 0 else .62) * (.85 + .15 * rng.random()))
        if p == 1: string_chord(ch, t0, BAR)
        at = t0
        for nt, beats in mel:
            d = beats * BEAT
            if nt: flute_note(hz(nt), at, d * .97, 1.0 if p == 0 else 1.08)
            at += d
# the room: a hall of four seconds, softened
ir_n = int(4 * SR); tt = np.arange(ir_n) / SR
irL = rng.standard_normal(ir_n) * np.exp(-tt / .9); irR = rng.standard_normal(ir_n) * np.exp(-tt / .9)
irL, irR = lp(irL, 5000), lp(irR, 5000)
dry = flute * 1.0 + harp + strings
pan = lambda x, p: (x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4))
fl, fr = pan(flute, .1); hl, hr = pan(harp, -.25); sl, sr_ = pan(strings, .2)
Ld, Rd = fl + hl + sl, fr + hr + sr_
send = flute * .5 + harp * .35 + strings * .6
wl = fftconvolve(send, irL)[:L] * .045; wr = fftconvolve(send, irR)[:L] * .045
outL, outR = Ld + wl, Rd + wr
# fold the tail back onto the start so it loops without a seam
n = int(LOOP * SR)
outL[:L - n] += outL[n:]; outR[:L - n] += outR[n:]
outL, outR = outL[:n], outR[:n]
peak = max(np.abs(outL).max(), np.abs(outR).max()); g = .7 / peak
st = np.stack([outL * g, outR * g], 1)
with wave.open('theme.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print('seconds', round(n / SR, 1), 'rms dB', round(20 * np.log10(np.sqrt((st ** 2).mean())), 1))
