import { chromium } from "playwright";
import { readdir, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const cache = join(homedir(), "AppData", "Local", "ms-playwright");
const installs = (await readdir(cache))
  .filter((name) => name.startsWith("chromium_headless_shell-"))
  .sort()
  .reverse();
let executablePath;
for (const install of installs) {
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
const browser = await chromium.launch({ executablePath, headless: true });
await mkdir(".preview", { recursive: true });
const baseUrl = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
try {
  for (const [name, width, height] of [
    ["wide-desktop", 1920, 1080],
    ["desktop", 1440, 900],
    ["mobile", 390, 844],
    ["small-mobile", 320, 700],
  ]) {
    const page = await browser.newPage({
      viewport: { width, height },
      deviceScaleFactor: 1,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const response = await page.goto(baseUrl, { waitUntil: "networkidle" });
    await page.screenshot({ path: `.preview/${name}.png`, fullPage: true });
    const result = await page.evaluate(() => ({
      title: document.title,
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      overflow: [...document.querySelectorAll('body *')]
        .filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > innerWidth + 1 && getComputedStyle(element).position !== 'absolute';
        })
        .slice(0, 8)
        .map((element) => ({ tag: element.tagName, class: element.className?.baseVal ?? element.className, parent: element.parentElement?.className?.baseVal ?? element.parentElement?.className, right: Math.round(element.getBoundingClientRect().right) })),
      images: [...document.querySelectorAll("img")].map((image) => ({
        src: image.getAttribute("src"),
        loaded: image.complete && image.naturalWidth > 0,
      })),
      sections: [...document.querySelectorAll("main > section[id]")].map(
        (section) => section.id,
      ),
      emailLinks: [...document.querySelectorAll('a[href^="mailto:"]')].length,
    }));
    if (
      !response.ok() ||
      errors.length ||
      result.width > width ||
      result.images.some((image) => !image.loaded) ||
      result.emailLinks < 1
    )
      throw new Error(
        `${name}: ${JSON.stringify({ status: response.status(), errors, result })}`,
      );
    if (name === "desktop") {
      await page.getByRole("button", { name: "品牌设计" }).click();
      if ((await page.locator(".project-card").count()) !== 1)
        throw new Error("Filtering failed");
      await page.locator(".project-card").click();
      if (!(await page.locator("dialog").isVisible()))
        throw new Error("Project dialog did not open");
      await page.getByRole("button", { name: "关闭项目详情" }).click();
      if (await page.locator("dialog").isVisible())
        throw new Error("Project dialog did not close");
    } else if (name === "mobile") {
      await page.getByRole("button", { name: "打开导航" }).click();
      if (!(await page.getByRole("navigation", { name: "主导航" }).isVisible()))
        throw new Error("Mobile menu did not open");
      await page
        .getByRole("navigation", { name: "主导航" })
        .getByRole("link", { name: "精选作品" })
        .click();
      if (await page.getByRole("navigation", { name: "主导航" }).isVisible())
        throw new Error("Mobile menu did not close");
    }
    console.log(`${name}: ${JSON.stringify(result)}`);
    await page.close();
  }
} finally {
  await browser.close();
}
