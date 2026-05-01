import type { ChaoXingTask } from "../../shared/contracts";
import { TaskCard } from "./TaskCard";

export function CourseTaskList({
  tasks,
  onStop,
}: {
  tasks: ChaoXingTask[];
  onStop: (taskId: string) => void;
}) {
  if (tasks.length === 0) {
    return <p className="empty-tip">暂无任务，点击「扫描课程」开始</p>;
  }

  return (
    <ul className="task-list">
      {tasks.map((t) => (
        <TaskCard key={t.id} task={t} onStop={onStop} />
      ))}
    </ul>
  );
}
