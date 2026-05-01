import type { TaskStore } from "./task-store";
import type { Scheduler } from "./scheduler";
import type { TabManager } from "./tab-manager";
import { scanActiveTab, ScanError } from "./course-scanner";

export function createOrchestrator(deps: {
  store: TaskStore;
  scheduler: Scheduler;
  tabManager: TabManager;
}) {
  const { store, scheduler, tabManager } = deps;

  async function claimAndRun() {
    const ids = scheduler.claimNextBatch();
    for (const id of ids) {
      const task = store.getSnapshot().find((t) => t.id === id);
      if (!task) continue;
      try {
        await store.update(id, { state: "running" });
        const tabId = await tabManager.open(id, task.taskUrl);
        await store.update(id, { tabId });
      } catch (err) {
        scheduler.release(id);
        await store.update(id, {
          state: "error",
          errorMessage: String(err),
        });
      }
    }
  }

  return {
    /** 仅扫描当前活动 tab,任务进 store 状态为 pending,不启动 */
    async scanCurrentTab(): Promise<{ count: number }> {
      try {
        const tasks = await scanActiveTab();
        await store.addMany(tasks);
        return { count: tasks.length };
      } catch (err) {
        if (err instanceof ScanError) {
          throw err;
        }
        throw new Error(`扫描失败: ${String(err)}`);
      }
    },

    /** 启动所有 pending 任务 */
    async startAllPending(): Promise<{ started: number }> {
      const pending = store.getSnapshot().filter((t) => t.state === "pending");
      pending.forEach((t) => scheduler.enqueue(t.id));
      // 已入队的任务标记为 queued
      for (const t of pending) {
        await store.update(t.id, { state: "queued" });
      }
      await claimAndRun();
      return { started: pending.length };
    },

    async onCompleted(taskId: string) {
      await store.update(taskId, { state: "completed", progress: 100 });
      scheduler.release(taskId);
      await tabManager.close(taskId);
      await claimAndRun(); // 补充下一条
    },

    async onTabClosed(tabId: number) {
      const taskId = tabManager.getTaskId(tabId);
      if (!taskId) return;
      const task = store.getSnapshot().find((t) => t.id === taskId);
      if (task && task.state === "running") {
        scheduler.release(taskId);
        await store.update(taskId, {
          state: "error",
          errorMessage: "标签页被关闭",
        });
        await claimAndRun();
      }
    },

    async stopTask(taskId: string) {
      scheduler.release(taskId);
      await tabManager.close(taskId);
      await store.update(taskId, { state: "pending" });
    },
  };
}

export type Orchestrator = ReturnType<typeof createOrchestrator>;
