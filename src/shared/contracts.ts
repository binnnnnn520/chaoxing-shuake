export type TaskState =
  | "draft"
  | "queued"
  | "resolving"
  | "ready_inline"
  | "ready_background"
  | "starting"
  | "playing_inline"
  | "playing_background"
  | "paused"
  | "stopped"
  | "error"
  | "unsupported";

export type ExecutionMode = "inline" | "background";

export type DirectMediaType = "mp4" | "webm" | "m3u8";

export interface TaskRecord {
  id: string;
  sourceUrl: string;
  title: string;
  domain: string;
  state: TaskState;
  requestedMode: ExecutionMode | null;
  effectiveMode: ExecutionMode | null;
  directMediaType: DirectMediaType | null;
  muted: boolean;
  volume: number;
  rate: number;
  errorMessage: string | null;
  tabId: number | null;
  lastHeartbeatAt: number | null;
  createdAt: number;
  updatedAt: number;
  restoreAttempts: number;
}
