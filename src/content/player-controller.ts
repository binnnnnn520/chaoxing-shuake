import { applySpeedOverride } from "./speed-override";
import { applyVisibilityOverride } from "./visibility-override";
import { startActivitySimulation } from "./activity-simulator";
import { startQuizHandler } from "./quiz-handler";

export function initPlayerController() {
  applyVisibilityOverride();
  const speedObserver = applySpeedOverride(16);
  const activityTimer = startActivitySimulation();
  const quizTimer = startQuizHandler();

  // 视频结束时通知 background
  document.addEventListener(
    "ended",
    () => {
      chrome.runtime.sendMessage({ type: "player/completed" });
    },
    true // 捕获阶段，可以接到 iframe 内部的事件冒泡
  );

  return () => {
    speedObserver.disconnect();
    clearInterval(activityTimer);
    clearInterval(quizTimer);
  };
}
