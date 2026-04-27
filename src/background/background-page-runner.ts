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
  create?(createProperties: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab>;
  query?(queryInfo: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]>;
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
  async function injectRunner(tabId: number) {
    await scripting.executeScript({
      target: { tabId, allFrames: true },
      files: ["content-runner.js"]
    });
  }

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

  async function confirmStatus(tabId: number, frameId: number) {
    const statusResponse = assertPageCommandSucceeded(
      await tabs.sendMessage(
        tabId,
        { type: "page/status" },
        { frameId }
      ),
      "Failed to confirm background page playback"
    );

    if (!isPageHeartbeat(statusResponse.heartbeat)) {
      throw new Error("Failed to confirm background page playback");
    }

    return {
      heartbeat: statusResponse.heartbeat,
      lastHeartbeatAt: now()
    };
  }

  async function configureAndPlay(task: TaskRecord, tabId: number, frameId: number) {
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

    return confirmStatus(tabId, frameId);
  }

  async function startInTab(task: TaskRecord, tabId: number) {
    await injectRunner(tabId);

    const frameId = await findVideoFrame(tabId);
    const status = await configureAndPlay(task, tabId, frameId);

    return {
      tabId,
      frameId,
      ...status
    };
  }

  async function findExistingTab(url: string): Promise<number | null> {
    if (!tabs.query) {
      return null;
    }

    const candidates = await tabs.query({});
    const match = candidates.find((tab) => tab.url === url);

    return typeof match?.id === "number" ? match.id : null;
  }

  async function createWebsiteTab(url: string): Promise<number> {
    if (!tabs.create) {
      throw new Error("No website tab is available for synchronized playback");
    }

    const tab = await tabs.create({
      url,
      active: false
    });

    if (typeof tab.id !== "number") {
      throw new Error("Website tab is missing an id");
    }

    return tab.id;
  }

  return {
    async startSource(task: TaskRecord) {
      const tabId =
        task.sourceTabId ??
        (await findExistingTab(task.sourceUrl)) ??
        (await createWebsiteTab(task.sourceUrl));

      return startInTab(task, tabId);
    },

    async start(task: TaskRecord) {
      const tabId = await hiddenPages.open(task.sourceUrl, task.id);

      return startInTab(task, tabId);
    },

    async refresh(tabId: number, frameId: number) {
      return confirmStatus(tabId, frameId);
    }
  };
}
