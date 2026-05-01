import { afterEach, describe, expect, it } from "vitest";
import { applySpeedOverride } from "../../../src/content/speed-override";

describe("applySpeedOverride", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("为已存在的 video 设置 playbackRate", () => {
    const video = document.createElement("video");
    document.body.appendChild(video);

    const observer = applySpeedOverride(16);
    expect(video.playbackRate).toBe(16);
    observer.disconnect();
  });

  it("返回 MutationObserver 实例", () => {
    const observer = applySpeedOverride(2);
    expect(observer).toBeInstanceOf(MutationObserver);
    observer.disconnect();
  });
});
