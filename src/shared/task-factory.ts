import type { TaskRecord } from "./contracts";
import { classifyUrl } from "./url";

export function createDraftTasks(pastedText: string): TaskRecord[] {
  const seen = new Set<string>();
  const now = Date.now();

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
    .flatMap((line) => {
      let classification;

      try {
        classification = classifyUrl(line);
      } catch {
        return [];
      }

      return {
        id: crypto.randomUUID(),
        sourceUrl: line,
        title: classification.domain,
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
        lastHeartbeatAt: null,
        createdAt: now,
        updatedAt: now,
        restoreAttempts: 0
      } satisfies TaskRecord;
    });
}
