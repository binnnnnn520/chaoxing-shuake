import { describe, expect, it } from "vitest";
import { classifyUrl } from "../../../src/shared/url";

describe("classifyUrl", () => {
  it("marks direct media links as inline candidates", () => {
    expect(classifyUrl("https://cdn.example.com/a/video.mp4")).toMatchObject({
      kind: "direct-media",
      directMediaType: "mp4"
    });
  });

  it("marks webpage links as webpage candidates", () => {
    expect(classifyUrl("https://example.com/watch?id=7")).toMatchObject({
      kind: "webpage"
    });
  });
});
