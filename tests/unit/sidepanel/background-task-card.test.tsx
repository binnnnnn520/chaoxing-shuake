import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BackgroundTaskCard } from "../../../src/sidepanel/components/BackgroundTaskCard";
import type { TaskRecord } from "../../../src/shared/contracts";

const backgroundTask = {
  id: "task-1",
  sourceUrl: "https://site.test/watch",
  title: "site.test",
  domain: "site.test",
  state: "playing_background",
  requestedMode: null,
  effectiveMode: "background",
  directMediaType: null,
  muted: true,
  volume: 1,
  rate: 1,
  errorMessage: null,
  tabId: 42,
  lastHeartbeatAt: 1_700_000_000_000,
  sourceTabId: 33,
  sourceFrameId: 4,
  sourceCurrentTime: 12.4,
  sourcePaused: false,
  sourceEnded: false,
  sourceLastHeartbeatAt: 1_700_000_000_500,
  sourcePlaybackState: "advancing",
  createdAt: 1_700_000_000_000,
  updatedAt: 1_700_000_000_000,
  restoreAttempts: 0
} satisfies TaskRecord;

describe("BackgroundTaskCard", () => {
  it("shows that the task is running in the background", () => {
    render(<BackgroundTaskCard task={backgroundTask} />);

    expect(screen.getByText(backgroundTask.title)).toBeTruthy();
    expect(screen.getByText(/hidden page playback/i)).toBeTruthy();
    expect(screen.getByText(/playback confirmed/i)).toBeTruthy();
    expect(screen.getByText(/website page playing at 00:12/i)).toBeTruthy();
    expect(screen.getByText("Website Tab #33")).toBeTruthy();
    expect(screen.getByText("playing background")).toBeTruthy();
    expect(screen.getByText(backgroundTask.sourceUrl)).toBeTruthy();
  });

  it("renders task errors when present", () => {
    render(
      <BackgroundTaskCard
        task={{
          ...backgroundTask,
          state: "error",
          errorMessage: "Page adapter stopped responding"
        }}
      />
    );

    expect(screen.getByText("Page adapter stopped responding")).toBeTruthy();
  });
});
