import { describe, expect, it, vi } from "vitest";
import { configureSidePanelOpening } from "../../../src/background/side-panel";

describe("configureSidePanelOpening", () => {
  it("opens the extension side panel when the toolbar action is clicked", async () => {
    const setPanelBehavior = vi.fn().mockResolvedValue(undefined);

    await configureSidePanelOpening({
      setPanelBehavior
    });

    expect(setPanelBehavior).toHaveBeenCalledWith({
      openPanelOnActionClick: true
    });
  });
});
