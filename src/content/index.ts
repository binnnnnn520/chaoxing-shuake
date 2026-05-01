import { initPlayerController } from "./player-controller";

console.log("[chaoxing-content] 已注入", location.href);

const hostname = location.hostname;
const pathname = location.pathname;

const isChaoXing = hostname.endsWith("chaoxing.com");
const isVideoContext =
  pathname.includes("/ananas/") ||
  pathname.includes("/studentstudy") ||
  pathname.includes("/mycourse/");

if (isChaoXing && isVideoContext) {
  console.log("[chaoxing-content] 启动播放器控制器");
  initPlayerController();
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === "player/ping") {
    sendResponse({ ok: true });
  }
});
