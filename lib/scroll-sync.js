// Keeps two scrollable panes lined up. Pure functions, no DOM, so they can be unit-tested.
//
// "Pairs" are matching scroll positions, [[a0, b0], [a1, b1], ...] sorted in both
// columns: when pane A is scrolled to a_i, pane B should be at b_i. Positions in
// between are interpolated, so a long block that only one side has stretches
// that side's scroll instead of pushing the rest of the text out of alignment.

const clamp = (v, max) => Math.max(0, Math.min(v, Math.max(0, max)));

/**
 * @param anchors  [{ a, b }] scroll offsets at which the same difference sits at the top of each pane
 * @param maxA     largest scrollTop of pane A (scrollHeight - clientHeight)
 * @param maxB     largest scrollTop of pane B
 */
export function buildPairs(anchors, maxA, maxB) {
  const pairs = [[0, 0]];
  for (const { a, b } of anchors) {
    const pa = clamp(a, maxA);
    const pb = clamp(b, maxB);
    const last = pairs[pairs.length - 1];
    if (pa < last[0] || pb < last[1]) continue; // keep both columns non-decreasing
    pairs.push([pa, pb]);
  }
  const last = pairs[pairs.length - 1];
  if (maxA >= last[0] && maxB >= last[1]) pairs.push([Math.max(0, maxA), Math.max(0, maxB)]);
  return pairs;
}

/** Where pane B should be when pane A is at x (or the reverse with fromA = false). */
export function mapScroll(pairs, x, fromA = true) {
  const s = fromA ? 0 : 1;
  const d = fromA ? 1 : 0;
  if (!pairs.length) return x;
  const first = pairs[0];
  const last = pairs[pairs.length - 1];
  if (x <= first[s]) return first[d] + (x - first[s]);
  if (x >= last[s]) return last[d] + (x - last[s]);

  let lo = 0;
  let hi = pairs.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (pairs[mid][s] <= x) lo = mid;
    else hi = mid;
  }
  const p = pairs[lo];
  const q = pairs[hi];
  const span = q[s] - p[s];
  if (span <= 0) return p[d];
  return p[d] + ((x - p[s]) / span) * (q[d] - p[d]);
}
