import { describe, expect, it, vi } from "vitest";
import { createHtml5Adapter } from "../../../src/content/adapters/html5";
import { getPageAdapter } from "../../../src/content/adapters/registry";

function createDocument(markup: string) {
  document.body.innerHTML = markup;
  return document;
}

describe("createHtml5Adapter", () => {
  it("finds the first video element on the page and controls only that element", async () => {
    const doc = createDocument(`
      <main>
        <video id="first"></video>
        <video id="second"></video>
      </main>
    `);
    const [firstVideo, secondVideo] = Array.from(doc.querySelectorAll("video")) as HTMLVideoElement[];
    const firstPlay = vi.fn().mockResolvedValue(undefined);
    const secondPlay = vi.fn().mockResolvedValue(undefined);
    const firstPause = vi.fn();
    const secondPause = vi.fn();

    Object.defineProperty(firstVideo, "play", {
      configurable: true,
      value: firstPlay
    });
    Object.defineProperty(secondVideo, "play", {
      configurable: true,
      value: secondPlay
    });
    Object.defineProperty(firstVideo, "pause", {
      configurable: true,
      value: firstPause
    });
    Object.defineProperty(secondVideo, "pause", {
      configurable: true,
      value: secondPause
    });
    Object.defineProperty(firstVideo, "currentTime", {
      configurable: true,
      writable: true,
      value: 12
    });
    Object.defineProperty(firstVideo, "duration", {
      configurable: true,
      value: 300
    });
    Object.defineProperty(firstVideo, "paused", {
      configurable: true,
      value: false
    });
    Object.defineProperty(firstVideo, "ended", {
      configurable: true,
      value: false
    });

    firstVideo.muted = false;
    firstVideo.volume = 1;
    firstVideo.playbackRate = 1;

    const adapter = createHtml5Adapter(doc);

    expect(adapter.canHandle()).toBe(true);

    await adapter.play();
    const pauseResult = adapter.pause();
    expect(pauseResult).toBeInstanceOf(Promise);
    await pauseResult;
    adapter.setMuted(true);
    adapter.setVolume(0.4);
    adapter.setRate(1.5);
    const stopResult = adapter.stop();
    expect(stopResult).toBeInstanceOf(Promise);
    await stopResult;

    expect(firstPlay).toHaveBeenCalledTimes(1);
    expect(secondPlay).not.toHaveBeenCalled();
    expect(firstPause).toHaveBeenCalledTimes(2);
    expect(secondPause).not.toHaveBeenCalled();
    expect(firstVideo.currentTime).toBe(0);
    expect(firstVideo.muted).toBe(true);
    expect(firstVideo.volume).toBe(0.4);
    expect(firstVideo.playbackRate).toBe(1.5);
    expect(adapter.getHeartbeat()).toEqual({
      currentTime: 0,
      paused: false,
      ended: false
    });
  });
});

describe("getPageAdapter", () => {
  it("returns the html5 adapter only when the page contains a video element", () => {
    const supportedDoc = createDocument(`<video id="player"></video>`);
    const unsupportedDoc = document.implementation.createHTMLDocument("unsupported");

    expect(getPageAdapter(supportedDoc)?.canHandle()).toBe(true);
    expect(getPageAdapter(unsupportedDoc)).toBeNull();
  });
});
