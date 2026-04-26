import { AddressInfo } from "node:net";
import { afterEach, describe, expect, it } from "vitest";
import { createFixtureServer } from "../../scripts/fixture-server.mjs";

describe("fixture server", () => {
  const servers: ReturnType<typeof createFixtureServer>[] = [];

  afterEach(async () => {
    await Promise.all(
      servers.map(
        (server) =>
          new Promise<void>((resolve, reject) => {
            server.close((error?: Error) => {
              if (error) {
                reject(error);
                return;
              }

              resolve();
            });
          })
      )
    );
    servers.length = 0;
  });

  async function listen() {
    const server = createFixtureServer();
    servers.push(server);

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", resolve);
    });

    const address = server.address() as AddressInfo;

    return `http://127.0.0.1:${address.port}`;
  }

  it("serves fixture pages without allowing path traversal", async () => {
    const origin = await listen();

    const fixtureResponse = await fetch(`${origin}/direct-link.html`);
    expect(fixtureResponse.status).toBe(200);
    expect(await fixtureResponse.text()).toContain("<video");

    const sampleResponse = await fetch(`${origin}/sample.mp4`);
    expect(sampleResponse.status).toBe(200);
    expect(sampleResponse.headers.get("content-type")).toContain("video/mp4");
    expect((await sampleResponse.arrayBuffer()).byteLength).toBeGreaterThan(
      1000
    );

    const traversalResponse = await fetch(`${origin}/../../package.json`);
    expect(traversalResponse.status).toBe(404);
    expect(await traversalResponse.text()).not.toContain(
      "multivideo-sidepanel-extension"
    );
  });
});
