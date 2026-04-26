import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("fixture pages", () => {
  it("includes a direct-link sample and a webpage sample", () => {
    expect(readFileSync("tests/fixtures/direct-link.html", "utf8")).toContain(
      "video"
    );
    expect(readFileSync("tests/fixtures/webpage-link.html", "utf8")).toContain(
      "video"
    );
  });
});
