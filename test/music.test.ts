import assert from 'node:assert/strict';
import test from 'node:test';
import { MatchMusic, type MusicAudio, type MusicClock } from '../src/audio/MatchMusic.ts';

class FakeAudio implements MusicAudio {
  currentTime = 0;
  duration = 33;
  volume = 0;
  loop = false;
  preload = '';
  onloadedmetadata: ((this: GlobalEventHandlers, event: Event) => void) | null = null;
  playing = false;
  plays = 0;
  play(): Promise<void> { this.playing = true; this.plays++; return Promise.resolve(); }
  pause(): void { this.playing = false; }
}

test('music crossfades at metadata duration and cleans up across rounds', async () => {
  let now = 0;
  let nextId = 0;
  const tasks = new Map<number, { at: number; run: () => void }>();
  const clock: MusicClock = {
    set(run, delay) { const id = ++nextId; tasks.set(id, { at: now + delay, run }); return id; },
    clear(handle) { tasks.delete(handle as number); }
  };
  const tracks: FakeAudio[] = [];
  const music = new MatchMusic('/Bomb-It/assets/bombit-hash.mp3', () => {
    const audio = new FakeAudio(); tracks.push(audio); return audio;
  }, clock);
  music.start();
  await Promise.resolve();
  assert.equal(music.active, true);
  assert.equal(tracks[0]?.volume, 0.24);
  assert.equal(tasks.size, 1);
  const firstLoop = [...tasks.entries()][0]!;
  assert.equal(firstLoop[1].at, 32200);
  now = firstLoop[1].at; tasks.delete(firstLoop[0]); firstLoop[1].run();
  await Promise.resolve();
  for (let i = 0; i < 16; i++) {
    const task = [...tasks.entries()].sort((a, b) => a[1].at - b[1].at)[0]!;
    now = task[1].at; tasks.delete(task[0]); task[1].run();
  }
  assert.equal(tracks[0]?.playing, false);
  assert.equal(tracks[1]?.playing, true);
  assert.equal(tracks[1]?.volume, 0.24);
  music.start();
  await Promise.resolve();
  assert.equal(tracks[1]?.playing, false);
  assert.equal(tracks[2]?.playing, true);
  assert.equal(tracks.filter(track => track.playing).length, 1);
  music.stop();
  assert.equal(music.active, false);
  assert.equal(tracks.filter(track => track.playing).length, 0);
  assert.equal(tasks.size, 0);
});
