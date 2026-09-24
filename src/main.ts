import Phaser from 'phaser';
import { addBot, createLocalRoom, MAX_PLAYERS_PER_ROOM, normalizeNickname, removeBot, type AppScreen, type RoomState, type RoundResult } from './app/state.ts';
import { getArenaSizeForPlayerCount, TILE, type Direction } from './game/config.ts';
import { GameScene, type MatchHud } from './game/GameScene.ts';
import { OnlineClient } from './network/client.ts';
import { OnlineSession } from './network/session.ts';
import type { InitialMatchState, MatchState, PublicRoomState, ServerError } from './network/types.ts';
import './style.css';

const PROFILE_KEY = 'bomb-it.nickname';

class BombItApp {
  private screen: AppScreen = 'profile';
  private nickname = this.loadNickname();
  private room: RoomState | null = null;
  private game: Phaser.Game | null = null;
  private scene: GameScene | null = null;
  private activePointer: number | null = null;
  private readonly online = new OnlineSession();
  private onlineClient: OnlineClient | null = null;

  constructor() {
    this.bindUi();
    this.show(this.nickname ? 'home' : 'profile');
  }

  private bindUi(): void {
    this.byId<HTMLFormElement>('profile-form').addEventListener('submit', event => {
      event.preventDefault();
      const value = normalizeNickname(this.byId<HTMLInputElement>('nickname').value);
      if (!value) { this.byId('profile-error').textContent = 'Enter at least one visible character.'; return; }
      this.nickname = value; this.saveNickname(value); this.byId('profile-error').textContent = ''; this.show('home');
    });
    this.byId('edit-profile').addEventListener('click', () => this.show('profile'));
    this.byId('create-room').addEventListener('click', () => { this.room = createLocalRoom(this.nickname); this.show('lobby'); });
    this.byId('quick-play').addEventListener('click', () => { this.room = addBot(createLocalRoom(this.nickname)); this.startMatch(); });
    this.byId('online-home').addEventListener('click', () => this.show('online'));
    this.byId('online-home-back').addEventListener('click', () => this.show('home'));
    this.byId('online-create').addEventListener('click', () => void this.enterOnline('create'));
    this.byId('online-join').addEventListener('click', () => void this.enterOnline('join'));
    this.byId('online-ready').addEventListener('click', () => void this.toggleOnlineReady());
    this.byId('online-start').addEventListener('click', () => void this.startOnline());
    this.byId('online-leave').addEventListener('click', () => void this.leaveOnline());
    this.byId('match-leave').addEventListener('click', () => void this.leaveOnline());
    this.byId('lobby-home').addEventListener('click', () => this.show('home'));
    this.byId('add-bot').addEventListener('click', () => { if (this.room) { this.room = addBot(this.room); this.renderLobby(); } });
    this.byId('start-match').addEventListener('click', () => this.startMatch());
    this.byId('slots').addEventListener('click', event => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-remove-bot]');
      if (button && this.room) { this.room = removeBot(this.room, button.dataset.removeBot!); this.renderLobby(); }
    });
    this.byId('play-again').addEventListener('click', () => this.startMatch());
    this.byId('back-lobby').addEventListener('click', () => this.show('lobby'));

    for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
      const direction = button.dataset.direction as Direction;
      button.addEventListener('pointerdown', event => { event.preventDefault(); this.activePointer = event.pointerId; this.scene?.setTouchDirection(direction); button.classList.add('pressed'); });
      button.addEventListener('pointerenter', event => { if (this.activePointer === event.pointerId) { this.clearPressedDirections(); this.scene?.setTouchDirection(direction); button.classList.add('pressed'); } });
    }
    const releaseDirection = () => { this.activePointer = null; this.scene?.setTouchDirection(null); this.clearPressedDirections(); };
    window.addEventListener('pointerup', releaseDirection); window.addEventListener('pointercancel', releaseDirection);
    this.byId('bomb-button').addEventListener('pointerdown', event => {
      event.preventDefault(); if (this.online.match) return; this.scene?.queueLocalBomb(); this.vibrate(20);
    });
  }

  private show(screen: AppScreen): void {
    this.screen = screen; document.body.dataset.screen = screen;
    for (const view of document.querySelectorAll<HTMLElement>('[data-view]')) view.hidden = view.dataset.view !== screen;
    if (screen === 'profile') { const input = this.byId<HTMLInputElement>('nickname'); input.value = this.nickname; queueMicrotask(() => input.focus()); }
    if (screen === 'home') { this.byId('home-nickname').textContent = this.nickname; this.byId('home-notice').textContent = ''; }
    if (screen === 'lobby') this.renderLobby();
    if (screen === 'online-lobby') this.renderOnlineLobby();
  }

  private renderLobby(): void {
    if (!this.room) return;
    this.byId('room-code').textContent = this.room.code;
    const slots = this.byId<HTMLOListElement>('slots'); slots.replaceChildren();
    for (let index = 0; index < MAX_PLAYERS_PER_ROOM; index++) {
      const participant = this.room.participants[index];
      const item = document.createElement('li'); item.className = `slot ${participant ? 'occupied' : 'empty'}`;
      if (!participant) item.innerHTML = `<span class="slot-number">${index + 1}</span><span>Empty slot</span>`;
      else {
        const number = document.createElement('span'); number.className = 'slot-number'; number.textContent = String(index + 1);
        const identity = document.createElement('span'); identity.className = 'slot-identity'; identity.textContent = participant.name;
        const role = document.createElement('span'); role.className = 'slot-role'; role.textContent = participant.host ? 'HOST · READY' : 'BOT · READY';
        item.append(number, identity, role);
        if (participant.controller === 'bot') { const remove = document.createElement('button'); remove.className = 'remove-bot'; remove.dataset.removeBot = participant.id; remove.ariaLabel = `Remove ${participant.name}`; remove.textContent = '×'; item.append(remove); }
      }
      slots.append(item);
    }
    this.byId<HTMLButtonElement>('add-bot').disabled = this.room.participants.length >= MAX_PLAYERS_PER_ROOM;
    this.byId('start-match').textContent = `Start Match · ${this.room.participants.length} Player${this.room.participants.length === 1 ? '' : 's'}`;
  }

  private startMatch(): void {
    if (!this.room) this.room = createLocalRoom(this.nickname);
    this.destroyGame(); this.show('playing');
    document.body.dataset.mode = 'local';
    this.byId('match-leave').hidden = true;
    this.byId('match-powerups').hidden = false;
    this.byId('match-notice').hidden = true;
    this.byId('bomb-button').removeAttribute('disabled');
    this.byId('match-hint').innerHTML = '<span>WASD / arrows</span> move <i>•</i> <span>Space</span> bomb';
    this.byId('match-room').textContent = this.room.code;
    const arenaSize = getArenaSizeForPlayerCount(this.room.participants.length);
    const gameElement = this.byId('game');
    const arenaFrame = gameElement.closest<HTMLElement>('.arena-frame');
    if (!arenaFrame) throw new Error('Missing arena frame');
    arenaFrame.style.setProperty('--arena-aspect', `${arenaSize.cols} / ${arenaSize.rows}`);
    arenaFrame.style.setProperty('--arena-ratio', String(arenaSize.cols / arenaSize.rows));
    this.scene = new GameScene({ participants: this.room.participants, arenaSize, onHud: hud => this.renderHud(hud), onResult: result => this.showResult(result) });
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent: gameElement, backgroundColor: '#223b52', width: arenaSize.cols * TILE, height: arenaSize.rows * TILE, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: this.scene });
  }

  private serverUrl(): string | null {
    const configured = import.meta.env.VITE_SERVER_URL?.trim();
    if (configured) return configured;
    return ['localhost', '127.0.0.1'].includes(location.hostname) ? 'http://localhost:8080' : null;
  }

  private client(): OnlineClient | null {
    if (this.onlineClient) return this.onlineClient;
    const url = this.serverUrl();
    if (!url) { this.byId('online-notice').textContent = 'Online is unavailable here until a server URL is configured.'; return null; }
    this.onlineClient = new OnlineClient(url, {
      room: state => { if (this.online.selfPlayerId && state.code === this.online.room?.code) { this.online.room = state; if (this.screen === 'online-lobby') this.renderOnlineLobby(); } },
      left: code => { if (this.online.room?.code === code) this.finishOnlineLeave(); },
      error: error => this.showOnlineError(error),
      started: state => this.onOnlineStarted(state),
      match: state => this.onOnlineMatch(state),
      disconnect: () => this.onOnlineDisconnect()
    });
    return this.onlineClient;
  }

  private async enterOnline(action: 'create' | 'join'): Promise<void> {
    const client = this.client(); if (!client) return;
    this.byId('online-notice').textContent = 'Connecting…';
    try {
      await client.connect();
      const code = this.byId<HTMLInputElement>('online-code').value.trim().toUpperCase();
      const result = action === 'create' ? await client.create(this.nickname) : await client.join(code, this.nickname);
      if (!result.ok) { this.showOnlineError(result.error); return; }
      this.online.join(result.state, result.selfPlayerId);
      this.byId('online-notice').textContent = '';
      this.show('online-lobby');
    } catch { this.byId('online-notice').textContent = 'Server unavailable. Check the local server and try again.'; }
  }

  private renderOnlineLobby(): void {
    const room = this.online.room; if (!room) return;
    this.byId('online-room-code').textContent = room.code;
    this.byId('online-room-status').textContent = `Status: ${room.status.toUpperCase()} · ${room.players.length} player${room.players.length === 1 ? '' : 's'}`;
    const slots = this.byId('online-slots'); slots.replaceChildren();
    for (const [index, player] of room.players.entries()) {
      const item = document.createElement('li'); item.className = 'slot';
      const number = document.createElement('span'); number.className = 'slot-number'; number.textContent = String(index + 1);
      const name = document.createElement('span'); name.className = 'slot-identity'; name.textContent = player.nickname;
      const role = document.createElement('span'); role.className = 'slot-role';
      role.textContent = `${player.host ? 'HOST · ' : ''}${player.ready ? 'READY' : 'NOT READY'}${player.id === this.online.selfPlayerId ? ' · YOU' : ''}`;
      item.append(number, name, role); slots.append(item);
    }
    const self = room.players.find(player => player.id === this.online.selfPlayerId);
    this.byId('online-ready').textContent = self?.ready ? 'Unready' : 'Ready';
    this.byId<HTMLButtonElement>('online-ready').disabled = room.status !== 'lobby' || !self;
    this.byId<HTMLButtonElement>('online-start').disabled = !this.online.canStart();
    this.byId('online-start').hidden = room.hostPlayerId !== this.online.selfPlayerId;
  }

  private async toggleOnlineReady(): Promise<void> {
    const self = this.online.room?.players.find(player => player.id === this.online.selfPlayerId);
    if (!self || !this.onlineClient) return;
    try {
      const result = await this.onlineClient.ready(!self.ready);
      if (!result.ok) this.showOnlineError(result.error);
      else { this.online.room = result.state; this.renderOnlineLobby(); }
    } catch { this.showOnlineError({ code: 'CONNECTION_ERROR', message: '' }); }
  }

  private async startOnline(): Promise<void> {
    if (!this.online.canStart() || !this.onlineClient) return;
    try {
      const result = await this.onlineClient.start();
      if (!result.ok) this.showOnlineError(result.error);
      else this.onOnlineStarted(result.state);
    } catch { this.showOnlineError({ code: 'CONNECTION_ERROR', message: '' }); }
  }

  private onOnlineStarted(state: InitialMatchState): void {
    if (!this.online.selfPlayerId || this.online.room?.code !== state.roomCode || this.online.match) return;
    this.online.start(state);
    this.destroyGame(); this.show('playing');
    document.body.dataset.mode = 'online';
    this.byId('match-room').textContent = state.roomCode;
    this.byId('match-leave').hidden = false;
    this.byId('match-powerups').hidden = true;
    this.byId('match-notice').hidden = true;
    this.byId<HTMLButtonElement>('bomb-button').disabled = true;
    this.byId('match-hint').textContent = 'WASD / arrows move · Bombs are not online yet';
    const arenaSize = { cols: state.arena.cols, rows: state.arena.rows };
    const gameElement = this.byId('game');
    const arenaFrame = gameElement.closest<HTMLElement>('.arena-frame');
    if (!arenaFrame) throw new Error('Missing arena frame');
    arenaFrame.style.setProperty('--arena-aspect', `${arenaSize.cols} / ${arenaSize.rows}`);
    arenaFrame.style.setProperty('--arena-ratio', String(arenaSize.cols / arenaSize.rows));
    this.scene = new GameScene({ arenaSize, onHud: hud => this.renderHud(hud), online: {
      initial: state, selfPlayerId: this.online.selfPlayerId,
      sendDirection: direction => this.online.sendDirection(direction, payload => this.onlineClient?.sendDirection(payload.direction))
    } });
    this.game = new Phaser.Game({ type: Phaser.AUTO, parent: gameElement, backgroundColor: '#223b52', width: arenaSize.cols * TILE, height: arenaSize.rows * TILE, scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }, scene: this.scene });
  }

  private onOnlineMatch(state: MatchState): void {
    if (this.online.apply(state)) this.scene?.applyOnlineState(state);
  }

  private onOnlineDisconnect(): void {
    if (!this.online.connected) return;
    this.online.disconnect();
    if (this.screen === 'playing' && this.online.match) {
      const notice = this.byId('match-notice'); notice.textContent = 'Connection lost. Leave the match and try again.'; notice.hidden = false;
      this.scene?.setTouchDirection(null);
    } else if (this.screen === 'online-lobby') this.byId('online-lobby-notice').textContent = 'Connection lost. Leave and try again.';
  }

  private async leaveOnline(): Promise<void> {
    try { if (this.online.connected) await this.onlineClient?.leave(); } catch { /* Close the local session regardless. */ }
    this.finishOnlineLeave();
  }

  private finishOnlineLeave(): void {
    this.online.disconnect(); this.onlineClient?.close(); this.onlineClient = null; this.online.clear();
    this.destroyGame(); this.show('home');
  }

  private showOnlineError(error: ServerError): void {
    const message: Record<string, string> = {
      ROOM_NOT_FOUND: 'Room not found.', ROOM_FULL: 'Room is full.', ROOM_LIMIT_REACHED: 'The server has reached its room limit.',
      RATE_LIMITED: 'Please wait a moment and try again.', NOT_HOST: 'Only the host can start.',
      PLAYERS_NOT_READY: 'Everyone must be ready before starting.', NOT_ENOUGH_PLAYERS: 'At least two players are needed.',
      CONNECTION_ERROR: 'Server unavailable. Check the local server and try again.'
    };
    const target = this.screen === 'online-lobby' ? 'online-lobby-notice' : this.screen === 'playing' ? 'match-notice' : 'online-notice';
    this.byId(target).textContent = message[error.code] ?? 'The room action could not be completed.';
    if (target === 'match-notice') this.byId(target).hidden = false;
  }

  private renderHud(hud: MatchHud): void {
    this.byId('match-player').textContent = hud.localName;
    this.byId('alive-count').textContent = `${hud.alive} / ${hud.total}`;
    this.byId('bomb-count').textContent = String(hud.bombs); this.byId('fire-count').textContent = String(hud.fire);
  }

  private showResult(result: RoundResult): void {
    const title = result.kind === 'draw' ? 'DRAW' : result.winnerId === 'local' ? 'VICTORY' : `${result.winnerName} WINS`;
    this.byId('result-title').textContent = title;
    this.byId('result-summary').textContent = result.kind === 'draw' ? 'Every remaining player was eliminated together.' : `${result.winnerName} is the last player standing.`;
    const statuses = this.byId('result-statuses'); statuses.replaceChildren(...result.statuses.map(status => {
      const item = document.createElement('li'); item.textContent = `${status.alive ? '●' : '○'} ${status.name} — ${status.alive ? 'SURVIVED' : 'OUT'}`; return item;
    }));
    this.show('results');
  }

  private destroyGame(): void { if (this.game) this.game.destroy(true); this.game = null; this.scene = null; this.byId('game').replaceChildren(); }
  private clearPressedDirections(): void { document.querySelectorAll('[data-direction].pressed').forEach(button => button.classList.remove('pressed')); }
  private vibrate(duration: number): void { if ('vibrate' in navigator) navigator.vibrate(duration); }
  private saveNickname(value: string): void { try { localStorage.setItem(PROFILE_KEY, value); } catch { /* Profile still works when storage is unavailable. */ } }
  private loadNickname(): string { try { return normalizeNickname(localStorage.getItem(PROFILE_KEY) ?? ''); } catch { return ''; } }
  private byId<T extends HTMLElement = HTMLElement>(id: string): T { const element = document.getElementById(id); if (!element) throw new Error(`Missing #${id}`); return element as T; }
}

new BombItApp();
