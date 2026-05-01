import type { ChaoXingTask } from "../../shared/contracts";
import { StatusBadge } from "./StatusBadge";

export function TaskCard({
  task,
  onStop,
}: {
  task: ChaoXingTask;
  onStop?: (taskId: string) => void;
}) {
  return (
    <li className="task-card">
      <div className="task-card-header">
        <span className="task-title" title={task.title}>
          {task.title}
        </span>
        <StatusBadge state={task.state} />
      </div>
      <div className="task-course">{task.courseName}</div>
      <div className="task-progress-bar">
        <div
          className="task-progress-fill"
          style={{ width: `${task.progress}%` }}
        />
      </div>
      <div className="task-footer">
        <span className="task-progress-text">{task.progress}%</span>
        {task.errorMessage && (
          <span className="task-error">{task.errorMessage}</span>
        )}
        {(task.state === "running" || task.state === "queued") && onStop && (
          <button
            className="btn-stop"
            onClick={() => onStop(task.id)}
            type="button"
          >
            停止
          </button>
        )}
      </div>
    </li>
  );
}
