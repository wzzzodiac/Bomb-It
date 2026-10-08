import Phaser from 'phaser';
import { ART, BLAST, blastMasks, prepareArt, ROBOT_COLORS, tileFrame } from './art.ts';
import atlasUrl from '../assets/bolt/atlas.png?url';
import atlasDataUrl from '../assets/bolt/atlas.json?url';
import blastUrl from '../assets/bolt/blast.png?url';
import blastDataUrl from '../assets/bolt/blast.json?url';
import { PlayerLabels, type LabelPlayer } from '../ui/playerLabels.ts';
import { allocateSpawns, blastTiles, createArena, tileAt, type Arena } from './arena.ts';
import { canEscapeBomb, findEscapeDirection, type BombThreat } from './botLogic.ts';
import { BotController, LocalController, RemoteController, type ControllerHost, type PlayerController } from './controllers.ts';
import { DIRECTIONS, FLAME_MS, FUSE_MS, TILE, VECTORS, key, type ArenaSize, type Direction, type Point } from './config.ts';
import { evaluateMatch } from './matchRules.ts';
import { canPlaceBomb, claimBomb, releaseBomb, type PlayerId, type PlayerState } from './players.ts';
import type { Participant, RoundResult } from '../app/state.ts';
import { OnlinePrediction } from '../network/prediction.ts';
import type { BombAck, InitialMatchState, InputAck, MatchExplosion, MatchState } from '../network/types.ts';

type Bomb = { position: Point; ownerId: PlayerId; range: number; body: Phaser.GameObjects.Container; timer: Phaser.Time.TimerEvent; exploded: boolean };
type PowerUp = { kind: 'bomb' | 'fire'; body: Phaser.GameObjects.Container };
export type MatchHud = { alive: number; total: number; localName: string; bombs: number; fire: number; players:LabelPlayer[] };
export type MatchOptions =
  | { participants: Participant[]; arenaSize: ArenaSize; onResult: (result: RoundResult) => void; onHud: (hud: MatchHud) => void; onAssetError?:()=>void; online?: never }
  | { arenaSize: ArenaSize; onHud: (hud: MatchHud) => void; onAssetError?:()=>void; online: { initial: InitialMatchState; selfPlayerId: string; sendDirection: (direction: Direction, onAck: (result: InputAck) => void) => boolean; sendBomb: (onAck: (result: BombAck) => void) => boolean }; participants?: never; onResult?: never };

const COLORS = ROBOT_COLORS;

export class GameScene extends Phaser.Scene implements ControllerHost {
  private arena!: Arena;
  private tiles: Phaser.GameObjects.Image[][] = [];
  private players = new Map<PlayerId, PlayerState>();
  private views = new Map<PlayerId, Phaser.GameObjects.Container>();
  private controllers = new Map<PlayerId, PlayerController>();
  private bombs = new Map<string, Bomb>();
  private onlineBombs = new Map<string, Phaser.GameObjects.Container>();
  private onlineViewTargets = new Map<PlayerId, string>();
  private prediction: OnlinePrediction | null = null;
  private pendingBombBody: Phaser.GameObjects.Container | null = null;
  private pendingBombTimer: Phaser.Time.TimerEvent | null = null;
  private pendingBombKnownIds = new Set<string>();
  private flames = new Set<string>();
  private powerUps = new Map<string, PowerUp>();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private space!: Phaser.Input.Keyboard.Key;
  private touchDirection: Direction | null = null;
  private bombQueued = false;
  private finished = false;
  private onlineRevision = -1;
  private onlineReady = false;
  private pendingOnlineState: MatchState | null = null;
  private pendingOnlineExplosions: MatchExplosion[] = [];
  private lastOnlineInput = -135;
  private artReady=false;
  private visualSlots = new Map<PlayerId,number>();
  private labels:PlayerLabels | null = null;
  private visualHazards = new Map<Phaser.GameObjects.Sprite,Point>();

  constructor(private readonly options: MatchOptions) { super('Game'); }

  preload():void {
    this.load.atlas(ART,atlasUrl,atlasDataUrl);
    this.load.atlas(BLAST,blastUrl,blastDataUrl);
  }

  create(): void {
    if(!this.textures.exists(ART)||!this.textures.exists(BLAST)){this.options.onAssetError?.();return;}
    this.artReady=true;
    if (this.options.online) { this.createOnline(); return; }
    const { cols, rows } = this.options.arenaSize;
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
    this.createKeyboard();
    for (const player of this.players.values()) {
      const controller = player.controller === 'local'
        ? new LocalController(player.id, this, () => this.localDirection(), () => this.consumeBombRequest())
        : player.controller === 'bot' ? new BotController(player.id, this) : new RemoteController();
      this.controllers.set(player.id, controller);
    }
    this.updateHud();
  }

  update(time: number): void {
    if (this.finished || !this.artReady) return;
    if (this.options.online) {
      if (Phaser.Input.Keyboard.JustDown(this.space)) this.queueOnlineBomb();
      const direction = this.localDirection();
      if (direction && time - this.lastOnlineInput >= 135) {
        this.lastOnlineInput = time;
        const predicted = this.prediction?.predict(direction);
        if (predicted) this.moveOnlineView(this.options.online.selfPlayerId, predicted.target, 105);
        const sent = this.options.online.sendDirection(direction, result => {
          if (predicted) this.reconcileOnlineView(this.prediction?.acknowledge(predicted.id, result));
        });
        if (!sent && predicted) this.reconcileOnlineView(this.prediction?.cancel(predicted.id));
      }
      return;
    }
    if (Phaser.Input.Keyboard.JustDown(this.space)) this.bombQueued = true;
    for (const controller of this.controllers.values()) controller.update(time);
  }

  setTouchDirection(direction: Direction | null): void { this.touchDirection = direction; }
  queueLocalBomb(): void { if (!this.finished && !this.options.online) this.bombQueued = true; }
  queueOnlineBomb(): void {
    const online = this.options.online;
    if (this.finished || !this.onlineReady || !online || this.pendingBombBody) return;
    const point = this.prediction?.visualPosition ?? this.players.get(online.selfPlayerId)?.position;
    if (!point) return;
    this.pendingBombBody = this.createBombView(point).setAlpha(0.52);
    this.pendingBombKnownIds = new Set(this.onlineBombs.keys());
    this.pendingBombTimer = this.time.delayedCall(4000, () => this.clearPendingBomb());
    const sent = online.sendBomb(result => {
      if (!result.ok || !result.placed) this.clearPendingBomb();
      else {this.reactPlayer(online.selfPlayerId);if (this.onlineRevision >= result.revision) this.clearPendingBomb();}
    });
    if (!sent) this.clearPendingBomb();
  }

  movePlayer(id: PlayerId, direction: Direction): boolean {
    if (this.options.online) return false;
    const player = this.players.get(id); if (!player?.alive) return false;
    const next = this.step(player.position, direction);
    if (!this.walkable(next, id)) return false;
    player.position = next;
    const view = this.views.get(id)!;
    this.animatePlayer(id,direction);
    this.tweens.add({ targets: view, x: next.x * TILE + TILE / 2, y: next.y * TILE + TILE / 2, duration: 105, ease: 'Sine.easeOut' });
    if (this.flames.has(key(next))) { this.killPlayer(player); this.resolveResult(); }
    this.collect(player, next);
    return true;
  }

  placePlayerBomb(id: PlayerId): boolean {
    if (this.options.online) return false;
    const owner = this.players.get(id);
    if (!owner || !canPlaceBomb(owner) || this.bombs.has(key(owner.position))) return false;
    const position = { ...owner.position };
    const body = this.createBombView(position);
    const bomb: Bomb = { position, ownerId: owner.id, range: owner.fireRange, body, exploded: false, timer: this.time.delayedCall(FUSE_MS, () => this.explode(bomb)) };
    this.bombs.set(key(position), bomb); claimBomb(owner);
    this.reactPlayer(id);
    this.updateHud();
    return true;
  }

  availableMoves(id: PlayerId): Array<{ direction: Direction; point: Point }> {
    const player = this.players.get(id); if (!player?.alive) return [];
    return DIRECTIONS.map(direction => ({ direction, point: this.step(player.position, direction) })).filter(option => this.walkable(option.point, id));
  }

  isDangerous(point: Point): boolean {
    if (this.flames.has(key(point))) return true;
    return this.bombThreats().some(bomb => blastTiles(this.arena, bomb.position, bomb.range).some(tile => key(tile) === key(point)));
  }

  isPlayerDangerous(id: PlayerId): boolean {
    const player = this.players.get(id);
    return player ? this.isDangerous(player.position) : false;
  }

  escapeDirection(id: PlayerId): Direction | null {
    const player = this.players.get(id);
    if (!player?.alive) return null;
    return findEscapeDirection(this.arena, player.position, this.bombThreats(), this.blockedTiles(id), this.escapeSearchDepth());
  }

  canSafelyPlaceBomb(id: PlayerId): boolean {
    const player = this.players.get(id);
    if (!player?.alive || !canPlaceBomb(player) || this.bombs.has(key(player.position))) return false;
    const hypothetical = [...this.bombThreats(), { position: player.position, range: player.fireRange }];
    return canEscapeBomb(this.arena, player.position, hypothetical, this.blockedTiles(id), player.fireRange + 3);
  }

  private drawArena(): void {
    prepareArt(this);
    const parent=document.getElementById('game');
    if(parent){this.labels=new PlayerLabels(parent);this.events.on(Phaser.Scenes.Events.POST_UPDATE,()=>this.labels?.update(this.labelPlayers(),this.scale.width,this.scale.height,[...this.visualHazards.values()]));this.events.once(Phaser.Scenes.Events.SHUTDOWN,()=>this.labels?.destroy());}
    this.tiles = [];
    for (let y = 0; y < this.arena.length; y++) {
      this.tiles[y] = [];
      for (let x = 0; x < this.arena[y].length; x++) {
        const tile = this.arena[y][x];
        this.tiles[y][x] = this.add.image(x * TILE + TILE / 2, y * TILE + TILE / 2, ART, tileFrame(tile, x, y)).setDisplaySize(TILE, TILE);
      }
    }
  }

  private createKeyboard(): void {
    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as typeof this.wasd;
    this.space = keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    keyboard.addCapture(['SPACE', 'UP', 'DOWN', 'LEFT', 'RIGHT']);
  }

  private createOnline(): void {
    const online = this.options.online;
    if (!online) throw new Error('Online match options are required.');
    this.arena = online.initial.arena.tiles;
    this.onlineRevision = online.initial.revision;
    this.players.clear(); this.views.clear(); this.controllers.clear(); this.bombs.clear(); this.onlineBombs.clear(); this.onlineViewTargets.clear(); this.flames.clear(); this.powerUps.clear();
    this.prediction = new OnlinePrediction(online.initial, this.arena, online.selfPlayerId);
    this.clearPendingBomb();
    this.touchDirection = null; this.bombQueued = false; this.finished = false;
    this.drawArena();
    this.createKeyboard();
    this.applyOnlinePlayers(online.initial.players);
    this.applyOnlineObjects(online.initial);
    this.onlineReady = true;
    for (const event of this.pendingOnlineExplosions) this.applyOnlineExplosion(event);
    this.pendingOnlineExplosions = [];
    if (this.pendingOnlineState) this.applyOnlineState(this.pendingOnlineState);
    this.pendingOnlineState = null;
  }

  applyOnlineState(state: MatchState): void {
    if (!this.options.online || state.roomCode !== this.options.online.initial.roomCode) return;
    if (!this.onlineReady) { if (!this.pendingOnlineState || state.revision > this.pendingOnlineState.revision) this.pendingOnlineState = state; return; }
    if (state.revision <= this.onlineRevision) return;
    this.onlineRevision = state.revision;
    const predicted = this.prediction?.apply(state);
    this.applyOnlinePlayers(state.players, predicted);
    this.applyOnlineObjects(state);
    if (state.status === 'finished') { this.finished = true; this.clearPendingBomb(); }
  }

  applyOnlineExplosion(event: MatchExplosion): void {
    if (!this.options.online || event.roomCode !== this.options.online.initial.roomCode) return;
    if (!this.onlineReady) { this.pendingOnlineExplosions.push(event); return; }
    if (event.revision < this.onlineRevision) return;
    for (const change of event.changes) {
      if (!this.tiles[change.y]?.[change.x]) continue;
      this.arena[change.y][change.x] = change.tile;
      this.tiles[change.y][change.x].setFrame(tileFrame(change.tile, change.x, change.y));
    }
    const masks=blastMasks(event.tiles);
    event.tiles.forEach((point,index)=>this.renderFlame(point,event.durationMs,masks[index]));
  }

  private applyOnlineObjects(state: MatchState): void {
    const incomingBombIds = new Set(state.bombs.map(bomb => bomb.id));
    if (this.pendingBombBody && state.bombs.some(bomb => bomb.ownerId === this.options.online?.selfPlayerId && !this.pendingBombKnownIds.has(bomb.id))) this.clearPendingBomb();
    for (const [id, body] of this.onlineBombs) if (!incomingBombIds.has(id)) { body.destroy(); this.onlineBombs.delete(id); }
    for (const bomb of state.bombs) if (!this.onlineBombs.has(bomb.id)) this.onlineBombs.set(bomb.id, this.createBombView(bomb.position));
    const incomingPowerKeys = new Set(state.powerUps.map(power => key(power.position)));
    for (const [position, power] of this.powerUps) if (!incomingPowerKeys.has(position)) { power.body.destroy(); this.powerUps.delete(position); }
    for (const power of state.powerUps) if (!this.powerUps.has(key(power.position))) this.createPowerUpView(power.position, power.kind);
  }

  private applyOnlinePlayers(incoming: MatchState['players'], predicted: Point | null = null): void {
    const selfId = this.options.online?.selfPlayerId;
    incoming.forEach((entry, index) => {
      let player = this.players.get(entry.id);
      if (!player) {
        player = { ...entry, position: { ...entry.position }, controller: entry.id === selfId ? 'local' : 'remote', color: COLORS[index % COLORS.length] };
        this.players.set(entry.id, player);
        this.views.set(entry.id, this.createPlayerView(player));
        this.onlineViewTargets.set(entry.id, key(entry.position));
      } else {
        Object.assign(player, entry, { position: { ...entry.position } });
        this.moveOnlineView(entry.id, entry.id === selfId ? predicted ?? entry.position : entry.position, entry.id === selfId ? 90 : 145);
      }
      this.views.get(entry.id)?.setAlpha(entry.alive ? 1 : 0.28);
    });
    for (const id of this.players.keys()) if (!incoming.some(player => player.id === id)) { this.views.get(id)?.destroy(); this.views.delete(id); this.players.delete(id); this.onlineViewTargets.delete(id); }
    this.updateHud();
  }

  private moveOnlineView(id: PlayerId, point: Point, duration: number): void {
    const view = this.views.get(id);
    if (!view || this.onlineViewTargets.get(id) === key(point)) return;
    const dx=point.x*TILE+TILE/2-view.x,dy=point.y*TILE+TILE/2-view.y;
    this.animatePlayer(id,Math.abs(dx)>Math.abs(dy)?(dx>0?'right':'left'):(dy>0?'down':'up'));
    this.onlineViewTargets.set(id, key(point));
    this.tweens.killTweensOf(view);
    this.tweens.add({ targets: view, x: point.x * TILE + TILE / 2, y: point.y * TILE + TILE / 2, duration, ease: 'Linear' });
  }

  private reconcileOnlineView(point: Point | null | undefined): void {
    const id = this.options.online?.selfPlayerId;
    if (id && point) this.moveOnlineView(id, point, 90);
  }

  private clearPendingBomb(): void {
    this.pendingBombTimer?.remove();
    this.pendingBombTimer = null;
    this.pendingBombBody?.destroy();
    this.pendingBombBody = null;
    this.pendingBombKnownIds.clear();
  }

  private createPlayerView(player: PlayerState): Phaser.GameObjects.Container {
    const slot=player.controller==='local'?1:2+[...this.visualSlots.values()].filter(n=>n!==1).length;
    this.visualSlots.set(player.id,slot);
    const body = this.add.container(player.position.x * TILE + TILE / 2, player.position.y * TILE + TILE / 2).setDepth(5);
    body.add(this.add.sprite(0, 0, ART, `bot-${slot-1}-down-0`).setDisplaySize(TILE, TILE));
    if (player.controller === 'local') body.add(this.add.triangle(0, 18, 0, 0, 6, 0, 3, -3, 0xffffff).setOrigin(0.5));
    return body;
  }

  private animatePlayer(id:PlayerId,direction:Direction):void {
    const sprite=this.views.get(id)?.list[0] as Phaser.GameObjects.Sprite | undefined;
    const slot=this.visualSlots.get(id);if(!sprite||!slot)return;
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)sprite.setFrame(`bot-${slot-1}-${direction}-0`);
    else sprite.play(`walk-${slot-1}-${direction}`);
  }
  private labelPlayers():LabelPlayer[]{return [...this.players.values()].map(p=>({id:p.id,name:p.name,slot:this.visualSlots.get(p.id)??1,self:p.controller==='local',alive:p.alive,x:this.views.get(p.id)?.x??0,y:this.views.get(p.id)?.y??0}));}
  private reactPlayer(id:PlayerId):void {
    const sprite=this.views.get(id)?.list[0] as Phaser.GameObjects.Sprite | undefined,slot=this.visualSlots.get(id);
    if(!sprite||!slot||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const previous=sprite.frame.name,frame=`react-${slot-1}`;sprite.stop().setFrame(frame);
    this.time.delayedCall(280,()=>{if(sprite.active&&sprite.frame.name===frame)sprite.setFrame(previous);});
  }

  private createBombView(position: Point): Phaser.GameObjects.Container {
    const body = this.add.container(position.x * TILE + TILE / 2, position.y * TILE + TILE / 2).setDepth(3);
    body.add(this.add.image(0, 0, ART, 'bomb').setDisplaySize(TILE, TILE));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.tweens.add({ targets: body, scale: 1.06, yoyo: true, repeat: 3, duration: 230 });
    }
    return body;
  }

  private renderFlame(point: Point, durationMs: number, mask=15): void {
    const flame=this.add.sprite(point.x*TILE+TILE/2,point.y*TILE+TILE/2,BLAST,`blast-${mask}-0`).setDisplaySize(TILE,TILE).setDepth(4);
    this.visualHazards.set(flame,point);
    if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)flame.play(`blast-${mask}`);
    // Constant readable danger; no residual, alpha fade or oversized particles.
    this.time.delayedCall(durationMs,()=>{this.visualHazards.delete(flame);flame.destroy();});
  }

  private localDirection(): Direction | null {
    return this.touchDirection ?? (this.cursors.left.isDown || this.wasd.A.isDown ? 'left' : this.cursors.right.isDown || this.wasd.D.isDown ? 'right' : this.cursors.up.isDown || this.wasd.W.isDown ? 'up' : this.cursors.down.isDown || this.wasd.S.isDown ? 'down' : null);
  }
  private consumeBombRequest(): boolean { const requested = this.bombQueued; this.bombQueued = false; return requested; }
  private step(point: Point, direction: Direction): Point { return { x: point.x + VECTORS[direction].x, y: point.y + VECTORS[direction].y }; }
  private walkable(point: Point, movingId: PlayerId): boolean {
    return tileAt(this.arena, point) === 'floor' && !this.bombs.has(key(point)) && ![...this.players.values()].some(player => player.id !== movingId && player.alive && key(player.position) === key(point));
  }

  private bombThreats(): BombThreat[] {
    return [...this.bombs.values()].map(({ position, range }) => ({ position, range }));
  }
  private blockedTiles(movingId: PlayerId): Set<string> {
    return new Set([
      ...this.bombs.keys(),
      ...this.flames,
      ...[...this.players.values()].filter(player => player.id !== movingId && player.alive).map(player => key(player.position))
    ]);
  }
  private escapeSearchDepth(): number {
    return Math.min(12, Math.max(5, ...this.bombThreats().map(bomb => bomb.range + 3)));
  }

  private explode(bomb: Bomb): void {
    if (bomb.exploded || this.finished) return;
    bomb.exploded = true; bomb.timer.remove(); bomb.body.destroy(); this.bombs.delete(key(bomb.position));
    const owner = this.players.get(bomb.ownerId); if (owner) releaseBomb(owner);
    const points=blastTiles(this.arena,bomb.position,bomb.range),masks=blastMasks(points);
    for (const [index,point] of points.entries()) {
      if (tileAt(this.arena, point) === 'crate') {
        this.arena[point.y][point.x] = 'floor'; this.tiles[point.y][point.x].setFrame(tileFrame('floor', point.x, point.y));
        if (Math.random() < 0.22) this.spawnPowerUp(point);
      }
      const chained = this.bombs.get(key(point)); if (chained) this.time.delayedCall(0, () => this.explode(chained));
      this.flames.add(key(point));
      this.renderFlame(point, FLAME_MS,masks[index]);
      this.time.delayedCall(FLAME_MS, () => this.flames.delete(key(point)));
      for (const player of this.players.values()) if (player.alive && key(player.position) === key(point)) this.killPlayer(player);
    }
    this.updateHud(); this.resolveResult();
  }

  private spawnPowerUp(point: Point): void {
    const kind = Math.random() < 0.5 ? 'bomb' : 'fire';
    this.createPowerUpView(point, kind);
  }
  private createPowerUpView(point: Point, kind: 'bomb' | 'fire'): void {
    const body = this.add.container(point.x * TILE + TILE / 2, point.y * TILE + TILE / 2).setDepth(2);
    body.add(this.add.image(0, 0, ART, `up-${kind}`).setDisplaySize(TILE, TILE));
    this.powerUps.set(key(point), { kind, body });
  }
  private collect(player: PlayerState, point: Point): void {
    const power = this.powerUps.get(key(point)); if (!power) return;
    if (power.kind === 'bomb') player.bombCapacity++; else player.fireRange++;
    this.reactPlayer(player.id);
    power.body.destroy(); this.powerUps.delete(key(point)); this.updateHud();
  }
  private killPlayer(player: PlayerState): void { player.alive = false; this.views.get(player.id)?.setAlpha(0.28); }
  private updateHud(): void {
    const local = [...this.players.values()].find(player => player.controller === 'local') ?? [...this.players.values()][0];
    this.options.onHud({ alive: [...this.players.values()].filter(player => player.alive).length, total: this.players.size, localName: local?.name ?? 'Player', bombs: local?.bombCapacity ?? 1, fire: local?.fireRange ?? 2, players:this.labelPlayers() });
  }
  private resolveResult(): void {
    if (this.options.online) return;
    const onResult = this.options.onResult;
    const result = evaluateMatch(this.players.values()); if (result.status === 'ongoing' || this.finished) return;
    this.finished = true;
    const winner = result.status === 'winner' ? this.players.get(result.winnerId) : undefined;
    const payload: RoundResult = { kind: result.status === 'winner' ? 'winner' : 'draw', winnerId: winner?.id, winnerName: winner?.name, statuses: [...this.players.values()].map(player => ({ id: player.id, name: player.name, alive: player.alive })) };
    this.time.delayedCall(FLAME_MS, () => onResult(payload));
  }
}
