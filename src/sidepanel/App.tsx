import "./app.css";
import { DraftTaskList } from "./components/DraftTaskList";
import { PasteForm } from "./components/PasteForm";
import { useTaskBridge } from "./state/useTaskBridge";

export function App() {
  const { tasks, addDrafts, startTask } = useTaskBridge();
  const pendingTasks = tasks.filter(
    (task) => task.state === "draft" || task.state === "queued"
  );

  return (
    <main>
      <h1>MultiVideo Side Panel</h1>
      <div className="sidepanel-shell">
        <PasteForm onSubmit={addDrafts} />
        <DraftTaskList tasks={pendingTasks} onStart={startTask} />
      </div>
    </main>
  );
}
