import type { TaskRecord } from "./contracts";
import { classifyUrl } from "./url";

type DraftTaskOverrides = Partial<
  Pick<TaskRecord, "sourceTabId" | "title">
>;

export function createDraftTaskFromUrl(
  url: string,
  overrides: DraftTaskOverrides = {}
): TaskRecord | null {
  let classification;

  try {
    classification = classifyUrl(url);
  } catch {
    return null;
  }

  const now = Date.now();

  return {
    id: crypto.randomUUID(),
    sourceUrl: url,
    title: overrides.title?.trim() || classification.domain,
    domain: classification.domain,
    state: "draft",
    requestedMode: null,
    effectiveMode: null,
    directMediaType: classification.directMediaType,
    muted: true,
    volume: 1,
    rate: 1,
    errorMessage: null,
    tabId: null,
    frameId: null,
    lastHeartbeatAt: null,
    currentTime: null,
    paused: null,
    ended: null,
    playbackState: null,
    sourceTabId: overrides.sourceTabId ?? null,
    sourceFrameId: null,
    sourceLastHeartbeatAt: null,
    sourceCurrentTime: null,
    sourcePaused: null,
    sourceEnded: null,
    sourcePlaybackState: null,
    sourceErrorMessage: null,
    createdAt: now,
    updatedAt: now,
    restoreAttempts: 0
  };
}

export function createDraftTasks(pastedText: string): TaskRecord[] {
  const seen = new Set<string>();

  return pastedText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      if (seen.has(line)) {
        return false;
      }

      seen.add(line);
      return true;
    })
    .flatMap((line) => createDraftTaskFromUrl(line) ?? []);
}
