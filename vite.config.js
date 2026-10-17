import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  root: "app",
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../.site-build",
    assetsDir: "assets/portfolio",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        home: fileURLToPath(new URL("./app/index.html", import.meta.url)),
        tools: fileURLToPath(new URL("./app/tools/index.html", import.meta.url)),
        arcadeMap: fileURLToPath(new URL("./app/tools/arcade-map/index.html", import.meta.url)),
      },
    },
  },
});