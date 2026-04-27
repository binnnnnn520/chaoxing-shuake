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
