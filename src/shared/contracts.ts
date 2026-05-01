export type TaskState =
  | "pending"      // 扫描到，等待启动
  | "queued"       // 已入队，等待槽位
  | "running"      // 后台标签页播放中
  | "completed"    // 视频播放完成
  | "error"        // 失败
  | "unsupported"; // 非视频任务或不支持

export interface ChaoXingTask {
  id: string;              // `${courseId}_${taskId}`
  courseId: string;
  chapterId: string;
  taskId: string;
  title: string;
  courseName: string;
  taskUrl: string;         // 课程任务页 URL
  state: TaskState;
  progress: number;        // 0-100
  tabId: number | null;
  errorMessage: string | null;
  createdAt: number;
  updatedAt: number;
  restoreAttempts: number;
}
