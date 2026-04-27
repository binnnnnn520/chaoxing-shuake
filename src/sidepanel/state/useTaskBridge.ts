import { useEffect, useState } from "react";
import type { TaskRecord } from "../../shared/contracts";
import type { RuntimeCommandMessage, SidePanelSnapshot } from "../../shared/messages";
import { createDraftTasks } from "../../shared/task-factory";

const emptySnapshot: SidePanelSnapshot = { tasks: [] };
const SNAPSHOT_POLL_INTERVAL_MS = 1000;

function getRuntime() {
  if (typeof chrome === "undefined" || !chrome.runtime?.sendMessage) {
    return null;
  }

  return chrome.runtime;
}

function isSnapshot(value: unknown): value is SidePanelSnapshot {
  return (
    typeof value === "object" &&
    value !== null &&
    "tasks" in value &&
    Array.isArray((value as SidePanelSnapshot).tasks)
  );
}

async function sendMessage(
  message: RuntimeCommandMessage
): Promise<SidePanelSnapshot | null> {
  const runtime = getRuntime();

  if (!runtime) {
    return null;
  }

  try {
    const response = await runtime.sendMessage(message);
    return isSnapshot(response) ? response : null;
  } catch {
    return null;
  }
}

function mergeTasks(tasks: TaskRecord[], nextTasks: TaskRecord[]): TaskRecord[] {
  const nextById = new Map(tasks.map((task) => [task.id, task]));

  for (const task of nextTasks) {
    nextById.set(task.id, task);
  }

  return Array.from(nextById.values());
}

export function useTaskBridge() {
  const [snapshot, setSnapshot] = useState<SidePanelSnapshot>(emptySnapshot);

  useEffect(() => {
    let isMounted = true;

    function refreshSnapshot() {
      void sendMessage({ type: "tasks/snapshot-request" }).then(
        (nextSnapshot) => {
          if (isMounted && nextSnapshot) {
            setSnapshot(nextSnapshot);
          }
        }
      );
    }

    refreshSnapshot();
    const intervalId = window.setInterval(
      refreshSnapshot,
      SNAPSHOT_POLL_INTERVAL_MS
    );

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, []);

  async function addDrafts(rawValue: string) {
    const drafts = createDraftTasks(rawValue);

    if (drafts.length === 0) {
      return;
    }

    const nextSnapshot = await sendMessage({
      type: "tasks/add",
      payload: { tasks: drafts }
    });

    setSnapshot((currentSnapshot) =>
      nextSnapshot ?? {
        tasks: mergeTasks(currentSnapshot.tasks, drafts)
      }
    );
  }

  async function startTask(taskId: string) {
    const nextSnapshot = await sendMessage({
      type: "tasks/start",
      payload: { taskIds: [taskId] }
    });

    setSnapshot((currentSnapshot) =>
      nextSnapshot ?? {
        tasks: currentSnapshot.tasks.map((task) =>
          task.id === taskId
            ? {
                ...task,
                state: "queued",
                updatedAt: Date.now()
              }
            : task
        )
      }
    );
  }

  return {
    tasks: snapshot.tasks,
    addDrafts,
    startTask
  };
}
