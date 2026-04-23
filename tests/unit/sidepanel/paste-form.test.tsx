import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../../../src/sidepanel/App";
import type { TaskRecord } from "../../../src/shared/contracts";
import type {
  RuntimeCommandMessage,
  SidePanelSnapshot
} from "../../../src/shared/messages";

function setChrome(value: typeof chrome | undefined) {
  Object.defineProperty(globalThis, "chrome", {
    configurable: true,
    writable: true,
    value
  });
}

describe("side panel paste flow", () => {
  const originalChrome = globalThis.chrome;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    setChrome(originalChrome);
  });

  it("keeps queued tasks visible but only renders start actions for draft tasks", async () => {
    let tasks: TaskRecord[] = [];

    const sendMessage = vi.fn(
      async (message: RuntimeCommandMessage): Promise<SidePanelSnapshot> => {
        switch (message.type) {
          case "tasks/snapshot-request":
            return { tasks };
          case "tasks/add":
            tasks = [...tasks, ...message.payload.tasks];
            return { tasks };
          case "tasks/start":
            tasks = tasks.map((task) =>
              message.payload.taskIds.includes(task.id)
                ? {
                    ...task,
                    state: "queued",
                    updatedAt: task.updatedAt + 1
                  }
                : task
            );
            return { tasks };
          default:
            return { tasks };
        }
      }
    );

    setChrome({
      runtime: {
        sendMessage
      }
    } as unknown as typeof chrome);

    render(React.createElement(App));

    const textarea = await screen.findByLabelText(/video links/i);

    fireEvent.change(textarea, {
      target: { value: "https://a.test/v.mp4\nhttps://b.test/page" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: /add to pending list/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(2);
    });

    expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(2);

    fireEvent.click(screen.getAllByRole("button", { name: "Start" })[0]);

    await waitFor(() => {
      expect(screen.getByText("queued")).toBeTruthy();
    });

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);
  });

  it("falls back to local task updates when chrome.runtime is unavailable", async () => {
    setChrome(undefined);

    render(React.createElement(App));

    const textarea = screen.getByLabelText(/video links/i);

    fireEvent.change(textarea, {
      target: { value: "https://local.test/video.mp4" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: /add to pending list/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    expect(screen.getByText("https://local.test/video.mp4")).toBeTruthy();
    expect(screen.getAllByRole("button", { name: "Start" })).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(screen.getByText("queued")).toBeTruthy();
    });

    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });

  it("falls back to local task updates when add or start does not return a snapshot", async () => {
    const sendMessage = vi.fn(
      async (message: RuntimeCommandMessage): Promise<SidePanelSnapshot | undefined> => {
        if (message.type === "tasks/snapshot-request") {
          return { tasks: [] };
        }

        return undefined;
      }
    );

    setChrome({
      runtime: {
        sendMessage
      }
    } as unknown as typeof chrome);

    render(React.createElement(App));

    const textarea = await screen.findByLabelText(/video links/i);

    fireEvent.change(textarea, {
      target: { value: "https://fallback.test/video.mp4" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: /add to pending list/i })
    );

    await waitFor(() => {
      expect(screen.getAllByRole("listitem")).toHaveLength(1);
    });

    expect(screen.getByText("https://fallback.test/video.mp4")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Start" }));

    await waitFor(() => {
      expect(screen.getByText("queued")).toBeTruthy();
    });

    expect(sendMessage).toHaveBeenCalledWith({ type: "tasks/snapshot-request" });
    expect(sendMessage).toHaveBeenCalledTimes(3);
  });
});
