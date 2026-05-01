import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTaskStore } from "../../../src/background/task-store";
import type { ChaoXingTask } from "../../../src/shared/contracts";

function makeTask(id: string): ChaoXingTask {
  return {
    id,
    courseId: "c1",
    chapterId: "ch1",
    taskId: id,
    title: "测试视频",
    courseName: "测试课程",
    taskUrl: "https://mooc1.chaoxing.com/test",
    state: "pending",
    progress: 0,
    tabId: null,
    errorMessage: null,
    createdAt: 1,
    updatedAt: 1,
    restoreAttempts: 0,
  };
}

describe("task-store", () => {
  it("addMany 并持久化，重复 id 不入库", async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    const store = createTaskStore({
      load: vi.fn().mockResolvedValue([]),
      save,
    });

    await store.addMany([makeTask("1"), makeTask("1"), makeTask("2")]);
    expect(store.getSnapshot()).toHaveLength(2);
    expect(save).toHaveBeenCalledOnce();
  });

  it("update 修改指定字段并更新 updatedAt", async () => {
    const store = createTaskStore({
      load: vi.fn().mockResolvedValue([makeTask("t1")]),
      save: vi.fn().mockResolvedValue(undefined),
    });
    await store.hydrate();
    await store.update("t1", { state: "running", progress: 50 });

    const task = store.getSnapshot().find((t) => t.id === "t1")!;
    expect(task.state).toBe("running");
    expect(task.progress).toBe(50);
    expect(task.updatedAt).toBeGreaterThan(0);
  });
});
