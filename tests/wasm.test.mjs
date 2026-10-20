import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { heightAt, WORLD_WIDTH } from '../src/world.js';

test('the shipped Rust kernel and compatibility terrain agree at every tile', async () => {
  const bytes = await readFile(new URL('../assets/terrain.wasm', import.meta.url));
  const { instance } = await WebAssembly.instantiate(bytes);
  for (let x = 0; x < WORLD_WIDTH; x++) {
    assert.equal(instance.exports.terrain_height(x), heightAt(x), `tile ${x}`);
  }
});
