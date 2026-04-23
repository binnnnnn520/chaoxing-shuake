import { describe, expect, it, vi } from "vitest";
import { createDraftTasks } from "../../../src/shared/task-factory";

describe("createDraftTasks", () => {
  it("splits pasted lines, trims whitespace, and drops duplicates", () => {
    const tasks = createDraftTasks(
      " https://a.test/v.mp4 \n\nhttps://a.test/v.mp4\nhttps://b.test/page "
    );

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.sourceUrl)).toEqual([
      "https://a.test/v.mp4",
      "https://b.test/page"
    ]);
    expect(tasks.every((task) => task.state === "draft")).toBe(true);
  });

  it("drops malformed lines without aborting the full batch", () => {
    const tasks = createDraftTasks(
      "https://a.test/v.mp4\nnot a url\nhttps://b.test/page"
    );

    expect(tasks.map((task) => task.sourceUrl)).toEqual([
      "https://a.test/v.mp4",
      "https://b.test/page"
    ]);
  });

  it("creates ids that stay unique across repeated calls", () => {
    const dateNowSpy = vi.spyOn(Date, "now").mockReturnValue(1_713_379_200_000);

    const firstTask = createDraftTasks("https://a.test/v.mp4")[0];
    const secondTask = createDraftTasks("https://a.test/v.mp4")[0];

    expect(firstTask.id).not.toBe(secondTask.id);
    dateNowSpy.mockRestore();
  });
});
