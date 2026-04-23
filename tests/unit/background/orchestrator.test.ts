import { describe, expect, it, vi } from "vitest";
import type { TaskRecord } from "../../../src/shared/contracts";
import type { RuntimeCommandMessage, SidePanelSnapshot } from "../../../src/shared/messages";
import { createOrchestrator } from "../../../src/background/orchestrator";

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

function cloneTasks(tasks: TaskRecord[]) {
  return tasks.map((task) => ({ ...task }));
}

function createStore(initialTasks: TaskRecord[] = []) {
  let tasks = cloneTasks(initialTasks);

  return {
    hydrate: vi.fn(async () => cloneTasks(tasks)),
    getSnapshot: vi.fn(() => cloneTasks(tasks)),
    addMany: vi.fn(async (nextTasks: TaskRecord[]) => {
      tasks = [...tasks, ...cloneTasks(nextTasks)];
    }),
    update: vi.fn(async (taskId: string, patch: Partial<TaskRecord>) => {
      tasks = tasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              ...patch,
              updatedAt: Date.now()
            }
          : task
      );
    })
  };
}

function createDeferredResolution() {
  let resolve!: (value: {
    effectiveMode: "inline" | "background";
    state: "ready_inline" | "ready_background";
    mediaUrl: string | null;
  }) => void;

  const promise = new Promise<{
    effectiveMode: "inline" | "background";
    state: "ready_inline" | "ready_background";
    mediaUrl: string | null;
  }>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

async function flushMicrotasks() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("createOrchestrator", () => {
  it("adds draft tasks and returns snapshots for the side panel message flow", async () => {
    const existingTask = createTask();
    const draftTask = createTask({
      id: "task-2",
      sourceUrl: "https://video.example.com/queued.webm",
      directMediaType: "webm"
    });
    const store = createStore([existingTask]);
    const orchestrator = createOrchestrator({
      store,
      scheduler: {
        enqueue: vi.fn(),
        claimNextBatch: vi.fn().mockReturnValue([]),
        release: vi.fn()
      },
      resolver: vi.fn()
    });

    await expect(
      orchestrator.handleMessage({ type: "tasks/snapshot-request" })
    ).resolves.toEqual({ tasks: [existingTask] });

    await expect(
      orchestrator.handleMessage({
        type: "tasks/add",
        payload: { tasks: [draftTask] }
      } satisfies RuntimeCommandMessage)
    ).resolves.toEqual({
      tasks: [existingTask, draftTask]
    });

    expect(store.addMany).toHaveBeenCalledWith([draftTask]);
    expect(orchestrator.getSnapshot()).toEqual({
      tasks: [existingTask, draftTask]
    });
  });

  it("enqueues selected tasks, marks claimed work as starting, and persists resolved state", async () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_123_456);

    const firstTask = createTask();
    const secondTask = createTask({
      id: "task-2",
      sourceUrl: "https://video.example.com/queued.webm",
      directMediaType: "webm"
    });
    const store = createStore([firstTask, secondTask]);
    const scheduler = {
      enqueue: vi.fn(),
      claimNextBatch: vi.fn().mockReturnValue([firstTask.id]),
      release: vi.fn(),
      getActiveIds: vi.fn().mockReturnValue([firstTask.id])
    };
    const deferred = createDeferredResolution();
    const resolver = vi.fn(() => deferred.promise);
    const orchestrator = createOrchestrator({
      store,
      scheduler,
      resolver
    });

    const snapshot = await orchestrator.handleMessage({
      type: "tasks/start",
      payload: { taskIds: [firstTask.id, secondTask.id] }
    });

    expect(scheduler.enqueue).toHaveBeenNthCalledWith(1, firstTask.id);
    expect(scheduler.enqueue).toHaveBeenNthCalledWith(2, secondTask.id);
    expect(scheduler.claimNextBatch).toHaveBeenCalledTimes(1);
    expect(snapshot).toEqual({
      tasks: [
        {
          ...firstTask,
          state: "starting",
          updatedAt: 1_700_000_123_456
        },
        {
          ...secondTask,
          state: "queued",
          updatedAt: 1_700_000_123_456
        }
      ]
    });
    expect(store.update).toHaveBeenNthCalledWith(1, firstTask.id, {
      state: "queued",
      errorMessage: null
    });
    expect(store.update).toHaveBeenNthCalledWith(2, secondTask.id, {
      state: "queued",
      errorMessage: null
    });
    expect(store.update).toHaveBeenNthCalledWith(3, firstTask.id, {
      state: "starting",
      errorMessage: null
    });
    expect(resolver).toHaveBeenCalledWith(
      expect.objectContaining({
        id: firstTask.id,
        sourceUrl: firstTask.sourceUrl,
        directMediaType: firstTask.directMediaType
      })
    );

    deferred.resolve({
      effectiveMode: "inline",
      state: "ready_inline",
      mediaUrl: firstTask.sourceUrl
    });
    await flushMicrotasks();

    expect(store.update).toHaveBeenNthCalledWith(4, firstTask.id, {
      state: "ready_inline",
      effectiveMode: "inline",
      errorMessage: null
    });
    expect(scheduler.release).toHaveBeenCalledWith(firstTask.id);
    expect(orchestrator.getSnapshot()).toEqual({
      tasks: [
        {
          ...firstTask,
          state: "ready_inline",
          effectiveMode: "inline",
          updatedAt: 1_700_000_123_456
        },
        {
          ...secondTask,
          state: "queued",
          updatedAt: 1_700_000_123_456
        }
      ]
    });
  });
});
