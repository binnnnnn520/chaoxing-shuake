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

export type PlaybackActivityState =
  | "waiting"
  | "advancing"
  | "paused"
  | "ended";

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
  frameId?: number | null;
  lastHeartbeatAt: number | null;
  currentTime?: number | null;
  paused?: boolean | null;
  ended?: boolean | null;
  playbackState?: PlaybackActivityState | null;
  sourceTabId?: number | null;
  sourceFrameId?: number | null;
  sourceLastHeartbeatAt?: number | null;
  sourceCurrentTime?: number | null;
  sourcePaused?: boolean | null;
  sourceEnded?: boolean | null;
  sourcePlaybackState?: PlaybackActivityState | null;
  sourceErrorMessage?: string | null;
  createdAt: number;
  updatedAt: number;
  restoreAttempts: number;
}
