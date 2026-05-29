const fs = require("fs");
const path = require("path");

const puppeteer = require("../tmp/e2e/node_modules/puppeteer-core");

const root = path.resolve(__dirname, "..");
const outDir = path.join(
  root,
  "release/submission_20260524/remotion_short/public/live-demo-frames"
);
const url = process.env.DEMO_URL || "http://127.0.0.1:4173/";
const fps = Number(process.env.DEMO_FPS || 15);
const interval = Math.round(1000 / fps);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function resetDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

async function drawPath(page, svgBox, points, duration = 900) {
  const [first, ...rest] = points;
  await page.mouse.move(svgBox.x + first[0] * svgBox.width, svgBox.y + first[1] * svgBox.height);
  await page.mouse.down();
  const perPoint = duration / Math.max(1, rest.length);
  for (const point of rest) {
    await page.mouse.move(svgBox.x + point[0] * svgBox.width, svgBox.y + point[1] * svgBox.height, {
      steps: 7,
    });
    await sleep(perPoint);
  }
  await page.mouse.up();
  await sleep(260);
}

function ellipsePoints(cx, cy, rx, ry, steps = 44) {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry];
  });
}

async function main() {
  resetDir(outDir);

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
    defaultViewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  let frame = 0;
  let recording = true;
  const capture = async () => {
    while (recording) {
      const name = `frame_${String(frame).padStart(5, "0")}.jpg`;
      try {
        await page.screenshot({
          path: path.join(outDir, name),
          type: "jpeg",
          quality: 88,
          captureBeyondViewport: false,
        });
      } catch (error) {
        if (!recording || String(error).includes("TargetCloseError")) break;
        throw error;
      }
      frame += 1;
      await sleep(interval);
    }
  };

  const navigation = page
    .goto(url, { waitUntil: "domcontentloaded", timeout: 0 })
    .catch(() => undefined);
  await Promise.race([navigation, sleep(3000)]);
  await page.waitForSelector(".hero-start-button", { timeout: 10_000 });
  await page.evaluate(() => {
    let calls = 0;
    const originalRandom = Math.random;
    Math.random = () => {
      calls += 1;
      if (calls < 12) return 0.105;
      return originalRandom();
    };
  });

  const capturePromise = capture();

  await sleep(2600);
  await page.mouse.move(230, 210, { steps: 10 });
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
  await sleep(650);
  await page.mouse.move(1020, 230, { steps: 12 });
  await page.mouse.down();
  await sleep(90);
  await page.mouse.up();
  await sleep(1200);

  await page.click(".hero-start-button");
  await page.waitForSelector(".draw-surface", { timeout: 10_000 });
  await sleep(1400);

  const box = await page.$eval(".draw-surface", (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });

  // Draw a clean butterfly-like paper cut: two rounded wing cuts plus a slim body.
  await drawPath(page, box, [
    [0.485, 0.28],
    [0.458, 0.215],
    [0.398, 0.185],
    [0.322, 0.202],
    [0.265, 0.275],
    [0.257, 0.365],
    [0.314, 0.435],
    [0.396, 0.432],
    [0.462, 0.365],
    [0.485, 0.28],
  ], 1100);
  await sleep(640);
  await drawPath(page, box, [
    [0.478, 0.535],
    [0.424, 0.492],
    [0.340, 0.510],
    [0.284, 0.585],
    [0.295, 0.692],
    [0.382, 0.748],
    [0.458, 0.687],
    [0.492, 0.604],
    [0.478, 0.535],
  ], 1050);
  await sleep(900);
  await drawPath(page, box, ellipsePoints(0.487, 0.505, 0.012, 0.19, 42), 900);
  await sleep(900);
  await drawPath(page, box, ellipsePoints(0.355, 0.318, 0.018, 0.026, 28), 640);
  await sleep(560);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      (node.textContent || "").includes("完成了")
    );
    button?.click();
  });
  await sleep(6200);

  await sleep(2600);
  recording = false;
  await capturePromise;
  await browser.close();

  const manifest = {
    url,
    fps,
    frames: frame,
    durationSeconds: Number((frame / fps).toFixed(2)),
    errors,
  };
  fs.writeFileSync(
    path.join(outDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );
  if (errors.length > 0) {
    console.error(JSON.stringify(manifest, null, 2));
    process.exitCode = 2;
    return;
  }
  console.log(JSON.stringify(manifest, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
