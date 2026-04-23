import type { RuntimeCommandMessage } from "../shared/messages";
import { createOrchestrator } from "./orchestrator";
import { loadTasks, saveTasks } from "./persistence";
import { resolveTask } from "./resolver";
import { createScheduler } from "./scheduler";
import { createTaskStore } from "./task-store";

const scheduler = createScheduler(6);
const store = createTaskStore({
  loadTasks,
  saveTasks
});
const orchestrator = createOrchestrator({
  store,
  scheduler,
  resolver: resolveTask
});

chrome.runtime.onInstalled.addListener(() => {
  void orchestrator.hydrate();
});

chrome.runtime.onMessage.addListener((message: RuntimeCommandMessage, _sender, sendResponse) => {
  if (
    message.type !== "tasks/add" &&
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
