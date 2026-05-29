const fs = require("fs");
const path = require("path");

const outPath = path.resolve(
  __dirname,
  "../release/submission_20260524/remotion_short/public/premium_bed.wav"
);

const sampleRate = 44100;
const duration = 45;
const total = Math.floor(sampleRate * duration);
const channels = 2;
const data = new Float32Array(total * channels);

function add(index, value, pan = 0) {
  if (index < 0 || index >= total) return;
  const left = Math.cos((pan + 1) * Math.PI / 4);
  const right = Math.sin((pan + 1) * Math.PI / 4);
  data[index * 2] += value * left;
  data[index * 2 + 1] += value * right;
}

function tone(start, freq, len, gain, pan = 0, type = "sine") {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(len * sampleRate);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const a = Math.sin(2 * Math.PI * freq * t);
    const b = Math.sin(2 * Math.PI * freq * 2 * t) * 0.24;
    const wave = type === "triangle" ? (2 / Math.PI) * Math.asin(a) : a + b;
    const attack = Math.min(1, t * 20);
    const release = Math.min(1, (len - t) * 5);
    const env = attack * release * Math.exp(-t * 1.1);
    add(startSample + i, wave * env * gain, pan);
  }
}

function pluck(start, freq, len, gain, pan = 0) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(len * sampleRate);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 6.8) * Math.min(1, t * 90);
    const wave =
      Math.sin(2 * Math.PI * freq * t) +
      0.35 * Math.sin(2 * Math.PI * freq * 2 * t) +
      0.16 * Math.sin(2 * Math.PI * freq * 3 * t);
    add(startSample + i, wave * env * gain, pan);
  }
}

function noiseBurst(start, len, gain, pan = 0, decay = 30) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(len * sampleRate);
  let seed = 321;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const noise = seed / 2147483647 * 2 - 1;
    const t = i / sampleRate;
    add(startSample + i, noise * Math.exp(-t * decay) * gain, pan);
  }
}

function click(start, pan = 0) {
  noiseBurst(start, 0.045, 0.045, pan, 72);
  tone(start, 1200, 0.035, 0.025, pan);
}

function scissor(start) {
  noiseBurst(start, 0.09, 0.07, -0.35, 36);
  noiseBurst(start + 0.07, 0.08, 0.055, 0.25, 34);
}

function whoosh(start) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(0.55 * sampleRate);
  let seed = 999;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed * 48271) % 2147483647;
    const noise = seed / 2147483647 * 2 - 1;
    const t = i / sampleRate;
    const env = Math.sin(Math.PI * t / 0.55) ** 2;
    const sweep = Math.sin(2 * Math.PI * (280 + 900 * t) * t) * 0.25;
    add(startSample + i, (noise * 0.08 + sweep) * env * 0.12, 0);
  }
}

function chime(start) {
  [659.25, 783.99, 1046.5].forEach((freq, index) => {
    pluck(start + index * 0.085, freq, 1.2, 0.06, index === 1 ? 0.2 : -0.1);
  });
}

const bpm = 104;
const beat = 60 / bpm;
const chords = [
  [261.63, 329.63, 392.0, 523.25],
  [293.66, 349.23, 440.0, 587.33],
  [329.63, 392.0, 493.88, 659.25],
  [261.63, 349.23, 440.0, 523.25],
];

for (let bar = 0; bar < Math.ceil(duration / (beat * 4)); bar += 1) {
  const base = bar * beat * 4;
  const chord = chords[bar % chords.length];
  chord.forEach((freq, idx) => tone(base, freq, beat * 3.5, 0.018, (idx - 1.5) * 0.25));
  for (let step = 0; step < 8; step += 1) {
    const t = base + step * beat * 0.5;
    if (t > duration) continue;
    if (step % 2 === 0) pluck(t, chord[(step / 2) % chord.length] * 2, 0.6, 0.038, step % 4 ? 0.3 : -0.3);
    if (step % 4 === 2) noiseBurst(t, 0.05, 0.018, 0.42, 52);
  }
}

[
  4.4, 7.9, 10.5, 11.2, 12.0, 13.6, 15.4, 18.4, 21.6, 23.8, 28.9, 35.8,
].forEach((t, index) => click(t, index % 2 ? 0.28 : -0.28));
[11.1, 13.7, 16.0, 18.2].forEach(scissor);
[8.8, 20.7, 28.0, 36.0].forEach(whoosh);
[24.0, 30.0, 39.5].forEach(chime);

for (let i = 0; i < data.length; i += 1) {
  data[i] = Math.max(-0.96, Math.min(0.96, data[i]));
}

const wav = Buffer.alloc(44 + total * channels * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * channels * 2, 28);
wav.writeUInt16LE(channels * 2, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(total * channels * 2, 40);
for (let i = 0; i < total * channels; i += 1) {
  wav.writeInt16LE(Math.round(data[i] * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, wav);
console.log(outPath);
