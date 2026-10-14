import { chromium } from "playwright";
import { spawn } from "node:child_process";
import { mkdir, readdir, access, copyFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import { homedir } from "node:os";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const media = join(root, "app", "public", "media");
const port = "4174";
await mkdir(media, { recursive: true });
const server = spawn(
  "node",
  [
    "node_modules/vite/bin/vite.js",
    "--host",
    "127.0.0.1",
    "--port",
    port,
    "--strictPort",
  ],
  { cwd: root, stdio: "ignore" },
);
let browser;
try {
  for (let i = 0; i < 40; i++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/media.html`);
      if (response.ok) break;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  const cache = join(homedir(), "AppData", "Local", "ms-playwright");
  const installs = await readdir(cache);
  const available = installs
    .filter((name) => name.startsWith("chromium_headless_shell-"))
    .sort()
    .reverse();
  let executablePath;
  for (const install of available) {
    const candidate = join(
      cache,
      install,
      "chrome-headless-shell-win64",
      "chrome-headless-shell.exe",
    );
    try {
      await access(candidate);
      executablePath = candidate;
      break;
    } catch {}
  }
  browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-webgl"],
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  await page.goto(`http://127.0.0.1:${port}/media.html`);
  await page.waitForFunction(() => typeof window.renderFrame === "function");
  await page
    .locator("canvas")
    .screenshot({ path: join(media, "hero-poster.png") });
  await page.evaluate(() => window.renderFrame(0.8));
  await page
    .locator("canvas")
    .screenshot({ path: join(media, "form-poster.png") });
  await mkdir(join(root, ".preview"), { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: {
      dir: join(root, ".preview"),
      size: { width: 1280, height: 720 },
    },
  });
  const motionPage = await context.newPage();
  await motionPage.goto(`http://127.0.0.1:${port}/media.html`);
  await motionPage.waitForFunction(
    () => typeof window.renderFrame === "function",
  );
  await motionPage.evaluate(() => {
    const start = performance.now();
    const animate = (now) => {
      window.renderFrame((now - start) / 1000);
      if (now - start < 3500) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  });
  await motionPage.waitForTimeout(3700);
  const video = motionPage.video();
  await motionPage.close();
  await copyFile(await video.path(), join(media, "hero-loop.webm"));
  await context.close();
} finally {
  await browser?.close();
  server.kill();
}
