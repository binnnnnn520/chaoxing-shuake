import { describe, expect, it } from "vitest";
import { createScheduler } from "../../../src/background/scheduler";

describe("createScheduler", () => {
  it("allows only six active task ids when created with limit 6", () => {
    const scheduler = createScheduler(6);

    for (const taskId of ["a", "b", "c", "d", "e", "f", "g"]) {
      scheduler.enqueue(taskId);
    }

    expect(scheduler.claimNextBatch()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(scheduler.getActiveIds()).toEqual(["a", "b", "c", "d", "e", "f"]);
    expect(scheduler.claimNextBatch()).toEqual([]);
  });

  it("keeps queue membership unique across pending and active ids", () => {
    const scheduler = createScheduler(2);

    scheduler.enqueue("a");
    scheduler.enqueue("a");
    scheduler.enqueue("b");

    expect(scheduler.claimNextBatch()).toEqual(["a", "b"]);

    scheduler.enqueue("a");
    scheduler.enqueue("c");

    expect(scheduler.claimNextBatch()).toEqual([]);

    scheduler.release("a");

    expect(scheduler.claimNextBatch()).toEqual(["c"]);
    expect(scheduler.getActiveIds()).toEqual(["b", "c"]);
  });

  it("returns a copy of active ids", () => {
    const scheduler = createScheduler(1);

    scheduler.enqueue("a");
    scheduler.claimNextBatch();

    const activeIds = scheduler.getActiveIds();
    activeIds.push("mutated");

    expect(scheduler.getActiveIds()).toEqual(["a"]);
  });
});
