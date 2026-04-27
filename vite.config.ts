import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { createSidepanelHtml } from "./src/build/sidepanel-html";

function emitSidepanelHtml(): Plugin {
  const sidepanelHtml = createSidepanelHtml(
    readFileSync(resolve(__dirname, "src/sidepanel/index.html"), "utf8")
  );

  return {
    name: "emit-sidepanel-html",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "sidepanel.html",
        source: sidepanelHtml
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), emitSidepanelHtml()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: "src/sidepanel/main.tsx",
        "service-worker": "src/background/service-worker.ts",
        "content-runner": "src/content/runner.ts"
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "sidepanel") return "assets/sidepanel.js";
          if (chunk.name === "service-worker") return "service-worker.js";
          if (chunk.name === "content-runner") return "content-runner.js";
          return "assets/[name].js";
        },
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name][extname]"
      }
    }
  }
});
