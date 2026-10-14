import { access, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(dirname(fileURLToPath(import.meta.url))));
const build = join(root, ".site-build");

function withinRoot(path) {
  const difference = relative(root, resolve(path));
  if (!difference || difference.startsWith("..")) {
    throw new Error(`Refusing to publish outside the expected output: ${path}`);
  }
  return path;
}

for (const name of ["index.html", "favicon.svg", "media"]) {
  const destination = withinRoot(join(root, name));
  await rm(destination, { recursive: true, force: true });
  if (name === "media") {
    try {
      await access(join(build, name));
    } catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
  }
  await cp(join(build, name), destination, { recursive: true });
}

const assets = withinRoot(join(root, "assets", "portfolio"));
await rm(assets, { recursive: true, force: true });
await mkdir(dirname(assets), { recursive: true });
await cp(join(build, "assets", "portfolio"), assets, { recursive: true });
console.log("GitHub Pages files published to repository root.");
