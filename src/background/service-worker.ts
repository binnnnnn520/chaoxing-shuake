import type { RuntimeCommandMessage } from "../shared/messages";
import { createBackgroundPageRunner } from "./background-page-runner";
import { createHiddenPageManager } from "./hidden-page-manager";
import { createOrchestrator } from "./orchestrator";
import { loadTasks, saveTasks } from "./persistence";
import { resolveTask } from "./resolver";
import { createScheduler } from "./scheduler";
import { configureSidePanelOpening } from "./side-panel";
import { createTaskStore } from "./task-store";

const scheduler = createScheduler(6);
const store = createTaskStore({
  loadTasks,
  saveTasks
});
const orchestrator = createOrchestrator({
  store,
  scheduler,
  resolver: resolveTask,
  backgroundRunner: createBackgroundPageRunner({
    hiddenPages: createHiddenPageManager(chrome.tabs),
    scripting: chrome.scripting,
    tabs: chrome.tabs
  }),
  currentTabProvider: {
    async getCurrentTab() {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true
      });

      return tab ?? null;
    }
  }
});

void configureSidePanelOpening(chrome.sidePanel).catch(console.error);

chrome.runtime.onInstalled.addListener(() => {
  void orchestrator.hydrate();
});

chrome.runtime.onMessage.addListener((message: RuntimeCommandMessage, _sender, sendResponse) => {
  if (
    message.type !== "tasks/add" &&
    message.type !== "tasks/add-current-tab" &&
    message.type !== "tasks/start" &&
    message.type !== "tasks/snapshot-request"
  ) {
    return undefined;
  }

  void orchestrator.handleMessage(message).then((snapshot) => {
    sendResponse(snapshot);
  });

  return true;
});
