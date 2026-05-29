const fs = require("fs");
const path = require("path");

const outPath = path.resolve(
  __dirname,
  "../release/submission_20260524/remotion_short/public/paper_party_music.wav"
);

const sampleRate = 44100;
const duration = 36;
const total = Math.floor(sampleRate * duration);
const bpm = 132;
const beat = 60 / bpm;
const channels = 2;
const data = new Float32Array(total * channels);

const notes = {
  C4: 261.63,
  D4: 293.66,
  E4: 329.63,
  G4: 392.0,
  A4: 440.0,
  C5: 523.25,
  D5: 587.33,
  E5: 659.25,
  G5: 783.99,
};

function addStereo(index, value, pan = 0) {
  if (index < 0 || index >= total) return;
  const left = Math.cos((pan + 1) * Math.PI / 4);
  const right = Math.sin((pan + 1) * Math.PI / 4);
  data[index * 2] += value * left;
  data[index * 2 + 1] += value * right;
}

function pluck(start, freq, length, gain, pan = 0, bright = 0.35) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(length * sampleRate);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const env = Math.exp(-t * 7.2) * Math.min(1, t * 80);
    const shimmer = Math.sin(2 * Math.PI * freq * 2 * t) * bright;
    const body = Math.sin(2 * Math.PI * freq * t);
    addStereo(startSample + i, (body + shimmer) * env * gain, pan);
  }
}

function kick(start) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(0.18 * sampleRate);
  for (let i = 0; i < samples; i += 1) {
    const t = i / sampleRate;
    const freq = 105 - 62 * Math.min(1, t / 0.16);
    const env = Math.exp(-t * 18);
    addStereo(startSample + i, Math.sin(2 * Math.PI * freq * t) * env * 0.28, 0);
  }
}

function hat(start, gain = 0.045) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(0.055 * sampleRate);
  let seed = 17;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed * 16807) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 55);
    addStereo(startSample + i, noise * env * gain, 0.55);
  }
}

function clap(start) {
  const startSample = Math.floor(start * sampleRate);
  const samples = Math.floor(0.14 * sampleRate);
  let seed = 91;
  for (let i = 0; i < samples; i += 1) {
    seed = (seed * 48271) % 2147483647;
    const noise = (seed / 2147483647) * 2 - 1;
    const t = i / sampleRate;
    const env = Math.exp(-t * 22) * Math.min(1, t * 60);
    addStereo(startSample + i, noise * env * 0.075, -0.25);
  }
}

const progression = [
  [notes.C4, notes.E4, notes.G4, notes.C5],
  [notes.G4, notes.C5, notes.D5, notes.G5],
  [notes.A4, notes.C5, notes.E5, notes.G5],
  [notes.C4, notes.E4, notes.A4, notes.C5],
];
const melody = [notes.E5, notes.G5, notes.E5, notes.D5, notes.C5, notes.D5, notes.E5, notes.G5];

for (let bar = 0; bar < Math.ceil(duration / (beat * 4)); bar += 1) {
  const barStart = bar * beat * 4;
  const chord = progression[bar % progression.length];
  for (let step = 0; step < 8; step += 1) {
    const t = barStart + step * beat * 0.5;
    if (t >= duration) continue;
    const note = chord[step % chord.length];
    pluck(t, note, 0.42, 0.065, step % 2 ? 0.35 : -0.35, 0.48);
    if (step % 2 === 0) {
      pluck(t + 0.05, melody[(bar + step) % melody.length], 0.22, 0.055, 0.18, 0.55);
    }
  }
  for (let b = 0; b < 4; b += 1) {
    const t = barStart + b * beat;
    if (t < duration) kick(t);
    if (t + beat * 0.5 < duration) hat(t + beat * 0.5);
    if (b === 1 || b === 3) clap(t + beat * 0.02);
  }
}

for (let i = 0; i < data.length; i += 1) {
  data[i] = Math.max(-0.95, Math.min(0.95, data[i]));
}

const byteRate = sampleRate * channels * 2;
const blockAlign = channels * 2;
const wav = Buffer.alloc(44 + total * channels * 2);
wav.write("RIFF", 0);
wav.writeUInt32LE(wav.length - 8, 4);
wav.write("WAVE", 8);
wav.write("fmt ", 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(channels, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(byteRate, 28);
wav.writeUInt16LE(blockAlign, 32);
wav.writeUInt16LE(16, 34);
wav.write("data", 36);
wav.writeUInt32LE(total * channels * 2, 40);
for (let i = 0; i < total * channels; i += 1) {
  wav.writeInt16LE(Math.round(data[i] * 32767), 44 + i * 2);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, wav);
console.log(outPath);
