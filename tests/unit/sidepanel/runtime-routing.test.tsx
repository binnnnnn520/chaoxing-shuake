import React from "react";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../src/sidepanel/App";
import type { TaskRecord } from "../../../src/shared/contracts";
import type { SidePanelSnapshot } from "../../../src/shared/messages";

vi.mock("../../../src/sidepanel/components/InlineTaskCard", () => ({
  InlineTaskCard: ({ task }: { task: TaskRecord }) => (
    <article>Inline card: {task.title}</article>
  )
}));

function setChrome(value: typeof chrome | undefined) {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    writable: true,
    value
  });
}

function createTask(overrides: Partial<TaskRecord>): TaskRecord {
  return {
    id: "task-1",
    sourceUrl: "https://video.example.com/watch",
    title: "Video task",
    domain: "video.example.com",
    state: "playing_background",
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
    restoreAttempts: 0,
    ...overrides
  };
}

function renderWithTasks(tasks: TaskRecord[]) {
  setChrome({
    runtime: {
      sendMessage: vi.fn(async (): Promise<SidePanelSnapshot> => ({ tasks }))
    }
  } as unknown as typeof chrome);

  render(React.createElement(App));
}

describe("runtime task routing", () => {
  const originalChrome = globalThis.chrome;

  afterEach(() => {
    cleanup();
    setChrome(originalChrome);
    vi.useRealTimers();
  });

  it("keeps starting tasks visible in the running section", async () => {
    renderWithTasks([
      createTask({
        id: "starting",
        title: "Starting task",
        state: "starting",
        effectiveMode: "background"
      })
    ]);

    await waitFor(() => {
      expect(screen.getByText("Starting task")).toBeTruthy();
    });
    expect(screen.getByText("starting")).toBeTruthy();
  });

  it("does not label mode-less errors as background mode", async () => {
    renderWithTasks([
      createTask({
        id: "mode-less-error",
        title: "Resolver failed",
        state: "error",
        effectiveMode: null,
        errorMessage: "Failed to resolve task"
      })
    ]);

    await waitFor(() => {
      expect(screen.getByText("Resolver failed")).toBeTruthy();
    });
    expect(screen.getByText("Failed to resolve task")).toBeTruthy();
    expect(screen.queryByText(/background mode/i)).toBeNull();
  });

  it("routes inline and background tasks to their matching cards", async () => {
    renderWithTasks([
      createTask({
        id: "inline",
        title: "Inline task",
        state: "playing_inline",
        effectiveMode: "inline",
        directMediaType: "mp4"
      }),
      createTask({
        id: "background",
        title: "Background task",
        state: "playing_background",
        effectiveMode: "background"
      })
    ]);

    await waitFor(() => {
      expect(screen.getByText("Inline card: Inline task")).toBeTruthy();
    });
    expect(screen.getByText("Background task")).toBeTruthy();
    expect(screen.getByText(/hidden page playback/i)).toBeTruthy();
  });

  it("polls the runtime snapshot so async playback confirmation becomes visible", async () => {
    vi.useFakeTimers();

    let tasks = [
      createTask({
        id: "background",
        title: "Background task",
        state: "starting",
        effectiveMode: "background",
        lastHeartbeatAt: null
      })
    ];
    const sendMessage = vi.fn(async (): Promise<SidePanelSnapshot> => ({
      tasks
    }));

    setChrome({
      runtime: { sendMessage }
    } as unknown as typeof chrome);

    render(React.createElement(App));

    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("starting")).toBeTruthy();

    tasks = [
      createTask({
        id: "background",
        title: "Background task",
        state: "playing_background",
        effectiveMode: "background",
        tabId: 99,
        lastHeartbeatAt: 1_700_000_123_456
      })
    ];

    await act(async () => {
      vi.advanceTimersByTime(1000);
      await Promise.resolve();
    });

    expect(screen.getByText("playing background")).toBeTruthy();
    expect(screen.getByText(/playback confirmed/i)).toBeTruthy();
  });
});
