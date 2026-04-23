export interface Scheduler {
  enqueue(taskId: string): void;
  claimNextBatch(): string[];
  release(taskId: string): void;
  getActiveIds(): string[];
}

export function createScheduler(limit: number): Scheduler {
  const pendingQueue: string[] = [];
  const activeIds = new Set<string>();

  return {
    enqueue(taskId) {
      if (activeIds.has(taskId) || pendingQueue.includes(taskId)) {
        return;
      }

      pendingQueue.push(taskId);
    },

    claimNextBatch() {
      const availableSlots = limit - activeIds.size;

      if (availableSlots <= 0) {
        return [];
      }

      const claimed = pendingQueue.splice(0, availableSlots);

      for (const taskId of claimed) {
        activeIds.add(taskId);
      }

      return claimed;
    },

    release(taskId) {
      activeIds.delete(taskId);
    },

    getActiveIds() {
      return [...activeIds];
    }
  };
}
