import { describe, expect, it } from "vitest";
import { resolveTask } from "../../../src/background/resolver";

describe("resolveTask", () => {
  it("chooses inline for direct media", () => {
    expect(
      resolveTask({
        sourceUrl: "https://a.test/video.mp4",
        directMediaType: "mp4"
      })
    ).toEqual({
      effectiveMode: "inline",
      state: "ready_inline",
      mediaUrl: "https://a.test/video.mp4"
    });
  });

  it("chooses background for webpage links", () => {
    expect(
      resolveTask({
        sourceUrl: "https://a.test/course/lesson",
        directMediaType: null
      })
    ).toEqual({
      effectiveMode: "background",
      state: "ready_background",
      mediaUrl: null
    });
  });
});
