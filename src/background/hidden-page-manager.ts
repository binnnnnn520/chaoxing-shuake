type HiddenPageTabsApi = {
  create(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
  remove(tabId: number): Promise<void>;
};

export function createHiddenPageManager(tabsApi: HiddenPageTabsApi) {
  const taskToTabId = new Map<string, number>();

  return {
    async open(url: string, taskId?: string): Promise<number> {
      const previousTabId = taskId ? taskToTabId.get(taskId) : null;

      if (taskId && typeof previousTabId === "number") {
        await tabsApi.remove(previousTabId);
        taskToTabId.delete(taskId);
      }

      const tab = await tabsApi.create({
        url,
        active: false
      });

      if (typeof tab.id !== "number") {
        throw new Error("Hidden page tab is missing an id");
      }

      if (taskId) {
        taskToTabId.set(taskId, tab.id);
      }

      return tab.id;
    },
    getTabId(taskId: string): number | null {
      return taskToTabId.get(taskId) ?? null;
    },
    async close(taskId: string): Promise<void> {
      const tabId = taskToTabId.get(taskId);

      if (typeof tabId !== "number") {
        return;
      }

      await tabsApi.remove(tabId);
      taskToTabId.delete(taskId);
    }
  };
}
