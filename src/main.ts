import Phaser from 'phaser';
import { addBot, createLocalRoom, MAX_PLAYERS_PER_ROOM, normalizeNickname, removeBot, type AppScreen, type RoomState, type RoundResult } from './app/state.ts';
import { getArenaSizeForPlayerCount, TILE, type Direction } from './game/config.ts';
import { GameScene, type MatchHud } from './game/GameScene.ts';
import './style.css';

const PROFILE_KEY = 'bomb-it.nickname';

class BombItApp {
  private screen: AppScreen = 'profile';
  private nickname = this.loadNickname();
  private room: RoomState | null = null;
  private game: Phaser.Game | null = null;
  private scene: GameScene | null = null;
  private activePointer: number | null = null;

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
    this.byId('join-room').addEventListener('click', () => { this.byId('home-notice').textContent = 'Online room joining arrives with the networking phase. No fake connection was created.'; });
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
      event.preventDefault(); this.scene?.queueLocalBomb(); this.vibrate(20);
    });
  }

  private show(screen: AppScreen): void {
    this.screen = screen; document.body.dataset.screen = screen;
    for (const view of document.querySelectorAll<HTMLElement>('[data-view]')) view.hidden = view.dataset.view !== screen;
    if (screen === 'profile') { const input = this.byId<HTMLInputElement>('nickname'); input.value = this.nickname; queueMicrotask(() => input.focus()); }
    if (screen === 'home') { this.byId('home-nickname').textContent = this.nickname; this.byId('home-notice').textContent = ''; }
    if (screen === 'lobby') this.renderLobby();
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
