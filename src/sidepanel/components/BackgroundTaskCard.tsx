import type { TaskRecord } from "../../shared/contracts";
import { StatusBadge } from "./StatusBadge";

export function BackgroundTaskCard({ task }: { task: TaskRecord }) {
  return (
    <article className="task-item">
      <header className="task-card-header">
        <h3>{task.title}</h3>
        <StatusBadge state={task.state} />
      </header>
      <p>Background mode</p>
      <p className="task-url">{task.sourceUrl}</p>
      {task.errorMessage ? <p role="alert">{task.errorMessage}</p> : null}
    </article>
  );
}
