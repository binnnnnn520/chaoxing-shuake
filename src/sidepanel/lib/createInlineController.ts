import Hls from "hls.js";
import type { DirectMediaType } from "../../shared/contracts";

interface HlsLike {
  loadSource(url: string): void;
  attachMedia(video: HTMLVideoElement): void;
  destroy(): void;
}

type HlsCtor = (new () => HlsLike) & {
  isSupported?: () => boolean;
};

function canPlayNativeHls(video: HTMLVideoElement) {
  return (
    video.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    video.canPlayType("application/x-mpegURL") !== ""
  );
}

export function createInlineController(
  video: HTMLVideoElement,
  HlsConstructor: HlsCtor = Hls as unknown as HlsCtor
) {
  let hls: HlsLike | null = null;

  function releaseCurrentMedia() {
    const hadHls = hls !== null;
    const hadNativeSource =
      video.getAttribute("src") !== null || video.currentSrc !== "";

    if (hls) {
      hls.destroy();
      hls = null;
    }

    if (!hadHls && !hadNativeSource) {
      return;
    }

    video.pause();
    video.removeAttribute("src");
    video.load();
  }

  return {
    attach(url: string, mediaType: DirectMediaType) {
      releaseCurrentMedia();

      if (mediaType === "m3u8") {
        if (HlsConstructor.isSupported?.() === false) {
          if (canPlayNativeHls(video)) {
            video.src = url;
            return;
          }

          throw new Error("HLS playback is not supported in this environment");
        }

        hls = new HlsConstructor();
        hls.loadSource(url);
        hls.attachMedia(video);
        return;
      }

      video.src = url;
    },
    destroy() {
      releaseCurrentMedia();
    }
  };
}
