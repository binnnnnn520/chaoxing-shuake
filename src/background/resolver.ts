import type { DirectMediaType, ExecutionMode, TaskState } from "../shared/contracts";

export interface ResolverTask {
  sourceUrl: string;
  directMediaType: DirectMediaType | null;
}

export interface ResolvedTask {
  effectiveMode: ExecutionMode;
  state: Extract<TaskState, "ready_inline" | "ready_background">;
  mediaUrl: string | null;
}

export function resolveTask(task: ResolverTask): ResolvedTask {
  if (task.directMediaType) {
    return {
      effectiveMode: "inline",
      state: "ready_inline",
      mediaUrl: task.sourceUrl
    };
  }

  return {
    effectiveMode: "background",
    state: "ready_background",
    mediaUrl: null
  };
}
