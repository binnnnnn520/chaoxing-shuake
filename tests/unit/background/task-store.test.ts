import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskRecord } from "../../../src/shared/contracts";
import { createTaskStore } from "../../../src/background/task-store";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    sourceUrl: "https://video.example.com/watch.mp4",
    title: "Example Video",
    domain: "video.example.com",
    state: "draft",
    requestedMode: null,
    effectiveMode: null,
    directMediaType: "mp4",
    muted: true,
    volume: 1,
    rate: 1,
    errorMessage: null,
    tabId: null,
    lastHeartbeatAt: null,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    restoreAttempts: 0,
    ...overrides
  };
}

describe("createTaskStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("hydrates tasks and persists snapshot updates through the store", async () => {
    const hydratedTask = createTask();
    const queuedTask = createTask({
      id: "task-2",
      sourceUrl: "https://video.example.com/next.webm",
      directMediaType: "webm"
    });
    const replacedTask = createTask({
      id: "task-3",
      sourceUrl: "https://video.example.com/replaced.m3u8",
      directMediaType: "m3u8"
    });
    const saveTasks = vi.fn(async () => undefined);
    const storage = {
      loadTasks: vi.fn(async () => [hydratedTask]),
      saveTasks
    };

    const store = createTaskStore(storage);

    await expect(store.hydrate()).resolves.toEqual([hydratedTask]);
    expect(store.getSnapshot()).toEqual([hydratedTask]);

    await store.addMany([queuedTask]);
    expect(saveTasks).toHaveBeenNthCalledWith(1, [hydratedTask, queuedTask]);
    expect(store.getSnapshot()).toEqual([hydratedTask, queuedTask]);

    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    await store.update(queuedTask.id, {
      state: "queued",
      requestedMode: "background",
      effectiveMode: "background"
    });

    expect(saveTasks).toHaveBeenNthCalledWith(2, [
      hydratedTask,
      {
        ...queuedTask,
        state: "queued",
        requestedMode: "background",
        effectiveMode: "background",
        updatedAt: 1_700_000_123_456
      }
    ]);
    expect(store.getSnapshot()).toEqual([
      hydratedTask,
      {
        ...queuedTask,
        state: "queued",
        requestedMode: "background",
        effectiveMode: "background",
        updatedAt: 1_700_000_123_456
      }
    ]);

    await store.replaceAll([replacedTask]);

    expect(saveTasks).toHaveBeenNthCalledWith(3, [replacedTask]);
    expect(store.getSnapshot()).toEqual([replacedTask]);
  });

  it("returns defensive copies for hydrated and snapshot task arrays", async () => {
    const hydratedTask = createTask();
    const storage = {
      loadTasks: vi.fn(async () => [hydratedTask]),
      saveTasks: vi.fn(async () => undefined)
    };

    const store = createTaskStore(storage);
    const hydrated = await store.hydrate();
    hydrated.push(createTask({ id: "task-2" }));

    const snapshot = store.getSnapshot();
    snapshot[0].title = "Mutated title";
    snapshot.push(createTask({ id: "task-3" }));

    expect(store.getSnapshot()).toEqual([hydratedTask]);
  });
});
