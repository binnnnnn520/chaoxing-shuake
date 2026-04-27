import type { TaskRecord } from "../shared/contracts";

type HiddenPagesApi = {
  open(url: string, taskId?: string): Promise<number>;
};

type ScriptingApi = {
  executeScript(details: {
    target: { tabId: number; allFrames?: boolean };
    files?: string[];
    func?: () => boolean;
  }): Promise<Array<{ frameId: number; result?: boolean }>>;
};

type TabsApi = {
  sendMessage(
    tabId: number,
    message: unknown,
    options?: { frameId: number }
  ): Promise<unknown>;
};

type PageHeartbeat = { currentTime: number; paused: boolean; ended: boolean };

type PageCommandResponse =
  | { ok: true; heartbeat?: PageHeartbeat }
  | { ok: false; reason: string; errorMessage?: string };

function assertPageCommandSucceeded(response: unknown, fallbackMessage: string) {
  const pageResponse = response as PageCommandResponse | undefined;

  if (pageResponse?.ok === true) {
    return pageResponse;
  }

  throw new Error(pageResponse?.errorMessage ?? fallbackMessage);
}

function isPageHeartbeat(value: unknown): value is PageHeartbeat {
  if (!value || typeof value !== "object") {
    return false;
  }

  const heartbeat = value as PageHeartbeat;

  return (
    Number.isFinite(heartbeat.currentTime) &&
    typeof heartbeat.paused === "boolean" &&
    typeof heartbeat.ended === "boolean"
  );
}

export function createBackgroundPageRunner({
  hiddenPages,
  scripting,
  tabs,
  now = Date.now
}: {
  hiddenPages: HiddenPagesApi;
  scripting: ScriptingApi;
  tabs: TabsApi;
  now?: () => number;
}) {
  async function findVideoFrame(tabId: number): Promise<number> {
    const results = await scripting.executeScript({
      target: { tabId, allFrames: true },
      func: () => document.querySelector("video") !== null
    });
    const match = results.find((result) => result.result === true);

    if (!match) {
      throw new Error("No controllable video element found on page");
    }

    return match.frameId;
  }

  return {
    async start(task: TaskRecord) {
      const tabId = await hiddenPages.open(task.sourceUrl, task.id);

      await scripting.executeScript({
        target: { tabId, allFrames: true },
        files: ["content-runner.js"]
      });

      const frameId = await findVideoFrame(tabId);
      const options = { frameId };

      assertPageCommandSucceeded(
        await tabs.sendMessage(
          tabId,
          {
            type: "page/set-audio",
            payload: {
              muted: task.muted,
              volume: task.volume,
              rate: task.rate
            }
          },
          options
        ),
        "Failed to configure background page audio"
      );
      assertPageCommandSucceeded(
        await tabs.sendMessage(tabId, { type: "page/play" }, options),
        "Failed to start background page playback"
      );
      const statusResponse = assertPageCommandSucceeded(
        await tabs.sendMessage(tabId, { type: "page/status" }, options),
        "Failed to confirm background page playback"
      );

      if (!isPageHeartbeat(statusResponse.heartbeat)) {
        throw new Error("Failed to confirm background page playback");
      }

      return {
        tabId,
        frameId,
        lastHeartbeatAt: now()
      };
    }
  };
}
