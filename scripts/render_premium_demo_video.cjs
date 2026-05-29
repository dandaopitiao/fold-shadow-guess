const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const releaseDir = path.join(root, "release/submission_20260524");
const framesDir = path.join(releaseDir, "premium-demo-frames");
const publicDir = path.join(releaseDir, "remotion_short/public");
const voiceDir = path.join(releaseDir, "premium_demo_voice");
const silentPath = path.join(releaseDir, "premium_demo_silent.mp4");
const bedWavPath = path.join(publicDir, "premium_bed.wav");
const outputPath = path.join(releaseDir, "谁是大裁谜_live_demo_premium.mp4");
const finalLivePath = path.join(releaseDir, "谁是大裁谜_live_demo.mp4");
const finalShortPath = path.join(releaseDir, "谁是大裁谜_remotion_short.mp4");

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`${command} failed with ${result.status}`);
  }
}

const framesManifest = JSON.parse(fs.readFileSync(path.join(framesDir, "manifest.json"), "utf8"));
const voiceManifest = JSON.parse(fs.readFileSync(path.join(voiceDir, "manifest.json"), "utf8"));

run("ffmpeg", [
  "-y",
  "-framerate",
  String(framesManifest.fps),
  "-i",
  path.join(framesDir, "frame_%05d.jpg"),
  "-vf",
  "fps=30,format=yuv420p",
  "-c:v",
  "libx264",
  "-crf",
  "16",
  "-preset",
  "medium",
  "-pix_fmt",
  "yuv420p",
  silentPath,
]);

const inputs = ["-y", "-i", silentPath, "-i", bedWavPath];
for (const segment of voiceManifest) {
  inputs.push("-i", segment.file);
}

const filters = [
  `[1:a]atrim=0:${framesManifest.duration},volume=0.22,afade=t=in:st=0:d=1.0,afade=t=out:st=${framesManifest.duration - 2.6}:d=2.6[bed]`,
];
const mixLabels = ["[bed]"];
voiceManifest.forEach((segment, index) => {
  const inputIndex = index + 2;
  const delay = Math.round(segment.start * 1000);
  filters.push(`[${inputIndex}:a]adelay=${delay}|${delay},volume=1.18[v${index}]`);
  mixLabels.push(`[v${index}]`);
});
filters.push(
  `${mixLabels.join("")}amix=inputs=${mixLabels.length}:duration=longest:normalize=0,atrim=0:${framesManifest.duration},alimiter=limit=0.95[a]`
);

run("ffmpeg", [
  ...inputs,
  "-filter_complex",
  filters.join(";"),
  "-map",
  "0:v",
  "-map",
  "[a]",
  "-c:v",
  "copy",
  "-c:a",
  "aac",
  "-b:a",
  "192k",
  "-shortest",
  outputPath,
]);

fs.copyFileSync(outputPath, finalLivePath);
fs.copyFileSync(outputPath, finalShortPath);
console.log(outputPath);
