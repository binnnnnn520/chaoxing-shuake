import type { TaskRecord } from "../../shared/contracts";

interface DraftTaskListProps {
  tasks: TaskRecord[];
  onStart(taskId: string): void | Promise<void>;
}

export function DraftTaskList({ tasks, onStart }: DraftTaskListProps) {
  return (
    <section className="panel-card" aria-label="Pending tasks">
      <h2>Pending list</h2>
      {tasks.length === 0 ? (
        <p className="task-empty">No pending tasks yet.</p>
      ) : (
        <ul className="task-list">
          {tasks.map((task) => (
            <li key={task.id} className="task-item">
              <p className="task-url">{task.sourceUrl}</p>
              <div className="task-meta">
                <span>{task.domain}</span>
                <span>{task.state}</span>
              </div>
              {task.state === "draft" ? (
                <div className="panel-actions">
                  <button
                    className="panel-button"
                    type="button"
                    onClick={() => void onStart(task.id)}
                  >
                    Start
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
