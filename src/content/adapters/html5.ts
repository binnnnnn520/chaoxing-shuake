import type { PageAdapter, PageHeartbeat } from "./types";

export function createHtml5Adapter(doc: Document): PageAdapter {
  function getVideo(): HTMLVideoElement | null {
    const video = doc.querySelector("video");

    return video instanceof HTMLVideoElement ? video : null;
  }

  function getHeartbeat(): PageHeartbeat {
    const currentVideo = getVideo();

    if (!currentVideo) {
      return {
        currentTime: 0,
        paused: true,
        ended: false
      };
    }

    return {
      currentTime: currentVideo.currentTime,
      paused: currentVideo.paused,
      ended: currentVideo.ended
    };
  }

  return {
    canHandle() {
      return getVideo() !== null;
    },
    async play() {
      await getVideo()?.play();
    },
    async pause() {
      getVideo()?.pause();
    },
    async stop() {
      const currentVideo = getVideo();

      currentVideo?.pause();

      if (currentVideo) {
        currentVideo.currentTime = 0;
      }
    },
    setMuted(muted) {
      const currentVideo = getVideo();

      if (currentVideo) {
        currentVideo.muted = muted;
      }
    },
    setVolume(volume) {
      const currentVideo = getVideo();

      if (currentVideo) {
        currentVideo.volume = volume;
      }
    },
    setRate(rate) {
      const currentVideo = getVideo();

      if (currentVideo) {
        currentVideo.playbackRate = rate;
      }
    },
    getHeartbeat
  };
}
