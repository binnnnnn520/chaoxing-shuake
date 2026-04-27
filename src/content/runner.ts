import { getPageAdapter } from "./adapters/registry";

type PageAudioPayload = {
  muted: boolean;
  volume: number;
  rate: number;
};

type PageCommandMessage =
  | { type: "page/play" }
  | { type: "page/pause" }
  | { type: "page/stop" }
  | { type: "page/status" }
  | {
      type: "page/set-audio";
      payload: PageAudioPayload;
    };

type PageCommandResponse =
  | { ok: true; heartbeat?: { currentTime: number; paused: boolean; ended: boolean } }
  | {
      ok: false;
      reason: "unsupported" | "invalid-payload" | "failed";
      errorMessage?: string;
    };

type PageSendResponse = (response: PageCommandResponse) => void;

export type PageMessageHandler = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: PageSendResponse
) => boolean | undefined;

function isPageCommandMessage(message: unknown): message is PageCommandMessage {
  if (!message || typeof message !== "object" || !("type" in message)) {
    return false;
  }

  return (
    message.type === "page/play" ||
    message.type === "page/pause" ||
    message.type === "page/stop" ||
    message.type === "page/status" ||
    message.type === "page/set-audio"
  );
}

function isPageAudioPayload(value: unknown): value is PageAudioPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as PageAudioPayload;

  return (
    typeof payload.muted === "boolean" &&
    Number.isFinite(payload.volume) &&
    payload.volume >= 0 &&
    payload.volume <= 1 &&
    Number.isFinite(payload.rate) &&
    payload.rate > 0
  );
}

function createFailureResponse(error: unknown): PageCommandResponse {
  return {
    ok: false,
    reason: "failed",
    errorMessage: error instanceof Error ? error.message : "Page command failed"
  };
}

function runAsyncCommand(
  command: () => Promise<void>,
  sendResponse: PageSendResponse
) {
  void command()
    .then(() => {
      sendResponse({ ok: true });
    })
    .catch((error: unknown) => {
      sendResponse(createFailureResponse(error));
    });

  return true;
}

export function createPageMessageHandler(doc: Document): PageMessageHandler {
  return (message: unknown, _sender, sendResponse) => {
    if (!isPageCommandMessage(message)) {
      return undefined;
    }

    const supportedAdapter = getPageAdapter(doc);

    if (!supportedAdapter) {
      sendResponse({
        ok: false,
        reason: "unsupported"
      } satisfies PageCommandResponse);

      return undefined;
    }

    switch (message.type) {
      case "page/play":
        return runAsyncCommand(() => supportedAdapter.play(), sendResponse);
      case "page/pause":
        return runAsyncCommand(() => supportedAdapter.pause(), sendResponse);
      case "page/stop":
        return runAsyncCommand(() => supportedAdapter.stop(), sendResponse);
      case "page/status":
        sendResponse({
          ok: true,
          heartbeat: supportedAdapter.getHeartbeat()
        } satisfies PageCommandResponse);
        return undefined;
      case "page/set-audio":
        if (!isPageAudioPayload(message.payload)) {
          sendResponse({
            ok: false,
            reason: "invalid-payload"
          } satisfies PageCommandResponse);

          return undefined;
        }

        try {
          supportedAdapter.setMuted(message.payload.muted);
          supportedAdapter.setVolume(message.payload.volume);
          supportedAdapter.setRate(message.payload.rate);
          sendResponse({ ok: true } satisfies PageCommandResponse);
        } catch (error) {
          sendResponse(createFailureResponse(error));
        }

        return undefined;
      default:
        return undefined;
    }
  };
}

if (typeof chrome !== "undefined" && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(createPageMessageHandler(document));
}
