import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PageMessageHandler } from "../../../src/content/runner";

function setChrome(value: typeof chrome | undefined) {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    writable: true,
    value
  });
}

async function loadRunner() {
  vi.resetModules();
  setChrome({
    runtime: {
      onMessage: {
        addListener: vi.fn()
      }
    }
  } as unknown as typeof chrome);

  return import("../../../src/content/runner");
}

function flushPromises() {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

describe("content runner", () => {
  const originalChrome = globalThis.chrome;

  beforeEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  afterEach(() => {
    document.body.innerHTML = "";
    setChrome(originalChrome);
  });

  it("responds with a failure when media commands reject", async () => {
    const runner = await loadRunner();
    const handler = (runner as { createPageMessageHandler: (doc: Document) => PageMessageHandler })
      .createPageMessageHandler(document);
    const video = document.createElement("video");
    const sendResponse = vi.fn();

    Object.defineProperty(video, "play", {
      configurable: true,
      value: vi.fn().mockRejectedValue(new Error("autoplay blocked"))
    });

    document.body.appendChild(video);

    expect(handler({ type: "page/play" }, {} as chrome.runtime.MessageSender, sendResponse)).toBe(true);
    await flushPromises();

    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      reason: "failed",
      errorMessage: "autoplay blocked"
    });
  });

  it("rejects malformed audio payloads without throwing", async () => {
    const runner = await loadRunner();
    const handler = (runner as { createPageMessageHandler: (doc: Document) => PageMessageHandler })
      .createPageMessageHandler(document);
    const sendResponse = vi.fn();

    document.body.appendChild(document.createElement("video"));

    expect(
      handler({ type: "page/set-audio" }, {} as chrome.runtime.MessageSender, sendResponse)
    ).toBeUndefined();
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      reason: "invalid-payload"
    });

    sendResponse.mockClear();

    expect(
      handler(
        {
          type: "page/set-audio",
          payload: { muted: true, volume: 2, rate: 1 }
        },
        {} as chrome.runtime.MessageSender,
        sendResponse
      )
    ).toBeUndefined();
    expect(sendResponse).toHaveBeenCalledWith({
      ok: false,
      reason: "invalid-payload"
    });
  });

  it("can control a video inserted after the handler is created", async () => {
    const runner = await loadRunner();
    const handler = (runner as { createPageMessageHandler: (doc: Document) => PageMessageHandler })
      .createPageMessageHandler(document);
    const video = document.createElement("video");
    const play = vi.fn().mockResolvedValue(undefined);
    const sendResponse = vi.fn();

    Object.defineProperty(video, "play", {
      configurable: true,
      value: play
    });

    document.body.appendChild(video);

    expect(handler({ type: "page/play" }, {} as chrome.runtime.MessageSender, sendResponse)).toBe(true);
    await flushPromises();

    expect(play).toHaveBeenCalledTimes(1);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
  });
});
