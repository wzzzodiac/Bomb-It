import Phaser from 'phaser';
import { GameScene } from './game/GameScene.ts';
import { COLS, ROWS, TILE, type Direction } from './game/config.ts';
import './style.css';

const game = new Phaser.Game({
  type: Phaser.AUTO, parent: 'game', backgroundColor: '#293c54',
  width: COLS * TILE, height: ROWS * TILE,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: GameScene
});
const scene = (): GameScene => game.scene.getScene('Game') as GameScene;

for (const button of document.querySelectorAll<HTMLButtonElement>('[data-direction]')) {
  const direction = button.dataset.direction as Direction;
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.setPointerCapture(event.pointerId); scene().setTouchDirection(direction); });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture'])
    button.addEventListener(name, () => scene().setTouchDirection(null));
}
document.getElementById('bomb-button')!.addEventListener('pointerdown', event => { event.preventDefault(); scene().placePlayerBomb(); });
document.getElementById('restart')!.addEventListener('click', () => scene().scene.restart());
