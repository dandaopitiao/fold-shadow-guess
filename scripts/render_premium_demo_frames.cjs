const fs = require("fs");
const path = require("path");
const puppeteer = require("../tmp/e2e/node_modules/puppeteer-core");

const root = path.resolve(__dirname, "..");
const frameDir = path.join(root, "release/submission_20260524/remotion_short/public/live-demo-frames");
const outDir = process.env.PREMIUM_FRAME_OUT || path.join(root, "release/submission_20260524/premium-demo-frames");
const fps = 15;
const duration = 44;
const total = fps * duration;

const manifest = JSON.parse(fs.readFileSync(path.join(frameDir, "manifest.json"), "utf8"));
const sourceFrames = manifest.frames;
const sourceFps = manifest.fps;

const scenes = [
  { start: 0, end: 4.2, kind: "title", title: "谁是大裁谜", sub: "剪纸版你画我猜" },
  { start: 4.2, end: 9.2, kind: "game", from: 0.2, to: 3.6, title: "进房", sub: "好友准备入场", textLeft: 76, textTop: 236, cardLeft: 420, cardTop: 126, cardWidth: 800, cardHeight: 450 },
  { start: 9.2, end: 15.3, kind: "game", from: 4.4, to: 9.6, title: "开剪", sub: "只剪折好的一半", textLeft: 76, textTop: 236, cardLeft: 420, cardTop: 126, cardWidth: 800, cardHeight: 450 },
  { start: 15.3, end: 21.7, kind: "game", from: 9.6, to: 13.0, title: "展开", sub: "一半变成完整图案", textLeft: 76, textTop: 236, cardLeft: 420, cardTop: 126, cardWidth: 800, cardHeight: 450 },
  { start: 21.7, end: 29.4, kind: "game", from: 13.0, to: 16.7, title: "抢答", sub: "猜中越早分越高", textLeft: 900, textTop: 236, cardLeft: 58, cardTop: 126, cardWidth: 800, cardHeight: 450 },
  { start: 29.4, end: 36.1, kind: "game", from: 13.8, to: 16.8, title: "结算", sub: "大裁谜揭晓", textLeft: 900, textTop: 236, cardLeft: 58, cardTop: 126, cardWidth: 800, cardHeight: 450 },
  { start: 36.1, end: 44.0, kind: "end", title: "开房", sub: "剪纸，猜全图" },
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
    object-fit: contain;
    background: #fffaf4;
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
    left: 50%;
    top: 312px;
    width: 920px;
    transform: translate(-50%, -50%);
    text-align: center;
    color: #341322;
    font-size: 64px;
    line-height: 1.06;
    font-weight: 1000;
    letter-spacing: 0;
  }
  #subline {
    position: absolute;
    left: 50%;
    top: 394px;
    width: 860px;
    transform: translateX(-50%);
    text-align: center;
    color: #7b4b5e;
    font-size: 28px;
    line-height: 1.26;
    font-weight: 900;
    letter-spacing: 0;
  }
  .softPanel {
    position: absolute;
    left: 88px;
    top: 116px;
    width: 300px;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    text-align: left;
  }
  #panelTitle {
    color: #341322;
    font-size: 82px;
    line-height: .94;
    font-weight: 1000;
  }
  #panelSub {
    margin-top: 18px;
    color: #7b4b5e;
    font-size: 28px;
    line-height: 1.22;
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
    bottom: 118px;
    text-align: center;
    color: #df2545;
    font-size: 34px;
    font-weight: 1000;
  }
  .spark {
    position: absolute;
    width: 170px;
    height: 170px;
    border-radius: 48px;
    background: rgba(255, 216, 105, .34);
    transform: rotate(18deg);
    filter: blur(.2px);
  }
  #spark1 { left: 288px; top: 78px; }
  #spark2 { right: 44px; bottom: 48px; background: rgba(117,226,201,.28); }
</style>
</head>
<body>
  <div class="stage">
    <div class="dots"></div>
    <div class="brand"><div class="mark">咔</div><div>谁是大裁谜</div></div>
    <div class="spark" id="spark1"></div>
    <div class="spark" id="spark2"></div>
    <div id="gameCard"><img id="game" /></div>
    <div class="softPanel" id="panel"><div id="panelTitle"></div><div id="panelSub"></div></div>
    <div id="headline"></div>
    <div id="subline"></div>
    <div id="url">LeonidasZhak.github.io/who-is-the-cut-master/</div>
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
      const spark1 = document.getElementById("spark1");
      const spark2 = document.getElementById("spark2");
      document.getElementById("panelTitle").textContent = payload.title || "";
      document.getElementById("panelSub").textContent = payload.sub || "";
      headline.textContent = payload.headline || "";
      subline.textContent = payload.endSub || "";
      url.style.display = payload.url ? "block" : "none";
      panel.style.display = payload.panel ? "block" : "none";
      panel.style.left = payload.textLeft + "px";
      panel.style.top = payload.textTop + "px";
      spark1.style.opacity = payload.decorOpacity;
      spark2.style.opacity = payload.decorOpacity;
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

  let browser;
  let page;
  async function openPage() {
    browser = await puppeteer.launch({
      headless: "new",
      executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      args: ["--no-sandbox"],
      defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
    });
    page = await browser.newPage();
    await page.setContent(html(), { waitUntil: "load" });
  }

  await openPage();

  for (let i = 0; i < total; i += 1) {
    if (i % 60 === 0) {
      console.log(`rendering premium frame ${i + 1}/${total}`);
    }
    if (i > 0 && i % 180 === 0) {
      await browser.close();
      await openPage();
    }
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
        decorOpacity: 1,
        textLeft: 0,
        textTop: 0,
        bubbles: [
          { text: "折", opacity: smooth(local), y: Math.sin(time * 3) * 6 },
          { text: "剪", opacity: smooth(local - 0.12), y: Math.sin(time * 2.7) * 6 },
          { text: "猜", opacity: smooth(local - 0.24), y: Math.sin(time * 2.4) * 6 },
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
        decorOpacity: 1,
        textLeft: 0,
        textTop: 0,
        bubbles: [
          { text: "在线", opacity: smooth(local - 0.18), y: Math.sin(time * 3) * 6 },
          { text: "派对", opacity: smooth(local - 0.3), y: Math.sin(time * 2.5) * 6 },
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
        textLeft: scene.textLeft,
        textTop: scene.textTop,
        left: scene.cardLeft,
        top: scene.cardTop,
        width: scene.cardWidth,
        height: scene.cardHeight,
        scale: 0.985 + smooth(local) * 0.012,
        cardOpacity: inOut,
        textOpacity: inOut,
        decorOpacity: 0.65,
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
