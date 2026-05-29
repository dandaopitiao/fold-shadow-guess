const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const publicDir = path.join(root, "release/submission_20260524/remotion_short/public");
const overlayDir = path.join(publicDir, "live-overlays");
const out = path.join(root, "release/submission_20260524/谁是大裁谜_live_demo.mp4");
const legacyOut = path.join(root, "release/submission_20260524/谁是大裁谜_remotion_short.mp4");

const overlays = [
  { file: "title.png", start: 0.15, end: 3.0 },
  { file: "lobby.png", start: 3.1, end: 6.4 },
  { file: "share.png", start: 5.25, end: 8.5 },
  { file: "cut.png", start: 7.1, end: 12.2 },
  { file: "unfold.png", start: 9.1, end: 15.0 },
  { file: "bubble_left_1.png", start: 10.2, end: 13.6 },
  { file: "bubble_right_1.png", start: 12.7, end: 16.3 },
  { file: "fold.png", start: 15.3, end: 20.6 },
  { file: "bubble_left_2.png", start: 17.1, end: 20.8 },
  { file: "finish.png", start: 20.8, end: 24.7 },
  { file: "bubble_right_2.png", start: 22.8, end: 26.1 },
  { file: "winner.png", start: 25.0, end: 28.0 },
  { file: "ending.png", start: 28.1, end: 30.0 },
];

for (const overlay of overlays) {
  const file = path.join(overlayDir, overlay.file);
  if (!fs.existsSync(file)) {
    throw new Error(`Missing overlay: ${file}`);
  }
}

const args = [
  "-y",
  "-i", path.join(publicDir, "live_gameplay.mp4"),
  "-stream_loop", "-1",
  "-i", path.join(publicDir, "paper_party_music.mp3"),
  "-i", path.join(publicDir, "live_demo_voice.mp3"),
];

for (const overlay of overlays) {
  args.push("-loop", "1", "-t", "30", "-i", path.join(overlayDir, overlay.file));
}

let filter =
  "[0:v]setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration=11,trim=duration=30,scale=1280:720,format=yuv420p[base];";
let current = "base";
overlays.forEach((overlay, index) => {
  const input = index + 3;
  const next = `v${index}`;
  filter += `[${current}][${input}:v]overlay=0:0:enable='between(t,${overlay.start},${overlay.end})'[${next}];`;
  current = next;
});
filter +=
  `[${current}]format=yuv420p[v];` +
  "[1:a]atrim=0:30,asetpts=PTS-STARTPTS,volume=0.26,afade=t=in:st=0:d=0.8,afade=t=out:st=28:d=2[m];" +
  "[2:a]adelay=1450|1450,volume=1.0[voc];" +
  "[m][voc]amix=inputs=2:duration=longest:normalize=0,atrim=0:30,alimiter=limit=0.95[a]";

args.push(
  "-filter_complex", filter,
  "-map", "[v]",
  "-map", "[a]",
  "-c:v", "libx264",
  "-crf", "17",
  "-pix_fmt", "yuv420p",
  "-c:a", "aac",
  "-b:a", "192k",
  "-movflags", "+faststart",
  out
);

const result = spawnSync("ffmpeg", args, { stdio: "inherit" });
if (result.status !== 0) process.exit(result.status || 1);
fs.copyFileSync(out, legacyOut);
console.log(out);
