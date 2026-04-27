import type { PlaybackActivityState, TaskRecord } from "../shared/contracts";
import type { RuntimeCommandMessage, SidePanelSnapshot } from "../shared/messages";
import { createDraftTaskFromUrl } from "../shared/task-factory";

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

type PageHeartbeat = { currentTime: number; paused: boolean; ended: boolean };

type PlaybackStartResult = {
  tabId: number;
  frameId: number;
  heartbeat: PageHeartbeat;
  lastHeartbeatAt: number;
};

type BackgroundRunner = {
  startSource(task: TaskRecord): Promise<PlaybackStartResult>;
  start(task: TaskRecord): Promise<PlaybackStartResult>;
  refresh(
    tabId: number,
    frameId: number
  ): Promise<{ heartbeat: PageHeartbeat; lastHeartbeatAt: number }>;
};

type CurrentTabProvider = {
  getCurrentTab(): Promise<{
    id?: number;
    url?: string;
    title?: string;
  } | null>;
};

type OrchestratorDeps = {
  store: OrchestratorStore;
  scheduler: OrchestratorScheduler;
  resolver(task: Pick<TaskRecord, "sourceUrl" | "directMediaType">): Promise<ResolvedTask>;
  backgroundRunner?: BackgroundRunner;
  currentTabProvider?: CurrentTabProvider;
};

function createSnapshot(tasks: TaskRecord[]): SidePanelSnapshot {
  return { tasks };
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  return error instanceof Error ? error.message : fallbackMessage;
}

function getPlaybackState(
  heartbeat: PageHeartbeat,
  previousCurrentTime: number | null | undefined
): PlaybackActivityState {
  if (heartbeat.ended) {
    return "ended";
  }

  if (heartbeat.paused) {
    return "paused";
  }

  if (
    typeof previousCurrentTime === "number" &&
    heartbeat.currentTime > previousCurrentTime + 0.05
  ) {
    return "advancing";
  }

  return "waiting";
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

  async function addCurrentTabTask(): Promise<SidePanelSnapshot> {
    const tab = await deps.currentTabProvider?.getCurrentTab();

    if (!tab?.url || typeof tab.id !== "number") {
      return getSnapshot();
    }

    const task = createDraftTaskFromUrl(tab.url, {
      sourceTabId: tab.id,
      title: tab.title
    });

    if (!task) {
      return getSnapshot();
    }

    await deps.store.addMany([task]);
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
        try {
          const started = await deps.backgroundRunner.startSource(task);

          await deps.store.update(taskId, {
            state: "playing_background",
            effectiveMode: "background",
            sourceTabId: started.tabId,
            sourceFrameId: started.frameId,
            sourceCurrentTime: started.heartbeat.currentTime,
            sourcePaused: started.heartbeat.paused,
            sourceEnded: started.heartbeat.ended,
            sourceLastHeartbeatAt: started.lastHeartbeatAt,
            sourcePlaybackState: getPlaybackState(
              started.heartbeat,
              task.sourceCurrentTime
            ),
            sourceErrorMessage: null,
            errorMessage: null
          });
          return;
        } catch (sourceError) {
          const started = await deps.backgroundRunner.start(task);

          await deps.store.update(taskId, {
            state: "playing_background",
            effectiveMode: "background",
            tabId: started.tabId,
            frameId: started.frameId,
            currentTime: started.heartbeat.currentTime,
            paused: started.heartbeat.paused,
            ended: started.heartbeat.ended,
            playbackState: getPlaybackState(started.heartbeat, task.currentTime),
            lastHeartbeatAt: started.lastHeartbeatAt,
            sourceErrorMessage: getErrorMessage(
              sourceError,
              "Website page playback failed"
            ),
            errorMessage: null
          });
        }
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
        errorMessage: getErrorMessage(error, "Failed to resolve task")
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

  async function refreshBackgroundTask(task: TaskRecord) {
    if (!deps.backgroundRunner || task.state !== "playing_background") {
      return;
    }

    if (
      typeof task.sourceTabId === "number" &&
      typeof task.sourceFrameId === "number"
    ) {
      try {
        const status = await deps.backgroundRunner.refresh(
          task.sourceTabId,
          task.sourceFrameId
        );

        await deps.store.update(task.id, {
          sourceCurrentTime: status.heartbeat.currentTime,
          sourcePaused: status.heartbeat.paused,
          sourceEnded: status.heartbeat.ended,
          sourceLastHeartbeatAt: status.lastHeartbeatAt,
          sourcePlaybackState: getPlaybackState(
            status.heartbeat,
            task.sourceCurrentTime
          ),
          sourceErrorMessage: null
        });
      } catch (error) {
        await deps.store.update(task.id, {
          sourceErrorMessage: getErrorMessage(
            error,
            "Website page heartbeat failed"
          )
        });
      }
    }

    if (typeof task.tabId !== "number" || typeof task.frameId !== "number") {
      return;
    }

    try {
      const status = await deps.backgroundRunner.refresh(task.tabId, task.frameId);

      await deps.store.update(task.id, {
        currentTime: status.heartbeat.currentTime,
        paused: status.heartbeat.paused,
        ended: status.heartbeat.ended,
        lastHeartbeatAt: status.lastHeartbeatAt,
        playbackState: getPlaybackState(status.heartbeat, task.currentTime)
      });
    } catch (error) {
      await deps.store.update(task.id, {
        errorMessage: getErrorMessage(error, "Background page heartbeat failed")
      });
    }
  }

  async function refreshRunningTasks() {
    const tasks = deps.store.getSnapshot();

    await Promise.all(tasks.map((task) => refreshBackgroundTask(task)));
  }

  async function handleMessage(
    message: RuntimeCommandMessage
  ): Promise<SidePanelSnapshot | null> {
    switch (message.type) {
      case "tasks/add":
        return addDraftTasks(message.payload.tasks);
      case "tasks/add-current-tab":
        return addCurrentTabTask();
      case "tasks/start":
        return startTasks(message.payload.taskIds);
      case "tasks/snapshot-request":
        await refreshRunningTasks();
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
