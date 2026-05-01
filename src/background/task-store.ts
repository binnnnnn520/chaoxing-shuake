import type { ChaoXingTask } from "../shared/contracts";

interface StorageAdapter {
  load(): Promise<ChaoXingTask[]>;
  save(tasks: ChaoXingTask[]): Promise<void>;
}

export function createTaskStore(storage: StorageAdapter) {
  let tasks: ChaoXingTask[] = [];

  return {
    async hydrate() {
      tasks = await storage.load();
      return tasks;
    },
    getSnapshot(): ChaoXingTask[] {
      return [...tasks];
    },
    async addMany(nextTasks: ChaoXingTask[]) {
      // 去重：已存在的 id 和输入内部重复的 id 都不入库
      const seenIds = new Set(tasks.map((t) => t.id));
      const fresh: ChaoXingTask[] = [];
      for (const t of nextTasks) {
        if (!seenIds.has(t.id)) {
          seenIds.add(t.id);
          fresh.push(t);
        }
      }
      tasks = [...tasks, ...fresh];
      await storage.save(tasks);
    },
    async update(taskId: string, patch: Partial<ChaoXingTask>) {
      tasks = tasks.map((t) =>
        t.id === taskId ? { ...t, ...patch, updatedAt: Date.now() } : t
      );
      await storage.save(tasks);
    },
    async replaceAll(nextTasks: ChaoXingTask[]) {
      tasks = [...nextTasks];
      await storage.save(tasks);
    },
  };
}

export type TaskStore = ReturnType<typeof createTaskStore>;
