import type { TaskRecord } from "../../shared/contracts";
import { StatusBadge } from "./StatusBadge";

export function BackgroundTaskCard({ task }: { task: TaskRecord }) {
  const hasPlaybackConfirmation =
    task.state === "playing_background" && task.lastHeartbeatAt !== null;

  return (
    <article className="task-item">
      <header className="task-card-header">
        <h3>{task.title}</h3>
        <StatusBadge state={task.state} />
      </header>
      <p>Hidden page playback</p>
      <p className="task-meta">
        {hasPlaybackConfirmation
          ? "Playback confirmed by page video heartbeat"
          : "Playback not confirmed yet"}
      </p>
      {task.tabId !== null ? <p className="task-meta">Tab #{task.tabId}</p> : null}
      <p className="task-url">{task.sourceUrl}</p>
      {task.errorMessage ? <p role="alert">{task.errorMessage}</p> : null}
    </article>
  );
}
