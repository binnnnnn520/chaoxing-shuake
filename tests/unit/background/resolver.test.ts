import { describe, expect, it } from "vitest";
import { resolveTask } from "../../../src/background/resolver";

describe("resolveTask", () => {
  it("chooses inline for direct media", async () => {
    const resolution = resolveTask({
      sourceUrl: "https://a.test/video.mp4",
      directMediaType: "mp4"
    });

    expect(resolution).toBeInstanceOf(Promise);
    await expect(resolution).resolves.toEqual({
      effectiveMode: "inline",
      state: "ready_inline",
      mediaUrl: "https://a.test/video.mp4"
    });
  });

  it("chooses background for webpage links", async () => {
    const resolution = resolveTask({
      sourceUrl: "https://a.test/course/lesson",
      directMediaType: null
    });

    expect(resolution).toBeInstanceOf(Promise);
    await expect(resolution).resolves.toEqual({
      effectiveMode: "background",
      state: "ready_background",
      mediaUrl: null
    });
  });
});
