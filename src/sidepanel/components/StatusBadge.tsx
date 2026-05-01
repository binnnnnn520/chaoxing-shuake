import type { TaskState } from "../../shared/contracts";

const STATE_LABELS: Record<TaskState, string> = {
  pending: "待启动",
  queued: "排队中",
  running: "刷课中",
  completed: "已完成",
  error: "出错",
  unsupported: "不支持",
};

const STATE_COLORS: Record<TaskState, string> = {
  pending: "#888",
  queued: "#f0a500",
  running: "#2196f3",
  completed: "#4caf50",
  error: "#f44336",
  unsupported: "#bbb",
};

export function StatusBadge({ state }: { state: TaskState }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 4,
        fontSize: 12,
        color: "#fff",
        backgroundColor: STATE_COLORS[state] ?? "#888",
      }}
    >
      {STATE_LABELS[state] ?? state}
    </span>
  );
}
