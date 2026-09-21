import Phaser from 'phaser';
import { allocateSpawns, blastTiles, createArena, tileAt, type Arena } from './arena.ts';
import { BotController, LocalController, RemoteController, type ControllerHost, type PlayerController } from './controllers.ts';
import { DEFAULT_ARENA, DIRECTIONS, FLAME_MS, FUSE_MS, TILE, VECTORS, key, type Direction, type Point } from './config.ts';
import { evaluateMatch } from './matchRules.ts';
import { canPlaceBomb, claimBomb, releaseBomb, type PlayerId, type PlayerState } from './players.ts';
import type { Participant, RoundResult } from '../app/state.ts';

type Bomb = { position: Point; ownerId: PlayerId; range: number; body: Phaser.GameObjects.Container; timer: Phaser.Time.TimerEvent; exploded: boolean };
type PowerUp = { kind: 'bomb' | 'fire'; body: Phaser.GameObjects.Container };
export type MatchHud = { alive: number; total: number; localName: string; bombs: number; fire: number };
export type MatchOptions = { participants: Participant[]; onResult: (result: RoundResult) => void; onHud: (hud: MatchHud) => void };

const COLORS = [0x56dcb4, 0xf17a88, 0x7ca8ff, 0xffca67, 0xc987f2, 0x75d9f0];

export class GameScene extends Phaser.Scene implements ControllerHost {
  private arena!: Arena;
  private tiles: Phaser.GameObjects.Rectangle[][] = [];
  private tileDetails: Phaser.GameObjects.Container[][] = [];
  private players = new Map<PlayerId, PlayerState>();
  private views = new Map<PlayerId, Phaser.GameObjects.Container>();
  private controllers = new Map<PlayerId, PlayerController>();
  private bombs = new Map<string, Bomb>();
  private flames = new Set<string>();
  private powerUps = new Map<string, PowerUp>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private space!: Phaser.Input.Keyboard.Key;
  private touchDirection: Direction | null = null;
  private bombQueued = false;
  private finished = false;

  constructor(private readonly options: MatchOptions) { super('Game'); }

  create(): void {
    const { cols, rows } = DEFAULT_ARENA;
    const participants = this.options.participants.slice(0, 6);
    const spawns = allocateSpawns(participants.length, cols, rows);
    this.arena = createArena({ cols, rows, playerCount: participants.length });
    this.players.clear(); this.views.clear(); this.controllers.clear(); this.bombs.clear(); this.flames.clear(); this.powerUps.clear();
    this.touchDirection = null; this.bombQueued = false; this.finished = false;
    this.drawArena();
    participants.forEach((participant, index) => {
      const player: PlayerState = { id: participant.id, name: participant.name, position: spawns[index], alive: true, bombCapacity: 1, fireRange: 2, activeBombs: 0, controller: participant.controller, color: COLORS[index] };
      this.players.set(player.id, player); this.views.set(player.id, this.createPlayerView(player));
    });
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.space = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    for (const player of this.players.values()) {
      const controller = player.controller === 'local'
        ? new LocalController(player.id, this, () => this.localDirection(), () => this.consumeBombRequest())
        : player.controller === 'bot' ? new BotController(player.id, this) : new RemoteController();
      this.controllers.set(player.id, controller);
    }
    this.updateHud();
  }

  update(time: number): void {
    if (this.finished) return;
    if (Phaser.Input.Keyboard.JustDown(this.space)) this.bombQueued = true;
    for (const controller of this.controllers.values()) controller.update(time);
  }

  setTouchDirection(direction: Direction | null): void { this.touchDirection = direction; }
  queueLocalBomb(): void { if (!this.finished) this.bombQueued = true; }

  movePlayer(id: PlayerId, direction: Direction): boolean {
    const player = this.players.get(id); if (!player?.alive) return false;
    const next = this.step(player.position, direction);
    if (!this.walkable(next, id)) return false;
    player.position = next;
    const view = this.views.get(id)!;
    this.tweens.add({ targets: view, x: next.x * TILE + TILE / 2, y: next.y * TILE + TILE / 2, duration: 105, ease: 'Sine.easeOut' });
    if (this.flames.has(key(next))) { this.killPlayer(player); this.resolveResult(); }
    this.collect(player, next);
    return true;
  }

  placePlayerBomb(id: PlayerId): void {
    const owner = this.players.get(id);
    if (!owner || !canPlaceBomb(owner) || this.bombs.has(key(owner.position))) return;
    const position = { ...owner.position };
    const body = this.add.container(position.x * TILE + TILE / 2, position.y * TILE + TILE / 2).setDepth(3);
    body.add([this.add.ellipse(0, 12, 29, 8, 0x071322, 0.65), this.add.circle(0, 1, 13, 0x172434).setStrokeStyle(3, 0xd3dee6), this.add.circle(-4, -5, 4, 0xffffff, 0.3), this.add.rectangle(2, -14, 4, 7, 0xffd166)]);
    const bomb: Bomb = { position, ownerId: owner.id, range: owner.fireRange, body, exploded: false, timer: this.time.delayedCall(FUSE_MS, () => this.explode(bomb)) };
    this.bombs.set(key(position), bomb); claimBomb(owner);
    this.tweens.add({ targets: body, scale: 1.12, yoyo: true, repeat: 3, duration: 230 });
    const pulse = this.add.circle(body.x, body.y, 17, 0xffd166, 0).setStrokeStyle(3, 0xffd166).setDepth(6);
    this.tweens.add({ targets: pulse, scale: 1.6, alpha: 0, duration: 360, onComplete: () => pulse.destroy() });
    this.updateHud();
  }

  availableMoves(id: PlayerId): Array<{ direction: Direction; point: Point }> {
    const player = this.players.get(id); if (!player?.alive) return [];
    return DIRECTIONS.map(direction => ({ direction, point: this.step(player.position, direction) })).filter(option => this.walkable(option.point, id));
  }

  isDangerous(point: Point): boolean {
    if (this.flames.has(key(point))) return true;
    return [...this.bombs.values()].some(bomb => blastTiles(this.arena, bomb.position, bomb.range).some(tile => key(tile) === key(point)));
  }

  private drawArena(): void {
    this.tiles = []; this.tileDetails = [];
    for (let y = 0; y < this.arena.length; y++) {
      this.tiles[y] = []; this.tileDetails[y] = [];
      for (let x = 0; x < this.arena[y].length; x++) {
        const tile = this.arena[y][x];
        this.tiles[y][x] = this.add.rectangle(x * TILE + TILE / 2, y * TILE + TILE / 2, TILE - 1, TILE - 1, this.tileColor(tile, x, y)).setStrokeStyle(1, 0x15283e, 0.55);
        this.tileDetails[y][x] = this.drawTileDetail(x, y, tile);
      }
    }
  }

  private tileColor(tile: string, x: number, y: number): number { return tile === 'wall' ? 0x5a728e : tile === 'crate' ? 0x975c3f : (x + y) % 2 ? 0x253d53 : 0x2b455a; }
  private drawTileDetail(x: number, y: number, tile: string): Phaser.GameObjects.Container {
    const detail = this.add.container(x * TILE + TILE / 2, y * TILE + TILE / 2);
    if (tile === 'wall') detail.add([this.add.rectangle(0, -3, 31, 28, 0x849bb1).setStrokeStyle(2, 0xacc0d0), this.add.rectangle(0, 13, 32, 5, 0x354f6a)]);
    else if (tile === 'crate') detail.add([this.add.rectangle(0, 0, 31, 31, 0xc38150).setStrokeStyle(2, 0x613d36), this.add.rectangle(0, 0, 27, 6, 0xe0a16b), this.add.rectangle(-10, -10, 3, 3, 0x59372f), this.add.rectangle(10, 10, 3, 3, 0x59372f)]);
    else detail.add(this.add.rectangle(-14, -14, 3, 3, 0x65829a, 0.48));
    return detail;
  }

  private createPlayerView(player: PlayerState): Phaser.GameObjects.Container {
    const body = this.add.container(player.position.x * TILE + TILE / 2, player.position.y * TILE + TILE / 2).setDepth(5);
    body.add([this.add.ellipse(1, 11, 27, 9, 0x081929, 0.65), this.add.circle(0, 0, 15, player.color).setStrokeStyle(3, 0x173b55), this.add.ellipse(-5, -9, 11, 4, 0xffffff, 0.38), this.add.circle(-5, -3, 2, 0x172b3a), this.add.circle(5, -3, 2, 0x172b3a)]);
    return body;
  }

  private localDirection(): Direction | null {
    return this.touchDirection ?? (this.cursors.left.isDown || this.wasd.A.isDown ? 'left' : this.cursors.right.isDown || this.wasd.D.isDown ? 'right' : this.cursors.up.isDown || this.wasd.W.isDown ? 'up' : this.cursors.down.isDown || this.wasd.S.isDown ? 'down' : null);
  }
  private consumeBombRequest(): boolean { const requested = this.bombQueued; this.bombQueued = false; return requested; }
  private step(point: Point, direction: Direction): Point { return { x: point.x + VECTORS[direction].x, y: point.y + VECTORS[direction].y }; }
  private walkable(point: Point, movingId: PlayerId): boolean {
    return tileAt(this.arena, point) === 'floor' && !this.bombs.has(key(point)) && ![...this.players.values()].some(player => player.id !== movingId && player.alive && key(player.position) === key(point));
  }

  private explode(bomb: Bomb): void {
    if (bomb.exploded || this.finished) return;
    bomb.exploded = true; bomb.timer.remove(); bomb.body.destroy(); this.bombs.delete(key(bomb.position));
    const owner = this.players.get(bomb.ownerId); if (owner) releaseBomb(owner);
    for (const point of blastTiles(this.arena, bomb.position, bomb.range)) {
      if (tileAt(this.arena, point) === 'crate') {
        this.arena[point.y][point.x] = 'floor'; this.tiles[point.y][point.x].setFillStyle(this.tileColor('floor', point.x, point.y));
        this.tileDetails[point.y][point.x].destroy(); this.tileDetails[point.y][point.x] = this.drawTileDetail(point.x, point.y, 'floor');
        if (Math.random() < 0.22) this.spawnPowerUp(point);
      }
      const chained = this.bombs.get(key(point)); if (chained) this.time.delayedCall(0, () => this.explode(chained));
      this.flames.add(key(point));
      const flame = this.add.container(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2).setDepth(4);
      flame.add([this.add.rectangle(0, 0, 35, 13, 0xff923c), this.add.rectangle(0, 0, 13, 35, 0xff923c), this.add.circle(0, 0, 10, 0xffe27a)]);
      this.tweens.add({ targets: flame, alpha: 0.35, duration: FLAME_MS - 100, ease: 'Sine.easeIn' });
      this.time.delayedCall(FLAME_MS, () => { flame.destroy(); this.flames.delete(key(point)); });
      for (const player of this.players.values()) if (player.alive && key(player.position) === key(point)) this.killPlayer(player);
    }
    this.updateHud(); this.resolveResult();
  }

  private spawnPowerUp(point: Point): void {
    const kind = Math.random() < 0.5 ? 'bomb' : 'fire';
    const body = this.add.container(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2).setDepth(2);
    body.add([this.add.circle(0, 0, 14, kind === 'bomb' ? 0x6567d7 : 0xe9833f).setStrokeStyle(3, 0xf5eacb), this.add.text(0, 0, kind === 'bomb' ? 'B+' : 'F+', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5)]);
    this.powerUps.set(key(point), { kind, body });
  }
  private collect(player: PlayerState, point: Point): void {
    const power = this.powerUps.get(key(point)); if (!power) return;
    if (power.kind === 'bomb') player.bombCapacity++; else player.fireRange++;
    power.body.destroy(); this.powerUps.delete(key(point)); this.updateHud();
  }
  private killPlayer(player: PlayerState): void { player.alive = false; this.views.get(player.id)?.setAlpha(0.28); }
  private updateHud(): void {
    const local = [...this.players.values()].find(player => player.controller === 'local') ?? [...this.players.values()][0];
    this.options.onHud({ alive: [...this.players.values()].filter(player => player.alive).length, total: this.players.size, localName: local?.name ?? 'Player', bombs: local?.bombCapacity ?? 1, fire: local?.fireRange ?? 2 });
  }
  private resolveResult(): void {
    const result = evaluateMatch(this.players.values()); if (result.status === 'ongoing' || this.finished) return;
    this.finished = true;
    const winner = result.status === 'winner' ? this.players.get(result.winnerId) : undefined;
    const payload: RoundResult = { kind: result.status === 'winner' ? 'winner' : 'draw', winnerId: winner?.id, winnerName: winner?.name, statuses: [...this.players.values()].map(player => ({ id: player.id, name: player.name, alive: player.alive })) };
    this.time.delayedCall(FLAME_MS, () => this.options.onResult(payload));
  }
}
