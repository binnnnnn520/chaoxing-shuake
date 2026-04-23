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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });

  return { promise, resolve, reject };
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

  it("keeps the committed snapshot when persistence rejects a write", async () => {
    const initialTask = createTask();
    const nextTask = createTask({ id: "task-2" });
    const storage = {
      loadTasks: vi.fn(async () => [initialTask]),
      saveTasks: vi
        .fn<(_: TaskRecord[]) => Promise<void>>()
        .mockRejectedValueOnce(new Error("add failed"))
        .mockRejectedValueOnce(new Error("update failed"))
        .mockRejectedValueOnce(new Error("replace failed"))
    };

    const store = createTaskStore(storage);
    await store.hydrate();

    await expect(store.addMany([nextTask])).rejects.toThrow("add failed");
    expect(store.getSnapshot()).toEqual([initialTask]);

    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    await expect(
      store.update(initialTask.id, {
        state: "queued"
      })
    ).rejects.toThrow("update failed");
    expect(store.getSnapshot()).toEqual([initialTask]);

    await expect(store.replaceAll([nextTask])).rejects.toThrow("replace failed");
    expect(store.getSnapshot()).toEqual([initialTask]);
  });

  it("serializes overlapping writes so later mutations wait for committed state", async () => {
    const initialTask = createTask();
    const appendedTask = createTask({
      id: "task-2",
      sourceUrl: "https://video.example.com/queued.webm",
      directMediaType: "webm"
    });
    const firstSave = createDeferred<void>();
    const secondSave = createDeferred<void>();
    const saveTasks = vi
      .fn<(_: TaskRecord[]) => Promise<void>>()
      .mockImplementationOnce(async () => firstSave.promise)
      .mockImplementationOnce(async () => secondSave.promise);
    const storage = {
      loadTasks: vi.fn(async () => [initialTask]),
      saveTasks
    };

    const store = createTaskStore(storage);
    await store.hydrate();

    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    const addPromise = store.addMany([appendedTask]);
    const updatePromise = store.update(appendedTask.id, {
      state: "queued"
    });

    await Promise.resolve();

    expect(saveTasks).toHaveBeenCalledTimes(1);
    expect(saveTasks).toHaveBeenNthCalledWith(1, [initialTask, appendedTask]);

    firstSave.resolve();
    await addPromise;
    await Promise.resolve();

    expect(saveTasks).toHaveBeenCalledTimes(2);
    expect(saveTasks).toHaveBeenNthCalledWith(2, [
      initialTask,
      {
        ...appendedTask,
        state: "queued",
        updatedAt: 1_700_000_123_456
      }
    ]);

    secondSave.resolve();
    await updatePromise;

    expect(store.getSnapshot()).toEqual([
      initialTask,
      {
        ...appendedTask,
        state: "queued",
        updatedAt: 1_700_000_123_456
      }
    ]);
  });

  it("ignores id changes in update patches", async () => {
    const initialTask = createTask();
    const saveTasks = vi.fn(async () => undefined);
    const storage = {
      loadTasks: vi.fn(async () => [initialTask]),
      saveTasks
    };

    const store = createTaskStore(storage);
    await store.hydrate();

    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    const patch = {
      id: "task-hijacked",
      state: "queued"
    } as Partial<TaskRecord>;

    await store.update(initialTask.id, patch);

    expect(saveTasks).toHaveBeenCalledWith([
      {
        ...initialTask,
        state: "queued",
        updatedAt: 1_700_000_123_456
      }
    ]);
    expect(store.getSnapshot()).toEqual([
      {
        ...initialTask,
        state: "queued",
        updatedAt: 1_700_000_123_456
      }
    ]);
  });
});
