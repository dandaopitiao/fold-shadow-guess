const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "release/submission_20260524/premium_demo_voice");
const publicDir = path.join(root, "release/submission_20260524/remotion_short/public");

const segments = [
  { id: "01", start: 0.55, text: "这不是一支普通的你画我猜。" },
  { id: "02", start: 4.8, text: "这是《谁是大裁谜》。朋友进房，等着看你怎么剪。" },
  { id: "03", start: 10.0, text: "剪纸手只看得到题目，在折好的红纸上动刀。" },
  { id: "04", start: 15.7, text: "左边剪一小块，右边马上展开成完整图案。" },
  { id: "05", start: 22.1, text: "点完成，大家开始抢答。越早猜中，分越高。" },
  { id: "06", start: 29.8, text: "每局结算，本局的大裁谜直接揭晓。" },
  { id: "07", start: 36.7, text: "开房，剪纸，猜全图。把剪纸变成一场在线派对。" },
];

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.status !== 0) {
    throw new Error(`${command} failed with ${result.status}`);
  }
}

function env(name) {
  return process.env[name]?.trim();
}

async function tryDoubao(segment, mp3Path) {
  const appid = env("DOUBAO_APP_ID") || env("VOLCENGINE_TTS_APP_ID");
  const token =
    env("DOUBAO_ACCESS_KEY") ||
    env("DOUBAO_ACCESS_TOKEN") ||
    env("VOLCENGINE_TTS_TOKEN");
  const cluster = env("DOUBAO_CLUSTER") || env("VOLCENGINE_TTS_CLUSTER") || "volcano_tts";
  const voiceType = env("DOUBAO_VOICE_TYPE") || env("VOLCENGINE_TTS_VOICE_TYPE");
  if (!appid || !token || !voiceType) return false;

  const reqid = `cut-master-${segment.id}-${Date.now()}`;
  const response = await fetch("https://openspeech.bytedance.com/api/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer;${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app: { appid, token, cluster },
      user: { uid: "cut-master-demo" },
      audio: {
        voice_type: voiceType,
        encoding: "mp3",
        speed_ratio: 1.04,
        volume_ratio: 1.0,
        pitch_ratio: 1.0,
      },
      request: {
        reqid,
        text: segment.text,
        text_type: "plain",
        operation: "query",
      },
    }),
  });
  const json = await response.json();
  if (!response.ok || !json.data) {
    throw new Error(`Doubao TTS failed: ${JSON.stringify(json).slice(0, 500)}`);
  }
  fs.writeFileSync(mp3Path, Buffer.from(json.data, "base64"));
  return true;
}

async function synthesize() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const used = [];

  for (const segment of segments) {
    const mp3Path = path.join(outDir, `${segment.id}.mp3`);
    let provider = "doubao";
    try {
      const ok = await tryDoubao(segment, mp3Path);
      if (!ok) provider = "macos-say";
    } catch (error) {
      console.warn(String(error.message || error));
      provider = "macos-say";
    }

    if (provider === "macos-say") {
      const aiffPath = path.join(outDir, `${segment.id}.aiff`);
      run("say", ["-v", "Tingting", "-r", "192", "-o", aiffPath, segment.text]);
      run("ffmpeg", [
        "-y",
        "-i",
        aiffPath,
        "-ar",
        "44100",
        "-ac",
        "2",
        "-c:a",
        "libmp3lame",
        "-q:a",
        "2",
        mp3Path,
      ]);
    }
    used.push({ ...segment, file: mp3Path, provider });
  }

  fs.writeFileSync(path.join(outDir, "manifest.json"), JSON.stringify(used, null, 2));
  fs.copyFileSync(path.join(outDir, "manifest.json"), path.join(publicDir, "premium_voice_manifest.json"));
  console.log(JSON.stringify(used, null, 2));
}

synthesize().catch((error) => {
  console.error(error);
  process.exit(1);
});
