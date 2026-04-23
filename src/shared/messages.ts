import type { TaskRecord } from "./contracts";

export interface SidePanelSnapshot {
  tasks: TaskRecord[];
}

export interface TaskSelectionPayload {
  taskIds: string[];
}

export interface TaskAudioPayload {
  taskId: string;
  muted: boolean;
  volume: number;
  rate: number;
}

export type RuntimeCommandMessage =
  | {
      type: "tasks/add";
      payload: {
        tasks: TaskRecord[];
      };
    }
  | {
      type: "tasks/start";
      payload: TaskSelectionPayload;
    }
  | {
      type: "tasks/pause";
      payload: TaskSelectionPayload;
    }
  | {
      type: "tasks/stop";
      payload: TaskSelectionPayload;
    }
  | {
      type: "tasks/delete";
      payload: TaskSelectionPayload;
    }
  | {
      type: "tasks/set-audio";
      payload: TaskAudioPayload;
    }
  | {
      type: "tasks/snapshot-request";
    };
