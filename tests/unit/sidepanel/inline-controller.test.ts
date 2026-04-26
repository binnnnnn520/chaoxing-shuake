import { describe, expect, it, vi } from "vitest";
import { createInlineController } from "../../../src/sidepanel/lib/createInlineController";

function stubMediaCleanup(video: HTMLVideoElement) {
  const pause = vi.fn();
  const load = vi.fn();

  Object.defineProperty(video, "pause", {
    configurable: true,
    value: pause
  });
  Object.defineProperty(video, "load", {
    configurable: true,
    value: load
  });

  return { pause, load };
}

describe("createInlineController", () => {
  it("sets native video src for mp4 playback", () => {
    const video = document.createElement("video");
    const { pause, load } = stubMediaCleanup(video);
    const controller = createInlineController(video);

    controller.attach("https://cdn.example.com/video.mp4", "mp4");

    expect(video.src).toBe("https://cdn.example.com/video.mp4");

    controller.destroy();

    expect(video.getAttribute("src")).toBeNull();
    expect(pause).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);
  });

  it("uses hls.js for m3u8 playback with an injected HlsMock", () => {
    const video = document.createElement("video");
    stubMediaCleanup(video);
    const loadSource = vi.fn();
    const attachMedia = vi.fn();
    const destroy = vi.fn();
    const HlsMock = vi.fn().mockImplementation(() => ({
      loadSource,
      attachMedia,
      destroy
    }));
    const controller = createInlineController(
      video,
      HlsMock as unknown as typeof import("hls.js").default
    );

    controller.attach("https://cdn.example.com/playlist.m3u8", "m3u8");

    expect(HlsMock).toHaveBeenCalledTimes(1);
    expect(loadSource).toHaveBeenCalledWith(
      "https://cdn.example.com/playlist.m3u8"
    );
    expect(attachMedia).toHaveBeenCalledWith(video);

    controller.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(video.getAttribute("src")).toBeNull();
  });

  it("falls back to native HLS when hls.js is unavailable but the video can play it", () => {
    const video = document.createElement("video");
    stubMediaCleanup(video);
    Object.defineProperty(video, "canPlayType", {
      configurable: true,
      value: vi.fn().mockReturnValue("probably")
    });
    const HlsMock = Object.assign(
      vi.fn().mockImplementation(() => {
        throw new Error("hls.js should not be constructed");
      }),
      { isSupported: vi.fn().mockReturnValue(false) }
    );
    const controller = createInlineController(
      video,
      HlsMock as unknown as typeof import("hls.js").default
    );

    controller.attach("https://cdn.example.com/playlist.m3u8", "m3u8");

    expect(HlsMock).not.toHaveBeenCalled();
    expect(video.src).toBe("https://cdn.example.com/playlist.m3u8");
  });

  it("throws a controlled error when neither hls.js nor native HLS is supported", () => {
    const video = document.createElement("video");
    stubMediaCleanup(video);
    Object.defineProperty(video, "canPlayType", {
      configurable: true,
      value: vi.fn().mockReturnValue("")
    });
    const HlsMock = Object.assign(vi.fn(), {
      isSupported: vi.fn().mockReturnValue(false)
    });
    const controller = createInlineController(
      video,
      HlsMock as unknown as typeof import("hls.js").default
    );

    expect(() =>
      controller.attach("https://cdn.example.com/playlist.m3u8", "m3u8")
    ).toThrow("HLS playback is not supported");
    expect(HlsMock).not.toHaveBeenCalled();
  });

  it("destroys existing hls instances before replacing the media source", () => {
    const video = document.createElement("video");
    const { pause, load } = stubMediaCleanup(video);
    const firstDestroy = vi.fn();
    const secondDestroy = vi.fn();
    const HlsMock = vi
      .fn()
      .mockImplementationOnce(() => ({
        loadSource: vi.fn(),
        attachMedia: vi.fn(),
        destroy: firstDestroy
      }))
      .mockImplementationOnce(() => ({
        loadSource: vi.fn(),
        attachMedia: vi.fn(),
        destroy: secondDestroy
      }));
    const controller = createInlineController(
      video,
      HlsMock as unknown as typeof import("hls.js").default
    );

    controller.attach("https://cdn.example.com/first.m3u8", "m3u8");
    controller.attach("https://cdn.example.com/second.mp4", "mp4");

    expect(firstDestroy).toHaveBeenCalledTimes(1);
    expect(video.src).toBe("https://cdn.example.com/second.mp4");
    expect(pause).toHaveBeenCalledTimes(1);
    expect(load).toHaveBeenCalledTimes(1);

    controller.attach("https://cdn.example.com/third.m3u8", "m3u8");
    controller.destroy();

    expect(secondDestroy).toHaveBeenCalledTimes(1);
  });
});
