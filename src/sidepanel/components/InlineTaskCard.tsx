import { useEffect, useRef, useState } from "react";
import type { TaskRecord } from "../../shared/contracts";
import { createInlineController } from "../lib/createInlineController";

interface InlineTaskCardProps {
  task: TaskRecord;
}

export function InlineTaskCard({ task }: InlineTaskCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);

  useEffect(() => {
    const video = videoRef.current;

    if (!video || !task.directMediaType) {
      return;
    }

    const controller = createInlineController(video);
    setPlaybackError(null);

    try {
      controller.attach(task.sourceUrl, task.directMediaType);
    } catch (error) {
      setPlaybackError(
        error instanceof Error ? error.message : "Inline playback failed"
      );
    }

    return () => {
      controller.destroy();
    };
  }, [task.directMediaType, task.sourceUrl]);

  useEffect(() => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    video.muted = task.muted;
    video.volume = task.volume;
    video.playbackRate = task.rate;
  }, [task.muted, task.rate, task.volume]);

  return (
    <article>
      <h3>{task.title}</h3>
      <video ref={videoRef} controls playsInline />
      {playbackError ? <p role="alert">{playbackError}</p> : null}
    </article>
  );
}
