export function applySpeedOverride(targetRate = 16): MutationObserver {
  function setSpeed() {
    document.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      try {
        if (v.playbackRate !== targetRate) v.playbackRate = targetRate;
      } catch {
        // 部分播放器会拦截，静默忽略
      }
    });
  }

  // 持续监听 DOM 变化，新出现的 video 也能被覆盖
  const observer = new MutationObserver(setSpeed);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  setSpeed();
  return observer;
}
