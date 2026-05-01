export function applyVisibilityOverride() {
  // 让播放器认为页面始终可见，防止后台 tab 暂停播放
  try {
    Object.defineProperty(document, "hidden", {
      get: () => false,
      configurable: true,
    });
    Object.defineProperty(document, "visibilityState", {
      get: () => "visible",
      configurable: true,
    });
    // 触发一次 visibilitychange，让已注册的监听器重新判断
    document.dispatchEvent(new Event("visibilitychange"));
  } catch {
    // 已被定义过，忽略
  }
}
