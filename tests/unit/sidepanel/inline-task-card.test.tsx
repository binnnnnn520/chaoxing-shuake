import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InlineTaskCard } from "../../../src/sidepanel/components/InlineTaskCard";
import type { TaskRecord } from "../../../src/shared/contracts";

vi.mock("../../../src/sidepanel/lib/createInlineController", () => ({
  createInlineController: () => ({
    attach: () => {
      throw new Error("HLS playback is not supported in this environment");
    },
    destroy: vi.fn()
  })
}));

const unsupportedHlsTask = {
  id: "inline-1",
  sourceUrl: "https://cdn.example.com/playlist.m3u8",
  title: "Unsupported HLS",
  domain: "cdn.example.com",
  state: "playing_inline",
  requestedMode: null,
  effectiveMode: "inline",
  directMediaType: "m3u8",
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

describe("InlineTaskCard", () => {
  it("renders a local playback error when inline attachment fails", () => {
    render(<InlineTaskCard task={unsupportedHlsTask} />);

    expect(
      screen.getByText("HLS playback is not supported in this environment")
    ).toBeTruthy();
  });
});
