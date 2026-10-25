import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const semver = require('../webapp/node_modules/semver');
const manifest = JSON.parse(readFileSync(new URL('../plugin.json', import.meta.url), 'utf8'));
// Mattermost 11.7.14 persists bundled Boards 9.2.8 even with automatic installs disabled.
const bundledVersion = '9.2.8';

test('fork version survives the transitionally prepackaged plugin comparison', () => {
  assert.ok(semver.gte(manifest.version, bundledVersion), 'Fork version must not be older than bundled Boards');
  const version = new semver.SemVer(manifest.version);
  assert.equal(version.prerelease.length, 0, 'Use build metadata instead of a lower prerelease version');
  assert.match(version.build.join('.'), /^sakura\.\d+$/);
});

for (const file of ['../server/manifest.go', '../webapp/src/manifest.ts']) {
  test(`generated manifest version agrees: ${file}`, () => {
    const body = readFileSync(new URL(file, import.meta.url), 'utf8');
    const version = body.match(/"version"\s*:\s*"([^"]+)"/);
    assert.ok(version);
    assert.equal(version[1], manifest.version);
  });
}
