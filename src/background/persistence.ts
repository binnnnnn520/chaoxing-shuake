import type { ChaoXingTask } from "../shared/contracts";

const STORAGE_KEY = "chaoxing.tasks";

export async function loadTasks(): Promise<ChaoXingTask[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  return (result[STORAGE_KEY] as ChaoXingTask[] | undefined) ?? [];
}

export async function saveTasks(tasks: ChaoXingTask[]): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEY]: tasks });
}
