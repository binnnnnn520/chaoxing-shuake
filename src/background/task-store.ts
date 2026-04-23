import type { TaskRecord } from "../shared/contracts";

export interface TaskStoreStorage {
  loadTasks(): Promise<TaskRecord[]>;
  saveTasks(tasks: TaskRecord[]): Promise<void>;
}

export type TaskRecordPatch = Partial<Omit<TaskRecord, "id" | "createdAt">>;

function cloneTasks(tasks: TaskRecord[]): TaskRecord[] {
  return tasks.map((task) => ({ ...task }));
}

export function createTaskStore(storage: TaskStoreStorage) {
  let tasks: TaskRecord[] = [];
  let writeQueue = Promise.resolve();

  function enqueueMutation(
    buildNextTasks: (currentTasks: TaskRecord[]) => TaskRecord[] | null
  ) {
    const operation = writeQueue.then(async () => {
      const nextTasks = buildNextTasks(tasks);

      if (nextTasks === null) {
        return;
      }

      await storage.saveTasks(nextTasks);
      tasks = nextTasks;
    });

    writeQueue = operation.catch(() => undefined);

    return operation;
  }

  return {
    async hydrate() {
      tasks = cloneTasks(await storage.loadTasks());
      return cloneTasks(tasks);
    },

    getSnapshot() {
      return cloneTasks(tasks);
    },

    async addMany(nextTasks: TaskRecord[]) {
      await enqueueMutation((currentTasks) => [
        ...currentTasks,
        ...cloneTasks(nextTasks)
      ]);
    },

    async update(taskId: string, patch: TaskRecordPatch) {
      await enqueueMutation((currentTasks) => {
        let changed = false;
        const safePatch = {
          ...(patch as TaskRecordPatch &
            Partial<Pick<TaskRecord, "id" | "createdAt">>)
        };
        delete safePatch.id;
        delete safePatch.createdAt;

        const nextTasks = currentTasks.map((task) => {
          if (task.id !== taskId) {
            return task;
          }

          changed = true;
          return {
            ...task,
            ...safePatch,
            updatedAt: Date.now()
          };
        });

        if (!changed) {
          return null;
        }

        return nextTasks;
      });
    },

    async replaceAll(nextTasks: TaskRecord[]) {
      await enqueueMutation(() => cloneTasks(nextTasks));
    }
  };
}
