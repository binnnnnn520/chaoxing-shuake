import http from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function getFixtureRoot() {
  const metaUrl = new URL(import.meta.url);

  if (metaUrl.protocol === "file:") {
    return resolve(dirname(fileURLToPath(metaUrl)), "../tests/fixtures");
  }

  return resolve(process.cwd(), "tests/fixtures");
}

function isDirectRun() {
  if (!process.argv[1]) {
    return false;
  }

  try {
    return fileURLToPath(import.meta.url) === resolve(process.argv[1]);
  } catch {
    return false;
  }
}

const root = getFixtureRoot();
const rootPrefix = root.endsWith(sep) ? root : `${root}${sep}`;
const port = Number.parseInt(process.env.FIXTURE_PORT ?? "4173", 10);
const sampleMp4 = Buffer.from(
  "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",
  "base64"
);

function getFixturePath(requestUrl = "/") {
  const url = new URL(requestUrl, "http://127.0.0.1");
  const pathname = url.pathname === "/" ? "/direct-link.html" : url.pathname;
  const relativePath = decodeURIComponent(pathname).replace(/^\/+/, "");
  const resolvedPath = resolve(root, relativePath);

  if (resolvedPath !== root && !resolvedPath.startsWith(rootPrefix)) {
    return null;
  }

  return resolvedPath;
}

export function createFixtureServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/sample.mp4") {
        response.writeHead(200, {
          "content-type": "video/mp4",
          "cache-control": "no-store"
        });
        response.end(sampleMp4);
        return;
      }

      const fixturePath = getFixturePath(request.url);

      if (!fixturePath) {
        throw new Error("fixture path escaped root");
      }

      const file = await readFile(fixturePath, "utf8");

      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store"
      });
      response.end(file);
    } catch {
      response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
      response.end("fixture not found");
    }
  });
}

if (isDirectRun()) {
  createFixtureServer().listen(port, "127.0.0.1", () => {
    console.log(`fixture server listening on http://127.0.0.1:${port}`);
  });
}
