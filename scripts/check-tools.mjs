import assert from "node:assert/strict";
import { readFile, readdir, access, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";
import { chromium } from "playwright";

const cache = join(homedir(), "AppData", "Local", "ms-playwright");
let executablePath;
for (const install of (await readdir(cache)).filter((name) => name.startsWith("chromium_headless_shell-")).sort().reverse()) {
  const path = join(cache, install, "chrome-headless-shell-win64", "chrome-headless-shell.exe");
  try { await access(path); executablePath = path; break; } catch { /* try the next installed version */ }
}
const browser = await chromium.launch({ executablePath, headless: true });
const baseUrl = process.env.PREVIEW_URL || "http://127.0.0.1:5173/";
// Keep the CRUD fixture stable as the real bookmark collection grows.
const initialCollection = JSON.parse(await readFile("app/public/data/tools.json", "utf8"));
const seed = { version: 1, bookmarks: [initialCollection.bookmarks.find((item) => item.id === "grid-splitter-react")] };
const api = "https://api.github.com/repos/Fubuki007/Fubuki007.github.io/contents/app/public/data/tools.json";
const fakeToken = "test-only-token";
let data = structuredClone(seed);
let revision = 1;
let failWrite = false;
let failRead = false;
let conflictOnce = false;
let login = "Fubuki007";
let unauthorized = false;
let writes = 0;
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });

await context.route("https://api.github.com/**", async (route) => {
  const request = route.request();
  const authorized = request.headers().authorization === `Bearer ${fakeToken}`;
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (request.url() === "https://api.github.com/user") {
    return authorized && !unauthorized ? json(200, { login }) : json(401, { message: "Bad credentials" });
  }
  assert.ok(request.url().startsWith(api), "Unexpected API target");
  if (request.method() === "PUT") {
    assert.ok(authorized, "Write must be authenticated");
    if (failWrite) return json(403, { message: "Resource not accessible" });
    if (unauthorized) return json(401, { message: "Bad credentials" });
    const payload = request.postDataJSON();
    assert.equal(payload.branch, "master");
    if (conflictOnce) {
      conflictOnce = false;
      data.bookmarks.push({ id: "concurrent", title: "另一台设备的收藏", url: "https://example.org/other", sourceUrl: "", category: "科研", description: "同时添加的条目" });
      revision += 1;
      return json(409, { message: "SHA mismatch" });
    }
    if (payload.sha !== `sha-${revision}`) return json(409, { message: "SHA mismatch" });
    const next = JSON.parse(Buffer.from(payload.content, "base64").toString("utf8"));
    assert.equal(next.version, 1);
    assert.ok(!JSON.stringify(next).includes(fakeToken), "Token must never be in committed data");
    data = next;
    revision += 1;
    writes += 1;
    return json(200, { content: { sha: `sha-${revision}` } });
  }
  if (failRead) return route.abort("failed");
  if (authorized && unauthorized) return json(401, { message: "Bad credentials" });
  return json(200, { encoding: "base64", sha: `sha-${revision}`, content: Buffer.from(JSON.stringify(data), "utf8").toString("base64") });
});

function watch(page) {
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("request", (request) => {
    if (request.headers().authorization) assert.ok(request.url().startsWith("https://api.github.com/"), "Authorization must only be sent to GitHub");
  });
}

async function waitForSync(page) { await page.getByText("已同步 GitHub", { exact: true }).waitFor(); }
async function assertNotStored(page) {
  const stores = await page.evaluate(() => JSON.stringify({ local: { ...localStorage }, session: { ...sessionStorage } }));
  assert.ok(!stores.includes(fakeToken), "Token must not be stored in the browser");
}

try {
  await mkdir(".preview", { recursive: true });
  const page = await context.newPage();
  watch(page);
  await page.goto(new URL("tools/", baseUrl).href);
  await waitForSync(page);
  assert.equal(await page.title(), "小工具 — Fubuki");
  assert.equal(await page.getByRole("heading", { level: 1 }).textContent(), "小工具。");
  assert.equal(await page.getByRole("link", { name: "GitHub 源码" }).getAttribute("href"), "https://github.com/Takeoff0518/grid-splitter-react");
  assert.equal(await page.getByRole("link", { name: "打开工具" }).getAttribute("href"), "https://grid-splitter.tbpdt.top/");
  assert.equal(await page.getByRole("button", { name: /^编辑 / }).count(), 0);
  await page.getByLabel("搜索收藏").fill("不存在");
  await page.getByRole("heading", { name: "没有找到匹配的收藏" }).waitFor();
  await page.getByLabel("搜索收藏").fill("");
  for (const [name, width, height] of [["tools-desktop", 1440, 1000], ["tools-wide", 1920, 1080], ["tools-mobile", 390, 844], ["tools-small", 320, 700]]) {
    await page.setViewportSize({ width, height });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name} overflow`);
    await page.screenshot({ path: `.preview/${name}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.getByRole("button", { name: "添加链接" }).click();
  let dialog = page.getByRole("dialog");
  login = "someone-else";
  await dialog.getByLabel("GitHub 访问令牌").fill(fakeToken);
  await dialog.getByRole("button", { name: "连接 GitHub", exact: true }).click();
  await dialog.getByRole("alert").filter({ hasText: "仅 Fubuki007" }).waitFor();
  login = "Fubuki007";
  unauthorized = true;
  await dialog.getByRole("button", { name: "连接 GitHub", exact: true }).click();
  await dialog.getByRole("alert").filter({ hasText: "令牌无效" }).waitFor();
  unauthorized = false;
  await dialog.getByRole("button", { name: "连接 GitHub", exact: true }).click();
  await page.getByRole("heading", { name: "添加链接", exact: true }).waitFor();
  await assertNotStored(page);

  await dialog.getByLabel("名称", { exact: true }).fill("论文检索");
  await dialog.getByLabel("工具链接", { exact: true }).fill("https://example.org/papers");
  await dialog.getByLabel(/^分类/).fill("科研");
  await dialog.getByLabel(/^说明/).fill("中文说明 · 可跨设备同步");
  failWrite = true;
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.getByRole("alert").filter({ hasText: "GitHub 拒绝" }).waitFor();
  assert.equal(data.bookmarks.length, 1, "Failed save must not mutate collection");
  assert.equal(await dialog.getByLabel("名称", { exact: true }).inputValue(), "论文检索");
  failWrite = false;
  conflictOnce = true;
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(data.bookmarks.length, 3, "Retry must preserve the other device's bookmark");
  assert.ok(data.bookmarks.some((item) => item.description === "中文说明 · 可跨设备同步"));

  const otherContext = await browser.newContext();
  await otherContext.route("https://api.github.com/**", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ encoding: "base64", sha: `sha-${revision}`, content: Buffer.from(JSON.stringify(data), "utf8").toString("base64") }) }));
  const otherPage = await otherContext.newPage();
  watch(otherPage);
  await otherPage.goto(new URL("tools/", baseUrl).href);
  await waitForSync(otherPage);
  await otherPage.getByRole("heading", { name: "论文检索", exact: true }).waitFor();
  assert.equal(await otherPage.getByRole("button", { name: /^编辑 / }).count(), 0);

  await page.getByRole("button", { name: "编辑 论文检索", exact: true }).click();
  await dialog.getByLabel("名称", { exact: true }).fill("论文与文献");
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.waitFor({ state: "hidden" });
  await otherPage.getByRole("button", { name: "刷新", exact: true }).click();
  await otherPage.getByRole("heading", { name: "论文与文献", exact: true }).waitFor();
  await page.getByRole("button", { name: /^科研 / }).click();
  assert.equal(await page.locator(".bookmark-card").count(), 2);
  await page.getByRole("button", { name: /^全部 / }).click();

  await page.getByRole("button", { name: "编辑 论文与文献", exact: true }).click();
  await dialog.getByLabel("名称", { exact: true }).fill("本机未保存的内容");
  data.bookmarks[0].title = "另一台设备已更新";
  revision += 1;
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.getByRole("alert").filter({ hasText: "其他设备修改" }).waitFor();
  assert.equal(await dialog.getByLabel("名称", { exact: true }).inputValue(), "本机未保存的内容");
  assert.equal(data.bookmarks[0].title, "另一台设备已更新");
  await dialog.getByRole("button", { name: "取消", exact: true }).click();
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await page.getByRole("button", { name: "删除 另一台设备已更新", exact: true }).click();
  await dialog.getByRole("button", { name: "保留收藏", exact: true }).click();
  assert.equal(data.bookmarks.length, 3);
  await page.getByRole("button", { name: "删除 另一台设备已更新", exact: true }).click();
  await dialog.getByRole("button", { name: "确认删除", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(data.bookmarks.length, 2);

  // Unsafe links and duplicate links must not reach the GitHub write API.
  await page.getByRole("button", { name: "添加链接" }).click();
  await dialog.getByLabel("名称", { exact: true }).fill("不合法链接");
  await dialog.getByLabel("工具链接", { exact: true }).fill("javascript:alert(1)");
  const before = writes;
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.getByRole("alert").filter({ hasText: "http://" }).waitFor();
  assert.equal(writes, before);
  await dialog.getByLabel("工具链接", { exact: true }).fill(seed.bookmarks[0].url);
  await dialog.getByRole("button", { name: "保存到 GitHub" }).click();
  await dialog.getByRole("alert").filter({ hasText: "重复" }).waitFor();
  assert.equal(writes, before);
  await dialog.getByRole("button", { name: "取消", exact: true }).click();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出收藏", exact: true }).click();
  const download = await downloadPromise;
  assert.equal(download.suggestedFilename(), "小工具收藏.json");
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  assert.deepEqual(exported.bookmarks, data.bookmarks);
  await assertNotStored(page);
  failRead = true;
  await page.getByRole("button", { name: "刷新", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "暂时无法连接" }).waitFor();
  assert.equal(await page.locator(".bookmark-card").count(), 2, "Read failure should preserve displayed collection");
  failRead = false;
  await page.getByRole("button", { name: "断开", exact: true }).click();
  assert.equal(await page.getByRole("button", { name: /^编辑 / }).count(), 0);
  await page.reload();
  await waitForSync(page);
  await page.getByRole("button", { name: "连接 GitHub", exact: true }).waitFor();
  assert.equal(await page.locator(".bookmark-card").count(), 2);
  await assertNotStored(page);
  assert.deepEqual(errors, []);
  await otherContext.close();
  console.log("Tools checks passed: four viewport sizes, owner authentication, CRUD, cross-device reads, concurrent edits, failures, safe links, export and token isolation.");
} finally {
  await context.close();
  await browser.close();
}
