import { describe, expect, it } from "vitest";
import { createScheduler } from "../../../src/background/scheduler";

describe("scheduler", () => {
  it("最多允许 N 路并发", () => {
    const s = createScheduler(3);
    ["a", "b", "c", "d", "e"].forEach((id) => s.enqueue(id));
    expect(s.claimNextBatch()).toEqual(["a", "b", "c"]);
    expect(s.claimNextBatch()).toEqual([]);
  });

  it("release 后可补充新任务", () => {
    const s = createScheduler(2);
    ["a", "b", "c"].forEach((id) => s.enqueue(id));
    s.claimNextBatch(); // a, b 活跃
    s.release("a");
    expect(s.claimNextBatch()).toEqual(["c"]);
  });

  it("不重复入队同一 id", () => {
    const s = createScheduler(10);
    s.enqueue("x");
    s.enqueue("x");
    expect(s.claimNextBatch()).toHaveLength(1);
  });
});
