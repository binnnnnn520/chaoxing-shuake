import type { TaskRecord } from "../../shared/contracts";
import { StatusBadge } from "./StatusBadge";

function formatTime(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "--:--";
  }

  const totalSeconds = Math.max(0, Math.floor(value));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(
    2,
    "0"
  )}`;
}

function getPlaybackLabel(task: TaskRecord) {
  switch (task.sourcePlaybackState) {
    case "advancing":
      return `Website page playing at ${formatTime(task.sourceCurrentTime)}`;
    case "paused":
      return `Website page paused at ${formatTime(task.sourceCurrentTime)}`;
    case "ended":
      return `Website page ended at ${formatTime(task.sourceCurrentTime)}`;
    case "waiting":
      return `Website page waiting at ${formatTime(task.sourceCurrentTime)}`;
    default:
      return "Website page not synced yet";
  }
}

export function BackgroundTaskCard({ task }: { task: TaskRecord }) {
  const hasPlaybackConfirmation =
    task.state === "playing_background" &&
    typeof task.lastHeartbeatAt === "number";
  const hasWebsiteTab = typeof task.sourceTabId === "number";
  const hasHiddenFallback =
    typeof task.tabId === "number" || hasPlaybackConfirmation || !hasWebsiteTab;

  return (
    <article className="task-item">
      <header className="task-card-header">
        <h3>{task.title}</h3>
        <StatusBadge state={task.state} />
      </header>
      <p>Website page playback</p>
      <p className="task-meta">{getPlaybackLabel(task)}</p>
      {hasWebsiteTab ? (
        <p className="task-meta">Website Tab #{task.sourceTabId}</p>
      ) : null}
      {task.sourceErrorMessage ? (
        <p className="task-meta">{task.sourceErrorMessage}</p>
      ) : null}
      {hasHiddenFallback ? (
        <>
          <p>Hidden page playback</p>
          <p className="task-meta">
            {hasPlaybackConfirmation
              ? "Playback confirmed by page video heartbeat"
              : "Playback not confirmed yet"}
          </p>
          {typeof task.tabId === "number" ? (
            <p className="task-meta">Tab #{task.tabId}</p>
          ) : null}
        </>
      ) : null}
      <p className="task-url">{task.sourceUrl}</p>
      {task.errorMessage ? <p role="alert">{task.errorMessage}</p> : null}
    </article>
  );
}
