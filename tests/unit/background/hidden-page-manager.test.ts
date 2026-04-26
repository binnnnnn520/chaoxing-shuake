import { describe, expect, it, vi } from "vitest";
import { createHiddenPageManager } from "../../../src/background/hidden-page-manager";

describe("createHiddenPageManager", () => {
  it("opens inactive tabs and remembers the tab id by task id", async () => {
    const tabsApi = {
      create: vi
        .fn()
        .mockResolvedValueOnce({ id: 101 })
        .mockResolvedValueOnce({ id: 202 }),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const manager = createHiddenPageManager(tabsApi);

    await expect(manager.open("https://video.example.com/first", "task-1")).resolves.toBe(101);
    await expect(manager.open("https://video.example.com/second")).resolves.toBe(202);

    expect(tabsApi.create).toHaveBeenNthCalledWith(1, {
      url: "https://video.example.com/first",
      active: false
    });
    expect(tabsApi.create).toHaveBeenNthCalledWith(2, {
      url: "https://video.example.com/second",
      active: false
    });
    expect(manager.getTabId("task-1")).toBe(101);
    expect(manager.getTabId("missing-task")).toBeNull();
  });

  it("closes remembered tabs and clears the task mapping", async () => {
    const tabsApi = {
      create: vi.fn().mockResolvedValue({ id: 303 }),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const manager = createHiddenPageManager(tabsApi);

    await manager.open("https://video.example.com/watch", "task-3");
    await manager.close("task-3");
    await manager.close("missing-task");

    expect(tabsApi.remove).toHaveBeenCalledTimes(1);
    expect(tabsApi.remove).toHaveBeenCalledWith(303);
    expect(manager.getTabId("task-3")).toBeNull();
  });

  it("closes the previous hidden tab before replacing a task mapping", async () => {
    const tabsApi = {
      create: vi
        .fn()
        .mockResolvedValueOnce({ id: 401 })
        .mockResolvedValueOnce({ id: 402 }),
      remove: vi.fn().mockResolvedValue(undefined)
    };
    const manager = createHiddenPageManager(tabsApi);

    await manager.open("https://video.example.com/first", "task-4");
    await manager.open("https://video.example.com/restart", "task-4");

    expect(tabsApi.remove).toHaveBeenCalledWith(401);
    expect(manager.getTabId("task-4")).toBe(402);
  });

  it("keeps the task mapping when tab removal fails", async () => {
    const tabsApi = {
      create: vi.fn().mockResolvedValue({ id: 501 }),
      remove: vi.fn().mockRejectedValue(new Error("remove failed"))
    };
    const manager = createHiddenPageManager(tabsApi);

    await manager.open("https://video.example.com/watch", "task-5");

    await expect(manager.close("task-5")).rejects.toThrow("remove failed");
    expect(manager.getTabId("task-5")).toBe(501);
  });
});
