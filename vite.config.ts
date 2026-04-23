import { copyFile, mkdir, rm } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

function renameSidepanelHtml() {
  return {
    name: "rename-sidepanel-html",
    async closeBundle() {
      const sourcePath = resolve(__dirname, "dist/src/sidepanel/index.html");
      const targetPath = resolve(__dirname, "dist/sidepanel.html");

      await mkdir(dirname(targetPath), { recursive: true });
      await rm(targetPath, { force: true });
      await copyFile(sourcePath, targetPath);
      await rm(sourcePath, { force: true });
    }
  };
}

export default defineConfig({
  plugins: [react(), renameSidepanelHtml()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        sidepanel: "src/sidepanel/index.html",
        "service-worker": "src/background/service-worker.ts",
        "content-runner": "src/content/runner.ts"
      },
      output: {
        entryFileNames: (chunk) => {
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
