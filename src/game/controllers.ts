import Phaser from 'phaser';
import type { Direction, Point } from './config.ts';
import type { PlayerId } from './players.ts';

export type ControllerHost = {
  movePlayer(id: PlayerId, direction: Direction): boolean;
  placePlayerBomb(id: PlayerId): void;
  availableMoves(id: PlayerId): Array<{ direction: Direction; point: Point }>;
  isDangerous(point: Point): boolean;
};

export interface PlayerController { update(time: number): void; }

export class LocalController implements PlayerController {
  private nextMove = 0;
  constructor(
    private readonly id: PlayerId,
    private readonly host: ControllerHost,
    private readonly direction: () => Direction | null,
    private readonly bombRequested: () => boolean
  ) {}
  update(time: number): void {
    if (this.bombRequested()) this.host.placePlayerBomb(this.id);
    const direction = this.direction();
    if (direction && time >= this.nextMove) {
      this.host.movePlayer(this.id, direction);
      this.nextMove = time + 135;
    }
  }
}

export class BotController implements PlayerController {
  private nextMove = 0;
  private nextBomb = 1700 + Math.random() * 1200;
  constructor(private readonly id: PlayerId, private readonly host: ControllerHost) {}
  update(time: number): void {
    if (time >= this.nextMove) {
      const options = this.host.availableMoves(this.id);
      const safe = options.filter(option => !this.host.isDangerous(option.point));
      const choice = Phaser.Utils.Array.GetRandom(safe.length ? safe : options);
      if (choice) this.host.movePlayer(this.id, choice.direction);
      this.nextMove = time + 240 + Math.random() * 140;
    }
    if (time >= this.nextBomb) {
      if (Math.random() < 0.52) this.host.placePlayerBomb(this.id);
      this.nextBomb = time + 1700 + Math.random() * 1700;
    }
  }
}

// A future network adapter can enqueue authoritative input here without changing PlayerState.
export class RemoteController implements PlayerController {
  update(): void { /* Intentionally idle until networking is introduced. */ }
}
