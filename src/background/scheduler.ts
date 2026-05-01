export function createScheduler(limit: number) {
  const queue: string[] = [];
  const active = new Set<string>();

  return {
    enqueue(taskId: string) {
      if (!queue.includes(taskId) && !active.has(taskId)) {
        queue.push(taskId);
      }
    },
    claimNextBatch(): string[] {
      const claimed: string[] = [];
      while (active.size < limit && queue.length > 0) {
        const next = queue.shift()!;
        active.add(next);
        claimed.push(next);
      }
      return claimed;
    },
    release(taskId: string) {
      active.delete(taskId);
    },
    getActiveIds(): string[] {
      return [...active];
    },
    getQueueLength(): number {
      return queue.length;
    },
  };
}

export type Scheduler = ReturnType<typeof createScheduler>;
