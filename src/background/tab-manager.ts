export function createTabManager() {
  const taskToTab = new Map<string, number>();

  return {
    async open(taskId: string, url: string): Promise<number> {
      const tab = await chrome.tabs.create({ url, active: false });
      const tabId = tab.id!;
      taskToTab.set(taskId, tabId);
      return tabId;
    },
    getTabId(taskId: string): number | null {
      return taskToTab.get(taskId) ?? null;
    },
    getTaskId(tabId: number): string | null {
      for (const [task, tab] of taskToTab) {
        if (tab === tabId) return task;
      }
      return null;
    },
    async close(taskId: string) {
      const tabId = taskToTab.get(taskId);
      if (typeof tabId === "number") {
        try {
          await chrome.tabs.remove(tabId);
        } catch {
          // tab 可能已经被用户手动关闭
        }
        taskToTab.delete(taskId);
      }
    },
  };
}

export type TabManager = ReturnType<typeof createTabManager>;
