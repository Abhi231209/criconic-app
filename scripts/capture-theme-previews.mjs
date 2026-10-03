#!/usr/bin/env node
// Captures the real live ticker of every web broadcast theme for the app's
// theme picker, so the list shows exactly what the overlay will look like.
//
// Each image is a screenshot of the website's /theme-preview/<key>?view=strip
// page (the actual overlay component with sample match data), cropped to the
// ticker and saved as assets/theme-previews/<key>.webp. The list of images
// and their aspect ratios is written to
// components/ui/themeConfig/themePreviewImages.js.
//
// Run it again after adding or restyling a theme on the website:
//   1. start the website:        npm --prefix ../client run dev
//   2. capture:                  node scripts/capture-theme-previews.mjs
//      (--base <url> if the site isn't on http://localhost:3000,
//       --keys A,B to capture only some themes)
//
// Needs Node 22+, Google Chrome and cwebp (brew install webp). Theme keys are read
// from the website's themes file (../client/src/components/overlays/
// broadcast/themes.js).

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PNG } from "pngjs";

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const THEMES_FILE = path.resolve(APP_DIR, "../client/src/components/overlays/broadcast/themes.js");
const OUT_DIR = path.join(APP_DIR, "assets/theme-previews");
const MANIFEST = path.join(APP_DIR, "components/ui/themeConfig/themePreviewImages.js");
const CHROME =
  process.env.CHROME_PATH ||
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "google-chrome");

// The ticker is laid out 1920px wide; a 960px window at 2x captures it at
// that full width.
const WINDOW = { width: 960, height: 1100 };
const SCALE = 2;
const PAD = 6; // keep the strip's drop shadow

const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
};
const base = (arg("base") || "http://localhost:3000").replace(/\/+$/, "");

function themeKeys() {
  const only = arg("keys");
  if (only) return only.split(",").map((k) => k.trim()).filter(Boolean);
  const source = fs.readFileSync(THEMES_FILE, "utf8");
  // Just the BROADCAST_THEMES object (it ends at the first "};" in column 0).
  let block = source.slice(source.indexOf("export const BROADCAST_THEMES"));
  block = block.slice(0, block.search(/^\};/m));
  return [...block.matchAll(/^ {2}(\w+Scorecard): \{/gm)].map((m) => m[1]);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function requireTool(cmd, args, hint) {
  const r = spawnSync(cmd, args, { stdio: "ignore" });
  if (r.error) {
    console.error(`${cmd} not found. ${hint}`);
    process.exit(1);
  }
}

// One headless Chrome, driven over the DevTools protocol: open each theme's
// page, wait until it says it's ready (its font has loaded), screenshot it.
async function startChrome(tmp) {
  const profile = path.join(tmp, "profile");
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      "--no-first-run",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: "ignore" }
  );
  const portFile = path.join(profile, "DevToolsActivePort");
  for (let i = 0; !fs.existsSync(portFile); i++) {
    if (i > 100) throw new Error("Chrome didn't start");
    await sleep(100);
  }
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0].trim();
  let pages = [];
  for (let i = 0; !pages.length && i < 50; i++) {
    pages = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).filter((t) => t.type === "page");
    if (!pages.length) await sleep(100);
  }
  const ws = new WebSocket(pages[0].webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });
  let id = 0;
  const pending = new Map();
  ws.onmessage = (msg) => {
    const data = JSON.parse(msg.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(new Error(data.error.message));
      else resolve(data.result);
    }
  };
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      pending.set(++id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  await send("Emulation.setDeviceMetricsOverride", {
    width: WINDOW.width,
    height: WINDOW.height,
    deviceScaleFactor: SCALE,
    mobile: false,
  });
  await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  return {
    send,
    close() {
      ws.close();
      chrome.kill("SIGKILL");
    },
  };
}

async function capture(browser, key, tmp) {
  const url = `${base}/theme-preview/${key}?view=strip`;
  await browser.send("Page.navigate", { url });
  const deadline = Date.now() + 30000;
  for (;;) {
    const { result } = await browser.send("Runtime.evaluate", {
      expression: "document.body && document.body.dataset.ready === '1'",
      returnByValue: true,
    });
    if (result?.value) break;
    if (Date.now() > deadline) throw new Error(`${url} never became ready`);
    await sleep(200);
  }
  await sleep(300); // a frame or two for the last styles
  const { data } = await browser.send("Page.captureScreenshot", { format: "png" });
  const shot = path.join(tmp, `${key}.png`);
  fs.writeFileSync(shot, Buffer.from(data, "base64"));
  return shot;
}

// Crops a screenshot to its visible pixels.
function cropToContent(file) {
  const png = PNG.sync.read(fs.readFileSync(file));
  let top = png.height, left = png.width, bottom = -1, right = -1;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      if (png.data[(y * png.width + x) * 4 + 3] > 8) {
        if (y < top) top = y;
        if (y > bottom) bottom = y;
        if (x < left) left = x;
        if (x > right) right = x;
      }
    }
  }
  if (bottom < 0) throw new Error(`${path.basename(file)} is empty`);
  top = Math.max(0, top - PAD);
  left = Math.max(0, left - PAD);
  bottom = Math.min(png.height - 1, bottom + PAD);
  right = Math.min(png.width - 1, right + PAD);
  const out = new PNG({ width: right - left + 1, height: bottom - top + 1 });
  PNG.bitblt(png, out, left, top, out.width, out.height, 0, 0);
  fs.writeFileSync(file, PNG.sync.write(out));
  return { width: out.width, height: out.height };
}

async function main() {
  requireTool(CHROME, ["--version"], "Install Google Chrome or set CHROME_PATH.");
  requireTool("cwebp", ["-version"], "Install it with: brew install webp");
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "theme-previews-"));

  const keys = themeKeys();
  const sizes = {};
  const browser = await startChrome(tmp);
  for (const key of keys) {
    process.stdout.write(`${key} … `);
    const shot = await capture(browser, key, tmp);
    const { width, height } = cropToContent(shot);
    const out = path.join(OUT_DIR, `${key}.webp`);
    const r = spawnSync("cwebp", ["-quiet", "-q", "90", "-alpha_q", "100", shot, "-o", out]);
    if (r.status !== 0) throw new Error(`cwebp failed for ${key}`);
    sizes[key] = { width, height };
    console.log(`${width}x${height}, ${Math.round(fs.statSync(out).size / 1024)} KB`);
  }
  browser.close();

  // Keep entries for themes not captured this run (--keys) if their image exists.
  const all = fs
    .readdirSync(OUT_DIR)
    .filter((f) => f.endsWith(".webp"))
    .map((f) => f.replace(/\.webp$/, ""))
    .sort();
  const previous = fs.existsSync(MANIFEST) ? fs.readFileSync(MANIFEST, "utf8") : "";
  const aspectOf = (key) => {
    if (sizes[key]) return +(sizes[key].width / sizes[key].height).toFixed(3);
    const m = previous.match(new RegExp(`${key}: \\{[^}]*aspect: ([\\d.]+)`));
    return m ? +m[1] : 16;
  };

  const lines = all.map(
    (key) =>
      `  ${key}: { image: require('../../../assets/theme-previews/${key}.webp'), aspect: ${aspectOf(key)} },`
  );
  fs.writeFileSync(
    MANIFEST,
    `// Generated by scripts/capture-theme-previews.mjs — don't edit by hand.\n` +
      `// Screenshots of each web broadcast theme's real live ticker (sample data),\n` +
      `// keyed by the theme's componentKey; aspect = width / height.\n` +
      `export const THEME_PREVIEW_IMAGES = {\n${lines.join("\n")}\n};\n`
  );
  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`\n${keys.length} captured, ${all.length} in ${path.relative(APP_DIR, MANIFEST)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
