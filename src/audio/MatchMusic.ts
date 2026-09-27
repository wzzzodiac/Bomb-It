export type MusicAudio = {
  currentTime: number;
  duration: number;
  volume: number;
  loop: boolean;
  preload: string;
  onloadedmetadata: ((this: GlobalEventHandlers, event: Event) => void) | null;
  play(): Promise<void>;
  pause(): void;
};

export type MusicClock = {
  set(callback: () => void, delayMs: number): unknown;
  clear(handle: unknown): void;
};

const browserClock: MusicClock = {
  set: (callback, delayMs) => setTimeout(callback, delayMs),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>)
};

const VOLUME = 0.24;
const CROSSFADE_MS = 800;
const FADE_STEPS = 16;

export class MatchMusic {
  private readonly url: string;
  private readonly createAudio: (url: string) => MusicAudio;
  private readonly clock: MusicClock;
  private tracks: [MusicAudio, MusicAudio] | null = null;
  private activeIndex = 0;
  private loopTimer: unknown = null;
  private fadeTimer: unknown = null;
  private generation = 0;

  constructor(url: string, createAudio: (url: string) => MusicAudio = source => new Audio(source), clock: MusicClock = browserClock) {
    this.url = url;
    this.createAudio = createAudio;
    this.clock = clock;
  }

  get active(): boolean { return this.tracks !== null; }

  start(): void {
    this.stop();
    const first = this.createAudio(this.url);
    const second = this.createAudio(this.url);
    for (const audio of [first, second]) { audio.preload = 'auto'; audio.loop = true; audio.volume = 0; }
    this.tracks = [first, second];
    this.activeIndex = 0;
    const generation = this.generation;
    first.volume = VOLUME;
    first.onloadedmetadata = () => { if (this.generation === generation && this.activeIndex === 0) this.scheduleLoop(first, generation); };
    second.onloadedmetadata = () => { if (this.generation === generation && this.activeIndex === 1) this.scheduleLoop(second, generation); };
    void first.play().then(() => {
      if (this.generation !== generation) first.pause();
      else this.scheduleLoop(first, generation);
    }).catch(() => { /* Autoplay failure must not block the match. */ });
  }

  stop(): void {
    this.generation++;
    this.clearTimers();
    for (const audio of this.tracks ?? []) { audio.onloadedmetadata = null; audio.pause(); audio.volume = 0; }
    this.tracks = null;
  }

  private scheduleLoop(audio: MusicAudio, generation: number): void {
    if (this.generation !== generation || !this.tracks || this.tracks[this.activeIndex] !== audio || this.loopTimer !== null) return;
    if (!Number.isFinite(audio.duration) || audio.duration <= CROSSFADE_MS / 1000) return;
    this.loopTimer = this.clock.set(() => { this.loopTimer = null; this.crossfade(generation); }, Math.max(100, audio.duration * 1000 - CROSSFADE_MS));
  }

  private crossfade(generation: number): void {
    if (this.generation !== generation || !this.tracks || this.fadeTimer !== null) return;
    const old = this.tracks[this.activeIndex];
    const nextIndex = 1 - this.activeIndex;
    const next = this.tracks[nextIndex];
    next.currentTime = 0;
    next.volume = 0;
    void next.play().then(() => {
      if (this.generation !== generation) { next.pause(); return; }
      this.activeIndex = nextIndex;
      this.scheduleLoop(next, generation);
      let step = 0;
      const fade = () => {
        if (this.generation !== generation) return;
        step++;
        old.volume = VOLUME * (1 - step / FADE_STEPS);
        next.volume = VOLUME * step / FADE_STEPS;
        if (step < FADE_STEPS) this.fadeTimer = this.clock.set(fade, CROSSFADE_MS / FADE_STEPS);
        else { this.fadeTimer = null; old.pause(); old.currentTime = 0; }
      };
      this.fadeTimer = this.clock.set(fade, CROSSFADE_MS / FADE_STEPS);
    }).catch(() => this.scheduleLoop(old, generation));
  }

  private clearTimers(): void {
    if (this.loopTimer !== null) this.clock.clear(this.loopTimer);
    if (this.fadeTimer !== null) this.clock.clear(this.fadeTimer);
    this.loopTimer = null;
    this.fadeTimer = null;
  }
}
