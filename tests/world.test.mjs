import { test } from "node:test";
import assert from "node:assert/strict";
import {
  heightAt,
  WORLD_WIDTH,
  places,
  starPositions,
  readSave,
} from "../src/world.js";
test("terrain remains within view and every height step is jumpable", () => {
  for (let x = 0; x < WORLD_WIDTH; x++) {
    assert.ok(heightAt(x) >= 24 && heightAt(x) <= 38);
    if (x) assert.ok(Math.abs(heightAt(x) - heightAt(x - 1)) <= 1);
  }
});
test("all twelve stars and five landmarks lie within the playable coast", () => {
  assert.equal(new Set(starPositions).size, 12);
  for (const x of [...starPositions, ...places.map((p) => p.x)])
    assert.ok(x > 0 && x < WORLD_WIDTH);
});
test("corrupt and hostile save values cannot unlock progress", () => {
  for (const value of [
    "not json",
    "null",
    "{}",
    '{"stars":[-1,42,"1",2,2],"visited":[9,"2",1]}',
  ]) {
    const s = readSave({ getItem: () => value });
    assert.ok(s.visited.has(0));
    assert.ok(s.stars.size <= 1);
    assert.equal(s.lit, false);
  }
});
test("completed progress survives a reload", () => {
  const s = readSave({
    getItem: () =>
      JSON.stringify({
        stars: Array.from({ length: 12 }, (_, i) => i),
        visited: [0, 1, 2, 3, 4],
        lit: true,
      }),
  });
  assert.equal(s.stars.size, 12);
  assert.equal(s.visited.size, 5);
  assert.equal(s.lit, true);
});
