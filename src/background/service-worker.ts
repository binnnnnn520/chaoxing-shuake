import { loadTasks, saveTasks } from "./persistence";
import { createTaskStore } from "./task-store";
import { createScheduler } from "./scheduler";
import { createTabManager } from "./tab-manager";
import { createOrchestrator } from "./orchestrator";
import { ScanError } from "./course-scanner";

const store = createTaskStore({ load: loadTasks, save: saveTasks });
const scheduler = createScheduler(6);
const tabManager = createTabManager();
const orchestrator = createOrchestrator({ store, scheduler, tabManager });

chrome.runtime.onInstalled.addListener(async () => {
  await store.hydrate();
});

chrome.runtime.onStartup.addListener(async () => {
  await store.hydrate();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "tasks/scan") {
    orchestrator
      .scanCurrentTab()
      .then((res) => sendResponse({ ok: true, count: res.count }))
      .catch((err) => {
        if (err instanceof ScanError) {
          sendResponse({ ok: false, error: err.message, hint: err.hint });
        } else {
          sendResponse({ ok: false, error: String(err) });
        }
      });
    return true;
  }

  if (msg.type === "tasks/start-all") {
    orchestrator
      .startAllPending()
      .then((res) => sendResponse({ ok: true, started: res.started }))
      .catch((err) => sendResponse({ ok: false, error: String(err) }));
    return true;
  }

  if (msg.type === "tasks/stop") {
    orchestrator
      .stopTask(msg.payload.taskId)
      .then(() => sendResponse({ ok: true }));
    return true;
  }

  if (msg.type === "tasks/snapshot-request") {
    sendResponse({ ok: true, tasks: store.getSnapshot() });
    return false;
  }

  if (msg.type === "player/completed") {
    const tabId = sender.tab?.id;
    if (typeof tabId === "number") {
      const taskId = tabManager.getTaskId(tabId);
      if (taskId) orchestrator.onCompleted(taskId);
    }
    return false;
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  orchestrator.onTabClosed(tabId);
});
