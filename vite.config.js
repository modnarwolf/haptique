import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    // Three.js, DialKit, and the simulation make this an intentionally visual-heavy app.
    chunkSizeWarningLimit: 1200,
    target: "es2022",
  },
});
