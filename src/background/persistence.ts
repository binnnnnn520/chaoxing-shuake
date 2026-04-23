import type { TaskRecord } from "../shared/contracts";

const TASKS_STORAGE_KEY = "multivideo.tasks";

function cloneTasks(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.map((task) => ({ ...task }));
}

export async function loadTasks(): Promise<TaskRecord[]> {
  const stored = await chrome.storage.local.get(TASKS_STORAGE_KEY);
  const tasks = stored[TASKS_STORAGE_KEY];

  if (!Array.isArray(tasks)) {
    return [];
  }

  return cloneTasks(tasks as TaskRecord[]);
}

export async function saveTasks(tasks: TaskRecord[]): Promise<void> {
  await chrome.storage.local.set({
    [TASKS_STORAGE_KEY]: cloneTasks(tasks)
  });
}
