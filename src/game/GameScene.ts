import Phaser from 'phaser';
import { createArena, blastTiles, tileAt, type Arena } from './arena.ts';
import { COLS, DIRECTIONS, FLAME_MS, FUSE_MS, ROWS, TILE, VECTORS, key, type Direction, type Point } from './config.ts';

type Actor = { position: Point; body: Phaser.GameObjects.Container; alive: boolean; capacity: number; range: number; active: number };
type Bomb = { position: Point; owner: Actor; range: number; body: Phaser.GameObjects.Container; timer: Phaser.Time.TimerEvent; exploded: boolean };
type PowerUp = { kind: 'bomb' | 'fire'; body: Phaser.GameObjects.Container };

export class GameScene extends Phaser.Scene {
  private arena!: Arena;
  private tiles!: Phaser.GameObjects.Rectangle[][];
  private player!: Actor;
  private rival!: Actor;
  private bombs = new Map<string, Bomb>();
  private flames = new Set<string>();
  private powerUps = new Map<string, PowerUp>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private space!: Phaser.Input.Keyboard.Key;
  private touchDirection: Direction | null = null;
  private nextMove = 0;
  private nextAiMove = 0;
  private nextAiBomb = 0;
  private finished = false;

  constructor() { super('Game'); }

  create(): void {
    this.arena = createArena(); this.bombs.clear(); this.flames.clear(); this.powerUps.clear();
    this.touchDirection = null; this.finished = false; this.nextMove = 0; this.nextAiMove = 0; this.nextAiBomb = 2200;
    this.tiles = [];
    for (let y = 0; y < ROWS; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < COLS; x++) {
        const tile = this.arena[y][x];
        const rect = this.add.rectangle(x * TILE + 20, y * TILE + 20, 38, 38, this.tileColor(tile)).setStrokeStyle(1, 0x15283e, 0.45);
        if (tile === 'crate') rect.setStrokeStyle(3, 0x9c643b);
        this.tiles[y][x] = rect;
      }
    }
    this.player = this.createActor({ x: 1, y: 1 }, 0x56dcb4, false);
    this.rival = this.createActor({ x: 11, y: 9 }, 0xf17a88, true);
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.space = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
    this.updateStats();
    document.getElementById('result')!.classList.add('hidden');
  }

  setTouchDirection(direction: Direction | null): void { this.touchDirection = direction; }
  placePlayerBomb(): void { if (!this.finished) this.placeBomb(this.player); }

  update(time: number): void {
    if (this.finished) return;
    if (Phaser.Input.Keyboard.JustDown(this.space)) this.placePlayerBomb();
    if (time >= this.nextMove) {
      const direction = this.touchDirection ?? (this.cursors.left.isDown || this.wasd.A.isDown ? 'left'
        : this.cursors.right.isDown || this.wasd.D.isDown ? 'right'
        : this.cursors.up.isDown || this.wasd.W.isDown ? 'up'
        : this.cursors.down.isDown || this.wasd.S.isDown ? 'down' : null);
      if (direction) { this.move(this.player, direction); this.nextMove = time + 135; }
    }
    if (time >= this.nextAiMove) { this.moveRival(); this.nextAiMove = time + 280; }
    if (time >= this.nextAiBomb) {
      if (Math.random() < 0.5) this.placeBomb(this.rival);
      this.nextAiBomb = time + 1700 + Math.random() * 1600;
    }
  }

  private tileColor(tile: string): number { return tile === 'wall' ? 0x7086a2 : tile === 'crate' ? 0xc3854c : 0x344d61; }
  private createActor(position: Point, color: number, enemy: boolean): Actor {
    const body = this.add.container(position.x * TILE + 20, position.y * TILE + 20);
    body.add(this.add.circle(0, 1, 15, color).setStrokeStyle(3, enemy ? 0x833e57 : 0x218a79));
    body.add(this.add.circle(-5, -3, 2, 0x172b3a)); body.add(this.add.circle(5, -3, 2, 0x172b3a));
    body.setDepth(5);
    return { position, body, alive: true, capacity: 1, range: 2, active: 0 };
  }
  private walkable(p: Point): boolean { return tileAt(this.arena, p) === 'floor' && !this.bombs.has(key(p)); }
  private step(p: Point, direction: Direction): Point { const v = VECTORS[direction]; return { x: p.x + v.x, y: p.y + v.y }; }
  private move(actor: Actor, direction: Direction): void {
    if (!actor.alive) return;
    const next = this.step(actor.position, direction);
    if (!this.walkable(next)) return;
    actor.position = next;
    this.tweens.add({ targets: actor.body, x: next.x * TILE + 20, y: next.y * TILE + 20, duration: 105, ease: 'Sine.easeOut' });
    if (this.flames.has(key(next))) { this.kill(actor); this.finish(actor === this.rival); }
    if (actor === this.player) this.collect(next);
  }
  private moveRival(): void {
    if (!this.rival.alive) return;
    const choices = Phaser.Utils.Array.Shuffle([...DIRECTIONS]).filter(d => this.walkable(this.step(this.rival.position, d)));
    const safer = choices.filter(d => !this.dangerous(this.step(this.rival.position, d)));
    if (safer.length) this.move(this.rival, safer[0]);
    else if (choices.length && Math.random() < 0.4) this.move(this.rival, choices[0]);
  }
  private dangerous(p: Point): boolean {
    if (this.flames.has(key(p))) return true;
    for (const bomb of this.bombs.values()) if (blastTiles(this.arena, bomb.position, bomb.range).some(t => key(t) === key(p))) return true;
    return false;
  }
  private placeBomb(owner: Actor): void {
    if (!owner.alive || owner.active >= owner.capacity || this.bombs.has(key(owner.position))) return;
    const position = { ...owner.position };
    const body = this.add.container(position.x * TILE + 20, position.y * TILE + 20).setDepth(3);
    body.add(this.add.circle(0, 2, 13, 0x172434).setStrokeStyle(3, 0xb8c4d4));
    body.add(this.add.rectangle(2, -14, 4, 7, 0xffd166));
    const bomb: Bomb = { position, owner, range: owner.range, body, exploded: false,
      timer: this.time.delayedCall(FUSE_MS, () => this.explode(bomb)) };
    this.bombs.set(key(position), bomb); owner.active++;
    this.tweens.add({ targets: body, scale: 1.12, yoyo: true, repeat: 3, duration: 230 });
  }
  private explode(bomb: Bomb): void {
    if (bomb.exploded || this.finished) return;
    bomb.exploded = true; bomb.timer.remove(); bomb.body.destroy();
    this.bombs.delete(key(bomb.position)); bomb.owner.active--;
    const hit = blastTiles(this.arena, bomb.position, bomb.range);
    for (const p of hit) {
      if (tileAt(this.arena, p) === 'crate') {
        this.arena[p.y][p.x] = 'floor'; this.tiles[p.y][p.x].setFillStyle(this.tileColor('floor')).setStrokeStyle(1, 0x15283e, 0.45);
        if (Math.random() < 0.22) this.spawnPowerUp(p);
      }
      const other = this.bombs.get(key(p));
      if (other) this.time.delayedCall(0, () => this.explode(other));
      this.flames.add(key(p));
      const flame = this.add.rectangle(p.x * TILE + 20, p.y * TILE + 20, 34, 34, 0xffb444, 0.9).setDepth(4).setStrokeStyle(4, 0xffe389);
      this.time.delayedCall(FLAME_MS, () => { flame.destroy(); this.flames.delete(key(p)); });
      if (key(this.player.position) === key(p)) this.kill(this.player);
      if (key(this.rival.position) === key(p)) this.kill(this.rival);
    }
    // Simultaneous hits resolve as a loss, regardless of iteration order.
    if (!this.player.alive) this.finish(false);
    else if (!this.rival.alive) this.finish(true);
  }
  private spawnPowerUp(p: Point): void {
    const kind = Math.random() < 0.5 ? 'bomb' : 'fire';
    const body = this.add.container(p.x * TILE + 20, p.y * TILE + 20).setDepth(2);
    body.add(this.add.circle(0, 0, 12, kind === 'bomb' ? 0x7d77ec : 0xef9d42).setStrokeStyle(2, 0xffffff));
    body.add(this.add.text(0, 0, kind === 'bomb' ? 'B+' : 'F+', { fontFamily: 'Arial', fontSize: '12px', color: '#ffffff', fontStyle: 'bold' }).setOrigin(0.5));
    this.powerUps.set(key(p), { kind, body });
  }
  private collect(p: Point): void {
    const power = this.powerUps.get(key(p)); if (!power) return;
    if (power.kind === 'bomb') this.player.capacity++; else this.player.range++;
    power.body.destroy(); this.powerUps.delete(key(p)); this.updateStats();
  }
  private updateStats(): void { document.getElementById('stats')!.textContent = `Bombs ${this.player.capacity} · Fire ${this.player.range}`; }
  private kill(actor: Actor): void { actor.alive = false; actor.body.setAlpha(0.3); }
  private finish(victory: boolean): void {
    if (this.finished) return;
    this.finished = true;
    document.getElementById('result-title')!.textContent = victory ? 'VICTORY' : 'GAME OVER';
    document.getElementById('result')!.classList.remove('hidden');
    document.getElementById('restart')!.focus();
  }
}
