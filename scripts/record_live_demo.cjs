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
      await page.screenshot({
        path: path.join(outDir, name),
        type: "jpeg",
        quality: 88,
        captureBeyondViewport: false,
      });
      frame += 1;
      await sleep(interval);
    }
  };

  const navigation = page
    .goto(url, { waitUntil: "domcontentloaded", timeout: 0 })
    .catch(() => undefined);
  await Promise.race([navigation, sleep(3000)]);
  await page.waitForSelector(".hero-start-button", { timeout: 10_000 });

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

  // Draw a few visible, playful cuts inside the folded paper area.
  await drawPath(page, box, [
    [0.24, 0.32],
    [0.30, 0.24],
    [0.39, 0.25],
    [0.43, 0.34],
    [0.37, 0.43],
    [0.28, 0.42],
    [0.24, 0.32],
  ]);
  await sleep(900);
  await drawPath(page, box, [
    [0.22, 0.62],
    [0.31, 0.56],
    [0.41, 0.61],
    [0.36, 0.72],
    [0.25, 0.73],
    [0.22, 0.62],
  ]);
  await sleep(900);

  const horizontalButton = await page.$x?.("//button[contains(., '横着折')]");
  if (horizontalButton && horizontalButton[0]) {
    await horizontalButton[0].click();
    await sleep(800);
  } else {
    await page.evaluate(() => {
      const button = [...document.querySelectorAll("button")].find((node) =>
        (node.textContent || "").includes("横着折")
      );
      button?.click();
    });
    await sleep(800);
  }

  const box2 = await page.$eval(".draw-surface", (element) => {
    const rect = element.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  await drawPath(page, box2, [
    [0.34, 0.25],
    [0.48, 0.27],
    [0.63, 0.31],
    [0.73, 0.39],
    [0.65, 0.48],
    [0.48, 0.46],
    [0.34, 0.25],
  ]);
  await sleep(1600);

  await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((node) =>
      (node.textContent || "").includes("完成了")
    );
    button?.click();
  });
  await sleep(6200);

  const nextButton = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((node) =>
      (node.textContent || "").includes("下一局")
    )
  );
  if (nextButton) {
    try {
      await nextButton.click();
      await sleep(2800);
    } catch {
      // The button may not exist in edge cases; the result scene is enough.
    }
  }

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
