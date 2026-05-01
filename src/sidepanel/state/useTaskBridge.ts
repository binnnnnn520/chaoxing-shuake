import { useCallback, useEffect, useState } from "react";
import type { ChaoXingTask } from "../../shared/contracts";

export interface ScanFeedback {
  scanning: boolean;
  lastResult: { count: number } | null;
  error: { message: string; hint?: string } | null;
}

export function useTaskBridge() {
  const [tasks, setTasks] = useState<ChaoXingTask[]>([]);
  const [scan, setScan] = useState<ScanFeedback>({
    scanning: false,
    lastResult: null,
    error: null,
  });
  const [starting, setStarting] = useState(false);

  const fetchSnapshot = useCallback(() => {
    chrome.runtime.sendMessage({ type: "tasks/snapshot-request" }, (res) => {
      if (res?.ok && Array.isArray(res.tasks)) {
        setTasks(res.tasks);
      }
    });
  }, []);

  // 轮询状态
  useEffect(() => {
    fetchSnapshot();
    const timer = setInterval(fetchSnapshot, 2000);
    return () => clearInterval(timer);
  }, [fetchSnapshot]);

  const scanCurrentPage = useCallback(async () => {
    setScan({ scanning: true, lastResult: null, error: null });
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "tasks/scan" }, (res) => {
        if (res?.ok) {
          setScan({
            scanning: false,
            lastResult: { count: res.count ?? 0 },
            error: null,
          });
        } else {
          setScan({
            scanning: false,
            lastResult: null,
            error: { message: res?.error ?? "扫描失败", hint: res?.hint },
          });
        }
        fetchSnapshot();
        resolve();
      });
    });
  }, [fetchSnapshot]);

  const startAll = useCallback(async () => {
    setStarting(true);
    return new Promise<void>((resolve) => {
      chrome.runtime.sendMessage({ type: "tasks/start-all" }, () => {
        setStarting(false);
        fetchSnapshot();
        resolve();
      });
    });
  }, [fetchSnapshot]);

  const stop = useCallback(
    (taskId: string) => {
      chrome.runtime.sendMessage(
        { type: "tasks/stop", payload: { taskId } },
        () => fetchSnapshot()
      );
    },
    [fetchSnapshot]
  );

  return { tasks, scan, starting, scanCurrentPage, startAll, stop };
}
