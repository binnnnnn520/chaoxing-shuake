import { CourseTaskList } from "./components/CourseTaskList";
import { useTaskBridge } from "./state/useTaskBridge";
import "./app.css";

export function App() {
  const { tasks, scan, starting, scanCurrentPage, startAll, stop } =
    useTaskBridge();

  const running = tasks.filter((t) =>
    ["running", "queued"].includes(t.state)
  );
  const pending = tasks.filter((t) => t.state === "pending");
  const done = tasks.filter((t) =>
    ["completed", "error", "unsupported"].includes(t.state)
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>学习通刷课</h1>
        <div className="header-buttons">
          <button
            className="btn-scan"
            onClick={scanCurrentPage}
            disabled={scan.scanning}
            type="button"
          >
            {scan.scanning ? "扫描中…" : "扫描当前页"}
          </button>
          {pending.length > 0 && (
            <button
              className="btn-start"
              onClick={startAll}
              disabled={starting}
              type="button"
            >
              {starting ? "启动中…" : `开始刷课 (${pending.length})`}
            </button>
          )}
        </div>
      </header>

      {scan.error && (
        <div className="error-banner">
          <strong>{scan.error.message}</strong>
          {scan.error.hint && <p className="hint">{scan.error.hint}</p>}
        </div>
      )}

      {scan.lastResult && scan.lastResult.count === 0 && !scan.error && (
        <div className="warn-banner">
          未识别到视频任务。请确认你已打开学习通课程章节页(URL 含
          <code> mycourse/studentstudy</code>)。如果确认在章节页仍扫不到任务,
          请打开 F12 把章节列表区的 HTML 片段发给开发者校准选择器。
        </div>
      )}

      {scan.lastResult && scan.lastResult.count > 0 && !scan.error && (
        <div className="info-banner">
          本次扫描新增/识别 {scan.lastResult.count} 个任务
        </div>
      )}

      {running.length > 0 && (
        <section>
          <h2 className="section-title">刷课中 ({running.length}/6)</h2>
          <CourseTaskList tasks={running} onStop={stop} />
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="section-title">待刷 ({pending.length})</h2>
          <CourseTaskList tasks={pending} onStop={stop} />
        </section>
      )}

      {done.length > 0 && (
        <section>
          <h2 className="section-title">已完成 ({done.length})</h2>
          <CourseTaskList tasks={done} onStop={stop} />
        </section>
      )}

      {tasks.length === 0 && !scan.scanning && !scan.lastResult && (
        <p className="empty-tip">
          打开学习通课程章节页后,点「扫描当前页」识别视频任务
        </p>
      )}
    </main>
  );
}
