import type { TaskRecord } from "../shared/contracts";

export interface TaskStoreStorage {
  loadTasks(): Promise<TaskRecord[]>;
  saveTasks(tasks: TaskRecord[]): Promise<void>;
}

function cloneTasks(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.map((task) => ({ ...task }));
}

export function createTaskStore(storage: TaskStoreStorage) {
  let tasks: TaskRecord[] = [];

  return {
    async hydrate() {
      tasks = cloneTasks(await storage.loadTasks());
      return cloneTasks(tasks);
    },

    getSnapshot() {
      return cloneTasks(tasks);
    },

    async addMany(nextTasks: TaskRecord[]) {
      tasks = [...tasks, ...cloneTasks(nextTasks)];
      await storage.saveTasks(tasks);
    },

    async update(taskId: string, patch: Partial<TaskRecord>) {
      let changed = false;

      tasks = tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }

        changed = true;
        return {
          ...task,
          ...patch,
          updatedAt: Date.now()
        };
      });

      if (!changed) {
        return;
      }

      await storage.saveTasks(tasks);
    },

    async replaceAll(nextTasks: TaskRecord[]) {
      tasks = cloneTasks(nextTasks);
      await storage.saveTasks(tasks);
    }
  };
}
