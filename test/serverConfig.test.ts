import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { resolveServerUrl } from '../src/network/config.ts';

test('production config points at the public Cloud Run server while local development keeps port 8080', () => {
  const config = readFileSync(new URL('../.env.production', import.meta.url), 'utf8');
  const url = config.match(/^VITE_SERVER_URL=(.+)$/m)?.[1];
  assert.equal(url, 'https://bomb-it-server-873648916633.us-east1.run.app');
  assert.equal(resolveServerUrl(url, 'wzzzodiac.github.io'), url);
  assert.equal(resolveServerUrl(undefined, 'localhost'), 'http://localhost:8080');
  assert.equal(resolveServerUrl(undefined, '127.0.0.1'), 'http://localhost:8080');
  assert.equal(resolveServerUrl(undefined, 'example.com'), null);
});
