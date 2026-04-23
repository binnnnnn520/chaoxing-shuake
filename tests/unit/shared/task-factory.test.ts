import { describe, expect, it } from "vitest";
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
});
