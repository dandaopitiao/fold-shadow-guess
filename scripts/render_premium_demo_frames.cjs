const fs = require("fs");
const path = require("path");
const puppeteer = require("../tmp/e2e/node_modules/puppeteer-core");

const root = path.resolve(__dirname, "..");
const frameDir = path.join(root, "release/submission_20260524/remotion_short/public/live-demo-frames");
const outDir = path.join(root, "release/submission_20260524/premium-demo-frames");
const fps = 15;
const duration = 44;
const total = fps * duration;

const manifest = JSON.parse(fs.readFileSync(path.join(frameDir, "manifest.json"), "utf8"));
const sourceFrames = manifest.frames;
const sourceFps = manifest.fps;

const scenes = [
  { start: 0, end: 4.2, kind: "title", title: "谁是大裁谜", sub: "不是画出来，是剪出来的你画我猜" },
  { start: 4.2, end: 9.2, kind: "game", from: 0.2, to: 4.2, title: "开房，一起猜", sub: "泡泡大厅进场，朋友等你开剪", focus: "wide" },
  { start: 9.2, end: 15.3, kind: "game", from: 4.8, to: 10.5, title: "剪纸手只看题目", sub: "其他人只能看过程，越猜越离谱", focus: "wide" },
  { start: 15.3, end: 21.7, kind: "game", from: 10.5, to: 15.7, title: "一刀展开成全图", sub: "左边局部开剪，右边实时预览", focus: "wide" },
  { start: 21.7, end: 29.4, kind: "game", from: 15.7, to: 19.0, title: "完成了，全场抢答", sub: "猜中顺序决定分数", focus: "result" },
  { start: 29.4, end: 36.1, kind: "game", from: 17.2, to: 19.0, title: "本局的大裁谜揭晓", sub: "下一局，换朋友上场剪", focus: "result" },
  { start: 36.1, end: 44.0, kind: "end", title: "开房，剪纸，猜全图", sub: "把中国剪纸，变成一场在线派对" },
];

function frameFile(seconds) {
  const index = Math.max(0, Math.min(sourceFrames - 1, Math.round(seconds * sourceFps)));
  return path.join(frameDir, `frame_${String(index).padStart(5, "0")}.jpg`);
}

function frameDataUrl(seconds) {
  return `data:image/jpeg;base64,${fs.readFileSync(frameFile(seconds)).toString("base64")}`;
}

function sceneAt(time) {
  return scenes.find((scene) => time >= scene.start && time < scene.end) || scenes[scenes.length - 1];
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function smooth(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function html() {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0;
    width: 1280px;
    height: 720px;
    overflow: hidden;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Noto Sans CJK SC", system-ui, sans-serif;
    background: #fff7ea;
  }
  .stage {
    position: relative;
    width: 1280px;
    height: 720px;
    background:
      radial-gradient(circle at 15% 12%, rgba(255,216,105,.48), transparent 28%),
      radial-gradient(circle at 86% 16%, rgba(140,202,255,.36), transparent 30%),
      linear-gradient(135deg, #fff8ea 0%, #fff1f5 54%, #eff9ff 100%);
  }
  .dots {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle, rgba(255,73,100,.14) 0 4px, transparent 5px);
    background-size: 80px 80px;
    opacity: .46;
  }
  #gameCard {
    position: absolute;
    overflow: hidden;
    border: 8px solid rgba(255,255,255,.98);
    border-radius: 38px;
    background: #fff;
    box-shadow: 0 30px 74px rgba(70,30,48,.2);
  }
  #game {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .brand {
    position: absolute;
    left: 70px;
    top: 52px;
    display: flex;
    align-items: center;
    gap: 16px;
    color: #7b4b5e;
    font-weight: 1000;
    font-size: 24px;
  }
  .mark {
    width: 58px;
    height: 58px;
    display: grid;
    place-items: center;
    border: 6px solid #fff;
    border-radius: 20px;
    background: #ff4964;
    color: #fff;
    box-shadow: 0 10px 0 rgba(61,23,39,.13);
    transform: rotate(-7deg);
    font-size: 30px;
  }
  #headline {
    position: absolute;
    left: 72px;
    right: 72px;
    bottom: 54px;
    text-align: center;
    color: #341322;
    font-size: 64px;
    line-height: 1.06;
    font-weight: 1000;
    letter-spacing: 0;
  }
  #subline {
    position: absolute;
    left: 120px;
    right: 120px;
    bottom: 28px;
    text-align: center;
    color: #7b4b5e;
    font-size: 28px;
    line-height: 1.26;
    font-weight: 900;
    letter-spacing: 0;
  }
  .softPanel {
    position: absolute;
    left: 50%;
    bottom: 48px;
    transform: translateX(-50%);
    max-width: 930px;
    padding: 20px 30px 23px;
    border: 5px solid rgba(255,255,255,.96);
    border-radius: 32px;
    background: rgba(255,255,255,.86);
    box-shadow: 0 18px 42px rgba(83,37,55,.15);
    text-align: center;
  }
  #panelTitle {
    color: #341322;
    font-size: 50px;
    line-height: 1.08;
    font-weight: 1000;
  }
  #panelSub {
    margin-top: 8px;
    color: #7b4b5e;
    font-size: 27px;
    line-height: 1.28;
    font-weight: 900;
  }
  .bubble {
    position: absolute;
    padding: 13px 18px;
    border-radius: 999px;
    border: 5px solid rgba(255,255,255,.96);
    color: #341322;
    font-size: 26px;
    font-weight: 1000;
    box-shadow: 0 16px 30px rgba(83,37,55,.14), inset 8px 8px 16px rgba(255,255,255,.35);
  }
  #b1 { left: 72px; top: 116px; background: rgba(255,216,105,.86); }
  #b2 { right: 74px; top: 118px; background: rgba(117,226,201,.82); }
  #b3 { right: 84px; bottom: 150px; background: rgba(182,164,255,.76); }
  #url {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 126px;
    text-align: center;
    color: #df2545;
    font-size: 34px;
    font-weight: 1000;
  }
</style>
</head>
<body>
  <div class="stage">
    <div class="dots"></div>
    <div class="brand"><div class="mark">咔</div><div>谁是大裁谜</div></div>
    <div id="gameCard"><img id="game" /></div>
    <div class="softPanel" id="panel"><div id="panelTitle"></div><div id="panelSub"></div></div>
    <div id="headline"></div>
    <div id="subline"></div>
    <div id="url">dandaopitiao.github.io/fold-shadow-guess/</div>
    <div class="bubble" id="b1"></div>
    <div class="bubble" id="b2"></div>
    <div class="bubble" id="b3"></div>
  </div>
  <script>
    window.setScene = (payload) => {
      const card = document.getElementById("gameCard");
      const img = document.getElementById("game");
      const panel = document.getElementById("panel");
      const headline = document.getElementById("headline");
      const subline = document.getElementById("subline");
      const url = document.getElementById("url");
      const b1 = document.getElementById("b1");
      const b2 = document.getElementById("b2");
      const b3 = document.getElementById("b3");
      document.getElementById("panelTitle").textContent = payload.title || "";
      document.getElementById("panelSub").textContent = payload.sub || "";
      headline.textContent = payload.headline || "";
      subline.textContent = payload.endSub || "";
      url.style.display = payload.url ? "block" : "none";
      panel.style.display = payload.panel ? "block" : "none";
      headline.style.display = payload.headline ? "block" : "none";
      subline.style.display = payload.endSub ? "block" : "none";
      card.style.display = payload.img ? "block" : "none";
      if (payload.img) img.src = payload.img;
      card.style.left = payload.left + "px";
      card.style.top = payload.top + "px";
      card.style.width = payload.width + "px";
      card.style.height = payload.height + "px";
      card.style.opacity = payload.cardOpacity;
      card.style.transform = "scale(" + payload.scale + ")";
      panel.style.opacity = payload.textOpacity;
      headline.style.opacity = payload.textOpacity;
      subline.style.opacity = payload.textOpacity;
      [b1, b2, b3].forEach((node, idx) => {
        const bubble = payload.bubbles[idx];
        node.style.display = bubble ? "block" : "none";
        if (bubble) {
          node.textContent = bubble.text;
          node.style.opacity = bubble.opacity;
          node.style.transform = "translateY(" + bubble.y + "px)";
        }
      });
    };
  </script>
</body>
</html>`;
}

async function main() {
  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox"],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  await page.setContent(html(), { waitUntil: "load" });

  for (let i = 0; i < total; i += 1) {
    const time = i / fps;
    const scene = sceneAt(time);
    const local = (time - scene.start) / (scene.end - scene.start);
    const inOut = Math.min(smooth(local / 0.16), smooth((1 - local) / 0.12));
    let payload;

    if (scene.kind === "title") {
      payload = {
        img: null,
        panel: false,
        headline: scene.title,
        endSub: scene.sub,
        url: false,
        title: "",
        sub: "",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        scale: 1,
        cardOpacity: 0,
        textOpacity: inOut,
        bubbles: [
          { text: "开房", opacity: smooth(local), y: Math.sin(time * 3) * 6 },
          { text: "抢答", opacity: smooth(local - 0.12), y: Math.sin(time * 2.7) * 6 },
          { text: "展开", opacity: smooth(local - 0.24), y: Math.sin(time * 2.4) * 6 },
        ],
      };
    } else if (scene.kind === "end") {
      payload = {
        img: null,
        panel: false,
        headline: scene.title,
        endSub: scene.sub,
        url: true,
        title: "",
        sub: "",
        left: 0,
        top: 0,
        width: 0,
        height: 0,
        scale: 1,
        cardOpacity: 0,
        textOpacity: inOut,
        bubbles: [
          { text: "下一局换你剪", opacity: smooth(local - 0.18), y: Math.sin(time * 3) * 6 },
          { text: "本局的大裁谜是谁？", opacity: smooth(local - 0.3), y: Math.sin(time * 2.5) * 6 },
          null,
        ],
      };
    } else {
      const sourceTime = lerp(scene.from, scene.to, smooth(local));
      const img = frameDataUrl(sourceTime);
      payload = {
        img,
        panel: true,
        headline: "",
        endSub: "",
        url: false,
        title: scene.title,
        sub: scene.sub,
        left: 70,
        top: 58,
        width: 1140,
        height: 641,
        scale: 0.985 + smooth(local) * 0.018,
        cardOpacity: inOut,
        textOpacity: inOut,
        bubbles: [
          time > 11 && time < 15.2 ? { text: "我猜猫脸？", opacity: 1, y: Math.sin(time * 4) * 5 } : null,
          time > 13.6 && time < 18.5 ? { text: "像葫芦！", opacity: 1, y: Math.sin(time * 3) * 5 } : null,
          time > 24 && time < 29 ? { text: "猜中啦！", opacity: 1, y: Math.sin(time * 3.6) * 5 } : null,
        ],
      };
    }

    await page.evaluate((next) => window.setScene(next), payload);
    if (payload.img) {
      await page.waitForFunction(
        () => {
          const img = document.getElementById("game");
          return img && img.complete && img.naturalWidth > 0;
        },
        { timeout: 5000 }
      );
    }
    await page.screenshot({
      path: path.join(outDir, `frame_${String(i).padStart(5, "0")}.jpg`),
      type: "jpeg",
      quality: 90,
      captureBeyondViewport: false,
    });
  }

  await browser.close();
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify({ fps, duration, frames: total, sourceFrames }, null, 2)
  );
  console.log(JSON.stringify({ fps, duration, frames: total }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
