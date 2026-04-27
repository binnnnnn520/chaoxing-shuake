import type { TaskRecord } from "../shared/contracts";
import type { RuntimeCommandMessage, SidePanelSnapshot } from "../shared/messages";

type ResolvedTask = {
  effectiveMode: "inline" | "background";
  state: "ready_inline" | "ready_background";
  mediaUrl: string | null;
};

type OrchestratorStore = {
  hydrate(): Promise<TaskRecord[]>;
  getSnapshot(): TaskRecord[];
  addMany(tasks: TaskRecord[]): Promise<void>;
  update(taskId: string, patch: Partial<TaskRecord>): Promise<void>;
};

type OrchestratorScheduler = {
  enqueue(taskId: string): void;
  claimNextBatch(): string[];
  release(taskId: string): void;
};

type BackgroundRunner = {
  start(task: TaskRecord): Promise<{
    tabId: number;
    lastHeartbeatAt: number;
  }>;
};

type OrchestratorDeps = {
  store: OrchestratorStore;
  scheduler: OrchestratorScheduler;
  resolver(task: Pick<TaskRecord, "sourceUrl" | "directMediaType">): Promise<ResolvedTask>;
  backgroundRunner?: BackgroundRunner;
};

function createSnapshot(tasks: TaskRecord[]): SidePanelSnapshot {
  return { tasks };
}

export function createOrchestrator(deps: OrchestratorDeps) {
  function getSnapshot(): SidePanelSnapshot {
    return createSnapshot(deps.store.getSnapshot());
  }

  async function hydrate(): Promise<SidePanelSnapshot> {
    await deps.store.hydrate();
    return getSnapshot();
  }

  async function addDraftTasks(tasks: TaskRecord[]): Promise<SidePanelSnapshot> {
    if (tasks.length > 0) {
      await deps.store.addMany(tasks);
    }

    return getSnapshot();
  }

  async function resolveClaimedTask(taskId: string) {
    const task = deps.store.getSnapshot().find((candidate) => candidate.id === taskId);

    if (!task) {
      deps.scheduler.release(taskId);
      return;
    }

    try {
      const resolved = await deps.resolver(task);

      if (resolved.effectiveMode === "background" && deps.backgroundRunner) {
        const started = await deps.backgroundRunner.start(task);

        await deps.store.update(taskId, {
          state: "playing_background",
          effectiveMode: "background",
          tabId: started.tabId,
          lastHeartbeatAt: started.lastHeartbeatAt,
          errorMessage: null
        });
        return;
      }

      await deps.store.update(taskId, {
        state: resolved.state,
        effectiveMode: resolved.effectiveMode,
        errorMessage: null
      });
    } catch (error) {
      await deps.store.update(taskId, {
        state: "error",
        effectiveMode: null,
        errorMessage:
          error instanceof Error ? error.message : "Failed to resolve task"
      });
    } finally {
      deps.scheduler.release(taskId);
    }
  }

  async function startTasks(taskIds: string[]): Promise<SidePanelSnapshot> {
    for (const taskId of taskIds) {
      deps.scheduler.enqueue(taskId);
      await deps.store.update(taskId, {
        state: "queued",
        errorMessage: null
      });
    }

    const claimedTaskIds = deps.scheduler.claimNextBatch();

    for (const taskId of claimedTaskIds) {
      await deps.store.update(taskId, {
        state: "starting",
        errorMessage: null
      });
    }

    const snapshot = getSnapshot();
    void Promise.all(claimedTaskIds.map((taskId) => resolveClaimedTask(taskId)));

    return snapshot;
  }

  async function restoreTasks(maxRestoreAttempts: number): Promise<SidePanelSnapshot> {
    for (const task of deps.store.getSnapshot()) {
      if (
        task.state !== "playing_inline" &&
        task.state !== "playing_background"
      ) {
        continue;
      }

      if (task.restoreAttempts >= maxRestoreAttempts) {
        await deps.store.update(task.id, {
          state: "error",
          errorMessage: "Automatic recovery limit reached"
        });
        continue;
      }

      await deps.store.update(task.id, {
        state: "queued",
        restoreAttempts: task.restoreAttempts + 1
      });
      deps.scheduler.enqueue(task.id);
    }

    return getSnapshot();
  }

  async function handleMessage(
    message: RuntimeCommandMessage
  ): Promise<SidePanelSnapshot | null> {
    switch (message.type) {
      case "tasks/add":
        return addDraftTasks(message.payload.tasks);
      case "tasks/start":
        return startTasks(message.payload.taskIds);
      case "tasks/snapshot-request":
        return getSnapshot();
      default:
        return null;
    }
  }

  return {
    hydrate,
    getSnapshot,
    addDraftTasks,
    startTasks,
    restoreTasks,
    handleMessage
  };
}
