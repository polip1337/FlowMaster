import { TICK_RATE } from "../constants";

type TickCallback = (tick: number) => void;
type IntervalHandle = unknown;

const timerApi = globalThis as typeof globalThis & {
  setInterval: (handler: () => void, timeout?: number) => IntervalHandle;
  clearInterval: (id: IntervalHandle) => void;
};

export class SimulationClock {
  public tick = 0;
  public isPaused = false;

  private intervalId: IntervalHandle | null = null;
  private readonly listeners = new Set<TickCallback>();

  start(): void {
    if (this.intervalId !== null) {
      return;
    }

    const intervalMs = 1000 / TICK_RATE;
    this.intervalId = timerApi.setInterval(() => {
      if (this.isPaused) {
        return;
      }

      this.tick += 1;
      for (const cb of this.listeners) {
        cb(this.tick);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId !== null) {
      timerApi.clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.tick = 0;
    this.isPaused = false;
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    this.isPaused = false;
  }

  onTick(cb: TickCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }
}
