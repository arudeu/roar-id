import test from "node:test";
import assert from "node:assert/strict";
import { buildPairs, mapScroll } from "../lib/scroll-sync.js";

test("without anchors the panes map proportionally", () => {
  const pairs = buildPairs([], 1000, 500);
  assert.equal(mapScroll(pairs, 0), 0);
  assert.equal(mapScroll(pairs, 500), 250);
  assert.equal(mapScroll(pairs, 1000), 500);
});

test("anchors line the same difference up in both panes", () => {
  // the right pane has 300px of extra text before the difference
  const pairs = buildPairs([{ a: 400, b: 700 }], 1000, 1300);
  assert.equal(mapScroll(pairs, 400), 700);
  assert.equal(mapScroll(pairs, 200), 350); // halfway to the anchor
  assert.equal(mapScroll(pairs, 700), 1000); // halfway between anchor and end
  assert.equal(mapScroll(pairs, 1000), 1300);
});

test("the mapping works in both directions", () => {
  const pairs = buildPairs([{ a: 400, b: 700 }, { a: 800, b: 900 }], 1000, 1300);
  for (const x of [0, 120, 400, 650, 800, 1000]) {
    const there = mapScroll(pairs, x, true);
    assert.ok(Math.abs(mapScroll(pairs, there, false) - x) < 1e-9, `round trip ${x}`);
  }
});

test("out-of-order and out-of-range anchors are ignored or clamped", () => {
  const pairs = buildPairs([{ a: 600, b: 600 }, { a: 300, b: 900 }, { a: 5000, b: 5000 }], 1000, 1000);
  for (let i = 1; i < pairs.length; i++) {
    assert.ok(pairs[i][0] >= pairs[i - 1][0] && pairs[i][1] >= pairs[i - 1][1]);
  }
  assert.equal(mapScroll(pairs, 600), 600);
  assert.equal(mapScroll(pairs, 1000), 1000);
});

test("a pane that cannot scroll maps to the top", () => {
  const pairs = buildPairs([], 0, 0);
  assert.equal(mapScroll(pairs, 0), 0);
  assert.equal(mapScroll([], 42), 42);
});
