import { cpSync, copyFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const built = join(root, 'dist');
if (!existsSync(join(built, 'app', 'index.html')) || !existsSync(join(built, 'assets'))) {
  throw new Error('Build dist/ before syncing GitHub Pages files.');
}
// The existing Pages source is main/(root); publish the compiled entry/assets there.
rmSync(join(root, 'assets'), { recursive: true, force: true });
mkdirSync(join(root, 'assets'), { recursive: true });
copyFileSync(join(built, 'app', 'index.html'), join(root, 'index.html'));
cpSync(join(built, 'assets'), join(root, 'assets'), { recursive: true, force: true });
