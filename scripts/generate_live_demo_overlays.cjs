const fs = require("fs");
const path = require("path");
const puppeteer = require("../tmp/e2e/node_modules/puppeteer-core");

const root = path.resolve(__dirname, "..");
const outDir = path.join(
  root,
  "release/submission_20260524/remotion_short/public/live-overlays"
);

const overlays = [
  { name: "title", text: "谁是大裁谜<br><span>朋友线上聚会，今天用剪刀开聊</span>", cls: "title bottom" },
  { name: "lobby", text: "先在泡泡大厅开一局", cls: "caption bottom" },
  { name: "share", text: "房间码一发，朋友就能进来围观抢答", cls: "small lower" },
  { name: "cut", text: "不是画，是剪", cls: "caption bottom" },
  { name: "unfold", text: "左边只剪折好的局部，右边马上展开成完整剪纸", cls: "small lower" },
  { name: "bubble_left_1", text: "我猜猫脸？", cls: "bubble left top yellow" },
  { name: "bubble_right_1", text: "不对吧，像葫芦！", cls: "bubble right top mint" },
  { name: "fold", text: "折线一换，图案立刻变样", cls: "caption bottom" },
  { name: "bubble_left_2", text: "快点快点，倒计时在跑！", cls: "bubble left low yellow" },
  { name: "finish", text: "点“完成了”，全场开猜", cls: "caption bottom" },
  { name: "bubble_right_2", text: "猜中啦！", cls: "bubble right low mint" },
  { name: "winner", text: "本局的大裁谜是：你", cls: "title bottom" },
  { name: "ending", text: "开房，剪纸，猜全图", cls: "caption bottom" },
];

function htmlFor(overlay) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html, body {
    margin: 0;
    width: 1280px;
    height: 720px;
    background: transparent;
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Noto Sans CJK SC", system-ui, sans-serif;
  }
  .box {
    position: absolute;
    box-sizing: border-box;
    border: 5px solid rgba(255,255,255,.96);
    border-radius: 30px;
    background: rgba(255,255,255,.84);
    color: #341322;
    box-shadow: 0 18px 40px rgba(83,37,55,.16);
    font-weight: 1000;
    letter-spacing: 0;
    text-align: center;
    white-space: pre-line;
  }
  .title {
    left: 50%;
    transform: translateX(-50%);
    min-width: 680px;
    padding: 21px 30px 25px;
    font-size: 60px;
    line-height: 1.08;
  }
  .title span {
    display: block;
    margin-top: 10px;
    color: #7b4b5e;
    font-size: 30px;
    line-height: 1.25;
    font-weight: 900;
  }
  .caption {
    left: 50%;
    transform: translateX(-50%);
    padding: 18px 28px 20px;
    font-size: 44px;
    line-height: 1.12;
  }
  .small {
    left: 50%;
    transform: translateX(-50%);
    padding: 14px 22px;
    color: #7b4b5e;
    font-size: 28px;
    line-height: 1.25;
    font-weight: 900;
  }
  .bottom { bottom: 46px; }
  .lower { bottom: 34px; }
  .bubble {
    padding: 13px 19px;
    border-radius: 999px;
    font-size: 30px;
    line-height: 1.1;
  }
  .left { left: 70px; }
  .right { right: 70px; }
  .top { top: 84px; }
  .low { bottom: 120px; }
  .yellow { background: rgba(255,216,105,.88); }
  .mint { background: rgba(117,226,201,.88); }
</style>
</head>
<body>
  <div class="box ${overlay.cls}">${overlay.text}</div>
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
  for (const overlay of overlays) {
    await page.setContent(htmlFor(overlay), { waitUntil: "load" });
    await page.screenshot({
      path: path.join(outDir, `${overlay.name}.png`),
      omitBackground: true,
    });
  }
  await browser.close();
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(overlays.map(({ name }) => name), null, 2)
  );
  console.log(outDir);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
