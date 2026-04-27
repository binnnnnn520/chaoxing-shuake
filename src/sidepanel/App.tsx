import "./app.css";
import { BackgroundTaskCard } from "./components/BackgroundTaskCard";
import { DraftTaskList } from "./components/DraftTaskList";
import { InlineTaskCard } from "./components/InlineTaskCard";
import { PasteForm } from "./components/PasteForm";
import { RuntimeTaskCard } from "./components/RuntimeTaskCard";
import { useTaskBridge } from "./state/useTaskBridge";

export function App() {
  const { tasks, addDrafts, addCurrentPage, startTask } = useTaskBridge();
  const pendingTasks = tasks.filter(
    (task) => task.state === "draft" || task.state === "queued"
  );
  const runningTasks = tasks.filter((task) =>
    [
      "ready_inline",
      "ready_background",
      "starting",
      "playing_inline",
      "playing_background",
      "paused",
      "error"
    ].includes(task.state)
  );

  return (
    <main>
      <h1>MultiVideo Side Panel</h1>
      <div className="sidepanel-shell">
        <PasteForm onSubmit={addDrafts} onAddCurrentPage={addCurrentPage} />
        <DraftTaskList tasks={pendingTasks} onStart={startTask} />
        <section className="panel-card" aria-label="Running tasks">
          <h2>Running</h2>
          {runningTasks.length === 0 ? (
            <p className="task-empty">No running tasks yet.</p>
          ) : (
            <div className="runtime-grid">
              {runningTasks.map((task) =>
                task.effectiveMode === "inline" ? (
                  <InlineTaskCard key={task.id} task={task} />
                ) : task.effectiveMode === "background" ? (
                  <BackgroundTaskCard key={task.id} task={task} />
                ) : (
                  <RuntimeTaskCard key={task.id} task={task} />
                )
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
