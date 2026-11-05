// Vite drives the local preview. The site itself is native ES modules + three.js
// (no framework), with an import map pointing at the vendored three.js build.
// For `vite build` we keep that exact source tree in dist/ instead of bundling:
// the 3D room, GLB models, canvas textures and WebP placeholders are all loaded
// by string paths at runtime, so a plain static copy is the faithful build.
import { defineConfig } from "vite";
import { cpSync, readdirSync, rmSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const site = resolve(here, "site");
const out = resolve(here, "dist");

function htmlInputs(dir) {
  const inputs = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) {
        if (name === "vendor") continue;
        walk(p);
      } else if (name === "index.html") {
        const rel = p.slice(site.length + 1).replace(/\\/g, "/");
        inputs[rel === "index.html" ? "home" : rel.slice(0, -"index.html".length).replace(/\/$/, "")] = p;
      }
    }
  };
  walk(site);
  return inputs;
}

export default defineConfig({
  root: site,
  base: "/",
  appType: "mpa",
  publicDir: false,
  server: { host: "127.0.0.1", port: 5173, strictPort: false },
  preview: { host: "127.0.0.1", port: 4173 },
  build: {
    outDir: out,
    emptyOutDir: true,
    // All pages are real HTML entries (multi-page site), not client-side routes.
    // Vite parses/validates every page; the emitted bundle is then discarded so
    // dist/ stays a byte-for-byte static mirror of site/ (runtime string paths,
    // import map, GLBs and canvas textures all depend on that exact tree).
    rollupOptions: { input: htmlInputs(site) },
  },
  plugins: [
    {
      name: "keep-native-module-tree",
      closeBundle() {
        rmSync(out, { recursive: true, force: true });
        cpSync(site, out, { recursive: true, force: true });
      },
    },
  ],
});
