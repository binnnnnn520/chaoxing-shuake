export interface PageHeartbeat {
  currentTime: number;
  paused: boolean;
  ended: boolean;
}

export interface PageAdapter {
  canHandle(): boolean;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
  setMuted(muted: boolean): void;
  setVolume(volume: number): void;
  setRate(rate: number): void;
  getHeartbeat(): PageHeartbeat;
}
