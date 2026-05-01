import type { ChaoXingTask } from "./contracts";

export type BackgroundMessage =
  | { type: "tasks/scan" }
  | { type: "tasks/start-all" }
  | { type: "tasks/stop"; payload: { taskId: string } }
  | { type: "tasks/snapshot-request" }
  | { type: "player/completed" }
  | { type: "player/ping" };

export type BackgroundResponse =
  | { ok: true; tasks?: ChaoXingTask[]; count?: number; started?: number }
  | { ok: false; error: string; hint?: string };
