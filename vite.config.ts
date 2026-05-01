import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: "sidepanel.html",
        "service-worker": "src/background/service-worker.ts",
        content: "src/content/index.ts"
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "service-worker") return "service-worker.js";
          if (chunk.name === "content") return "content.js";
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
