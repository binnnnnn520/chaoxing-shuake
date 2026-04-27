import { describe, expect, it, vi } from "vitest";
import { createBackgroundPageRunner } from "../../../src/background/background-page-runner";
import type { TaskRecord } from "../../../src/shared/contracts";

const task = {
  id: "task-1",
  sourceUrl: "https://site.test/watch",
  title: "site.test",
  domain: "site.test",
  state: "starting",
  requestedMode: null,
  effectiveMode: "background",
  directMediaType: null,
  muted: true,
  volume: 1,
  rate: 1,
  errorMessage: null,
  tabId: null,
  lastHeartbeatAt: null,
  createdAt: 1,
  updatedAt: 1,
  restoreAttempts: 0
} satisfies TaskRecord;

describe("createBackgroundPageRunner", () => {
  it("starts playback in the recorded website tab before using fallback pages", async () => {
    const scripting = {
      executeScript: vi
        .fn()
        .mockResolvedValueOnce([{ frameId: 0 }])
        .mockResolvedValueOnce([{ frameId: 0, result: true }])
    };
    const tabs = {
      create: vi.fn(),
      query: vi.fn(),
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          heartbeat: { currentTime: 8, paused: false, ended: false }
        })
    };
    const runner = createBackgroundPageRunner({
      hiddenPages: {
        open: vi.fn()
      },
      scripting,
      tabs,
      now: () => 1_700_000_123_000
    });

    await expect(
      runner.startSource({
        ...task,
        sourceTabId: 33
      })
    ).resolves.toEqual({
      tabId: 33,
      frameId: 0,
      heartbeat: { currentTime: 8, paused: false, ended: false },
      lastHeartbeatAt: 1_700_000_123_000
    });

    expect(tabs.create).not.toHaveBeenCalled();
    expect(scripting.executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 33, allFrames: true },
      files: ["content-runner.js"]
    });
    expect(tabs.sendMessage).toHaveBeenNthCalledWith(
      2,
      33,
      { type: "page/play" },
      { frameId: 0 }
    );
  });

  it("refreshes a known website tab heartbeat without restarting playback", async () => {
    const tabs = {
      create: vi.fn(),
      query: vi.fn(),
      sendMessage: vi.fn().mockResolvedValue({
        ok: true,
        heartbeat: { currentTime: 13, paused: false, ended: false }
      })
    };
    const runner = createBackgroundPageRunner({
      hiddenPages: {
        open: vi.fn()
      },
      scripting: {
        executeScript: vi.fn()
      },
      tabs,
      now: () => 1_700_000_124_000
    });

    await expect(runner.refresh(33, 0)).resolves.toEqual({
      heartbeat: { currentTime: 13, paused: false, ended: false },
      lastHeartbeatAt: 1_700_000_124_000
    });

    expect(tabs.sendMessage).toHaveBeenCalledWith(
      33,
      { type: "page/status" },
      { frameId: 0 }
    );
  });

  it("opens a hidden tab, injects the runner into the video frame, and starts playback", async () => {
    const hiddenPages = {
      open: vi.fn().mockResolvedValue(77)
    };
    const scripting = {
      executeScript: vi
        .fn()
        .mockResolvedValueOnce([{ frameId: 0 }, { frameId: 4 }])
        .mockResolvedValueOnce([
          { frameId: 0, result: false },
          { frameId: 4, result: true }
        ])
    };
    const tabs = {
      sendMessage: vi
        .fn()
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({ ok: true })
        .mockResolvedValueOnce({
          ok: true,
          heartbeat: { currentTime: 12, paused: false, ended: false }
        })
    };
    const runner = createBackgroundPageRunner({
      hiddenPages,
      scripting,
      tabs,
      now: () => 1_700_000_123_456
    });

    await expect(runner.start(task)).resolves.toEqual({
      tabId: 77,
      frameId: 4,
      heartbeat: { currentTime: 12, paused: false, ended: false },
      lastHeartbeatAt: 1_700_000_123_456
    });

    expect(hiddenPages.open).toHaveBeenCalledWith(task.sourceUrl, task.id);
    expect(scripting.executeScript).toHaveBeenNthCalledWith(1, {
      target: { tabId: 77, allFrames: true },
      files: ["content-runner.js"]
    });
    expect(tabs.sendMessage).toHaveBeenNthCalledWith(
      1,
      77,
      {
        type: "page/set-audio",
        payload: { muted: true, volume: 1, rate: 1 }
      },
      { frameId: 4 }
    );
    expect(tabs.sendMessage).toHaveBeenNthCalledWith(
      2,
      77,
      { type: "page/play" },
      { frameId: 4 }
    );
  });

  it("fails clearly when no injected frame contains a video", async () => {
    const runner = createBackgroundPageRunner({
      hiddenPages: {
        open: vi.fn().mockResolvedValue(88)
      },
      scripting: {
        executeScript: vi
          .fn()
          .mockResolvedValueOnce([{ frameId: 0 }])
          .mockResolvedValueOnce([{ frameId: 0, result: false }])
      },
      tabs: {
        sendMessage: vi.fn()
      },
      now: () => 1
    });

    await expect(runner.start(task)).rejects.toThrow(
      "No controllable video element found on page"
    );
  });

  it("requires a page heartbeat before confirming background playback", async () => {
    const runner = createBackgroundPageRunner({
      hiddenPages: {
        open: vi.fn().mockResolvedValue(99)
      },
      scripting: {
        executeScript: vi
          .fn()
          .mockResolvedValueOnce([{ frameId: 0 }])
          .mockResolvedValueOnce([{ frameId: 0, result: true }])
      },
      tabs: {
        sendMessage: vi
          .fn()
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({ ok: true })
          .mockResolvedValueOnce({ ok: true })
      },
      now: () => 1
    });

    await expect(runner.start(task)).rejects.toThrow(
      "Failed to confirm background page playback"
    );
  });
});
