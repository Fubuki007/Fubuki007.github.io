import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "app",
  plugins: [react()],
  base: "/",
  build: {
    outDir: "../.site-build",
    assetsDir: "assets/portfolio",
    emptyOutDir: true,
  },
});
