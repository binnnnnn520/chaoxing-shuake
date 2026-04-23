import type { TaskRecord } from "./contracts";

export interface SidePanelSnapshot {
  tasks: TaskRecord[];
}

export interface RuntimeCommandMessage {
  type:
    | "tasks/add"
    | "tasks/start"
    | "tasks/pause"
    | "tasks/stop"
    | "tasks/delete"
    | "tasks/set-audio"
    | "tasks/snapshot-request";
  payload?: unknown;
}
