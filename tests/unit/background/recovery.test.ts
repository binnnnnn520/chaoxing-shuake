import { describe, expect, it, vi } from "vitest";
import { createOrchestrator } from "../../../src/background/orchestrator";
import type { TaskRecord } from "../../../src/shared/contracts";

function createTask(overrides: Partial<TaskRecord> = {}): TaskRecord {
  return {
    id: "task-1",
    sourceUrl: "https://site.test/watch",
    title: "site.test",
    domain: "site.test",
    state: "playing_background",
    requestedMode: null,
    effectiveMode: "background",
    directMediaType: null,
    muted: true,
    volume: 1,
    rate: 1,
    errorMessage: null,
    tabId: 42,
    lastHeartbeatAt: 1_700_000_000_000,
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    restoreAttempts: 0,
    ...overrides
  };
}

describe("restoreTasks", () => {
  it("marks a task as error after repeated restore failures", async () => {
    const task = createTask({ restoreAttempts: 2 });
    const store = {
      hydrate: vi.fn(),
      getSnapshot: vi.fn().mockReturnValue([task]),
      addMany: vi.fn(),
      update: vi.fn()
    };
    const scheduler = {
      enqueue: vi.fn(),
      claimNextBatch: vi.fn().mockReturnValue([]),
      release: vi.fn()
    };
    const orchestrator = createOrchestrator({
      store,
      scheduler,
      resolver: vi.fn()
    });

    await orchestrator.restoreTasks(2);

    expect(store.update).toHaveBeenCalledWith(task.id, {
      state: "error",
      errorMessage: "Automatic recovery limit reached"
    });
    expect(scheduler.enqueue).not.toHaveBeenCalled();
  });

  it("requeues playing tasks below the restore limit", async () => {
    const task = createTask({ restoreAttempts: 1 });
    const store = {
      hydrate: vi.fn(),
      getSnapshot: vi.fn().mockReturnValue([task]),
      addMany: vi.fn(),
      update: vi.fn()
    };
    const scheduler = {
      enqueue: vi.fn(),
      claimNextBatch: vi.fn().mockReturnValue([]),
      release: vi.fn()
    };
    const orchestrator = createOrchestrator({
      store,
      scheduler,
      resolver: vi.fn()
    });

    await orchestrator.restoreTasks(3);

    expect(store.update).toHaveBeenCalledWith(task.id, {
      state: "queued",
      restoreAttempts: 2
    });
    expect(scheduler.enqueue).toHaveBeenCalledWith(task.id);
  });
});
