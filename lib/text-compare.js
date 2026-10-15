// Character-level comparison between the text fetched from Sitecore (left) and
// text pasted by the user (right). Pure functions, no React.
//
// Rules:
//  - Bullets and numbering (•, -, 1., 2), a) ...) are ignored on both sides.
//  - Any whitespace character counts as equal to any other (a line break and a
//    space are the same), but *how many* spaces there are still matters.
//  - Blank lines and spaces around a line break are ignored (one break = one break).
//  - Differences are grouped into issues: character changes, missing/added
//    words, and removed/added spaces.

/** Collapse every run of whitespace to a single space and trim the ends. */
export const collapseWhitespace = (text) => (text || "").replace(/\s+/g, " ").trim();

/**
 * Clean up pasted text: collapse runs of spaces/tabs to one space, drop spaces hanging
 * off line ends, and squash blank lines so every line break is a single "\n".
 * Leading/trailing whitespace is trimmed.
 */
export const tidyPaste = (text) =>
  (text || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();

// Glyph bullets can sit right against the text; text-like markers (-, *, 1.) only
// count when they are a standalone token.
const MARKER_RE = /[•●○◦▪▫■□‣⁃∙·]\s*|(?<!\S)(?:[*\-–—]|\(?\d{1,3}[.)]|[A-Za-z]\))(?:\s+|$)/gu;

/** Remove bullet/numbering markers, remembering where each kept char came from. */
export function stripMarkers(text) {
  const source = text || "";
  const keep = new Uint8Array(source.length).fill(1);
  for (const m of source.matchAll(MARKER_RE)) {
    for (let i = m.index; i < m.index + m[0].length; i++) keep[i] = 0;
  }
  // A run of whitespace that contains a line break counts as just that one break:
  // blank lines and spaces around line ends are layout, not content.
  for (const m of source.matchAll(/\s+/g)) {
    const firstBreak = m[0].indexOf("\n");
    if (firstBreak === -1) continue;
    for (let i = 0; i < m[0].length; i++) if (i !== firstBreak) keep[m.index + i] = 0;
  }
  let out = "";
  const map = [];
  for (let i = 0; i < source.length; i++) {
    if (keep[i]) {
      out += source[i];
      map.push(i);
    }
  }
  return { text: out, map };
}

/* ------------------------------ Myers diff ------------------------------- */

/**
 * Myers O(ND) diff of two strings. Returns an array of "e" (equal), "d" (only in a)
 * and "i" (only in b), or null when the strings differ by more than maxD edits.
 */
function myers(a, b, maxD) {
  const n = a.length;
  const m = b.length;
  const max = Math.min(n + m, maxD);
  const off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace = [];

  for (let d = 0; d <= max; d++) {
    trace.push(v.slice(off - d, off + d + 1)); // state before this round, k in [-d, d]
    for (let k = -d; k <= d; k += 2) {
      let x;
      if (k === -d || (k !== d && v[off + k - 1] < v[off + k + 1])) x = v[off + k + 1];
      else x = v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a.charCodeAt(x) === b.charCodeAt(y)) {
        x++;
        y++;
      }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, n, m, d);
    }
  }
  return null;
}

function backtrack(trace, n, m, found) {
  const ops = [];
  let x = n;
  let y = m;
  for (let d = found; d > 0; d--) {
    const arr = trace[d];
    const get = (k) => arr[k + d];
    const k = x - y;
    const prevK = k === -d || (k !== d && get(k - 1) < get(k + 1)) ? k + 1 : k - 1;
    const prevX = get(prevK);
    const prevY = prevX - prevK;
    while (x > prevX && y > prevY) {
      ops.push("e");
      x--;
      y--;
    }
    ops.push(x === prevX ? "i" : "d");
    x = prevX;
    y = prevY;
  }
  while (x > 0 && y > 0) {
    ops.push("e");
    x--;
    y--;
  }
  return ops.reverse();
}

const MAX_EDITS = 2000;

/** Diff two strings into an "e"/"d"/"i" op list. Exported for tests. */
export function diffOps(a, b) {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }
  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  let mid = midA || midB ? myers(midA, midB, MAX_EDITS) : [];
  if (!mid) {
    // Too different to align cheaply: treat the whole middle as replaced.
    mid = [...Array(midA.length).fill("d"), ...Array(midB.length).fill("i")];
  }
  return [
    ...Array(start).fill("e"),
    ...mid,
    ...Array(a.length - endA).fill("e"),
  ];
}

/* ------------------------------- issues --------------------------------- */

const isWordChar = (c) => !!c && /[\p{L}\p{N}]/u.test(c);
const isSpaceOnly = (s) => s.length > 0 && /^\s+$/.test(s);

/** True when s[from..to) starts and ends on word boundaries and contains a word. */
function coversWholeWords(s, from, to) {
  const t = s.slice(from, to);
  if (!/[\p{L}\p{N}]/u.test(t)) return false;
  const before = from > 0 ? s[from - 1] : "";
  const after = to < s.length ? s[to] : "";
  const okLeft = !isWordChar(before) || !isWordChar(t[0]);
  const okRight = !isWordChar(after) || !isWordChar(t[t.length - 1]);
  return okLeft && okRight;
}

const quote = (s) => `“${s}”`;
const words = (s) => s.trim().split(/\s+/).filter(Boolean).length;

function describe(h, a, b) {
  const delT = a.slice(h.aS, h.aE);
  const insT = b.slice(h.bS, h.bE);

  if (!delT) {
    if (isSpaceOnly(insT)) return { type: "space", severity: "warning", message: `Added space${insT.length > 1 ? "s" : ""}` };
    const t = insT.trim();
    if (coversWholeWords(b, h.bS, h.bE))
      return { type: "word", severity: "error", message: `Added ${words(t) > 1 ? "words" : "word"}: ${quote(t)}` };
    return { type: "char", severity: "error", message: `Added ${t.length > 1 ? "characters" : "character"}: ${quote(insT)}` };
  }
  if (!insT) {
    if (isSpaceOnly(delT)) return { type: "space", severity: "warning", message: `Removed space${delT.length > 1 ? "s" : ""}` };
    const t = delT.trim();
    if (coversWholeWords(a, h.aS, h.aE))
      return { type: "word", severity: "error", message: `Missing ${words(t) > 1 ? "words" : "word"}: ${quote(t)}` };
    return { type: "char", severity: "error", message: `Missing ${t.length > 1 ? "characters" : "character"}: ${quote(delT)}` };
  }
  if (isSpaceOnly(delT) && isSpaceOnly(insT)) {
    return { type: "space", severity: "warning", message: `Spacing changed (${delT.length} → ${insT.length})` };
  }
  if (coversWholeWords(a, h.aS, h.aE) && coversWholeWords(b, h.bS, h.bE)) {
    return { type: "word", severity: "error", message: `Word changed: ${quote(delT.trim())} → ${quote(insT.trim())}` };
  }
  return { type: "char", severity: "error", message: `Character change: ${quote(delT)} → ${quote(insT)}` };
}

/* ------------------------------- compare -------------------------------- */

function side(stripped, marks, hunkOf, gaps) {
  return { text: stripped.text, map: stripped.map, marks, hunkOf, gaps };
}

/**
 * One merged, inline view of both texts: unchanged runs and changes in reading order.
 *   { kind: "equal", text }
 *   { kind: "change", id, type, severity, del, ins }   // del = only in fetched, ins = only in pasted
 * A change that starts or ends inside a word is widened to the whole word, so
 * "recieve" -> "receive" reads as one swap instead of two stray letters.
 */
function buildSegments(a, b, hunks, issues) {
  const segments = [];
  const pushEqual = (text) => {
    if (text) segments.push({ kind: "equal", text });
  };
  const wordStart = (t) => /[\p{L}\p{N}]+$/u.exec(t)?.[0] ?? "";
  const wordEnd = (t) => /^[\p{L}\p{N}]+/u.exec(t)?.[0] ?? "";

  let pos = 0; // how much of `a` has been emitted
  hunks.forEach((h, idx) => {
    let eq = a.slice(pos, h.aS);
    let del = a.slice(h.aS, h.aE);
    let ins = b.slice(h.bS, h.bE);

    // widen to the start of the word
    const head = wordStart(eq);
    if (head && (isWordChar(del[0]) || isWordChar(ins[0]))) {
      eq = eq.slice(0, eq.length - head.length);
      del = head + del;
      ins = head + ins;
    }
    pushEqual(eq);

    // widen to the end of the word (never into the next change)
    const limit = idx + 1 < hunks.length ? hunks[idx + 1].aS : a.length;
    let consumed = h.aE;
    const tail = wordEnd(a.slice(h.aE, limit));
    if (tail && (isWordChar(del[del.length - 1]) || isWordChar(ins[ins.length - 1]))) {
      del += tail;
      ins += tail;
      consumed += tail.length;
    }

    const { type, severity } = issues[idx];
    segments.push({ kind: "change", id: idx, type, severity, del, ins });
    pos = consumed;
  });
  pushEqual(a.slice(pos));
  return segments;
}

/**
 * Compare fetched (left) against pasted (right).
 * Returns { identical, issues, left, right } where each side carries:
 *   text/map – the text with markers removed and where each char came from
 *   marks    – 1 for every char that differs
 *   hunkOf   – issue index for each char (or -1)
 *   gaps     – Map(char index -> issue index): the other side has extra text here
 */
export function compareTexts(fetched, pasted) {
  const L = stripMarkers(fetched);
  const R = stripMarkers(pasted);
  const a = L.text;
  const b = R.text;

  // Whitespace characters are interchangeable for matching purposes.
  const ops = diffOps(a.replace(/\s/g, " "), b.replace(/\s/g, " "));

  const leftMarks = new Uint8Array(a.length);
  const rightMarks = new Uint8Array(b.length);
  const raw = [];
  let ai = 0;
  let bi = 0;
  let open = null;
  for (const op of ops) {
    if (op === "e") {
      if (open) {
        open.aE = ai;
        open.bE = bi;
        raw.push(open);
        open = null;
      }
      ai++;
      bi++;
      continue;
    }
    if (!open) open = { aS: ai, bS: bi };
    if (op === "d") leftMarks[ai++] = 1;
    else rightMarks[bi++] = 1;
  }
  if (open) {
    open.aE = ai;
    open.bE = bi;
    raw.push(open);
  }

  // Merge neighbours that are only separated by a couple of matching letters, so
  // "receive" vs "recieve" is one issue rather than two.
  const hunks = [];
  for (const h of raw) {
    const prev = hunks[hunks.length - 1];
    const between = prev ? a.slice(prev.aE, h.aS) : "";
    if (prev && between.length <= 2 && !/\s/.test(between)) {
      prev.aE = h.aE;
      prev.bE = h.bE;
    } else hunks.push({ ...h });
  }

  const leftHunk = new Int32Array(a.length).fill(-1);
  const rightHunk = new Int32Array(b.length).fill(-1);
  const leftGaps = new Map();
  const rightGaps = new Map();
  const issues = hunks.map((h, id) => {
    for (let k = h.aS; k < h.aE; k++) leftHunk[k] = id;
    for (let k = h.bS; k < h.bE; k++) rightHunk[k] = id;
    if (h.aS === h.aE) leftGaps.set(h.aS, id);
    if (h.bS === h.bE) rightGaps.set(h.bS, id);
    const info = describe(h, a, b);
    return {
      id,
      ...info,
      before: a.slice(Math.max(0, h.aS - 20), h.aS),
      after: a.slice(h.aE, h.aE + 20),
      position: (L.map[h.aS] ?? fetched.length) + 1,
    };
  });

  return {
    identical: issues.length === 0,
    issues,
    segments: buildSegments(a, b, hunks, issues),
    left: side(L, leftMarks, leftHunk, leftGaps),
    right: side(R, rightMarks, rightHunk, rightGaps),
  };
}

/* ---------------------------- HTML -> text ------------------------------ */

const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  lsquo: "‘", rsquo: "’", sbquo: "‚", ldquo: "“", rdquo: "”", bdquo: "„",
  ndash: "–", mdash: "—", hellip: "…", bull: "•", middot: "·",
  copy: "©", reg: "®", trade: "™", euro: "€", pound: "£", yen: "¥", cent: "¢",
  deg: "°", plusmn: "±", times: "×", divide: "÷", laquo: "«", raquo: "»",
  eacute: "é", egrave: "è", aacute: "á", agrave: "à", ntilde: "ñ", uuml: "ü", ouml: "ö", auml: "ä",
};

const codePoint = (n) => {
  try {
    return String.fromCodePoint(n);
  } catch {
    return "";
  }
};

function decodeEntities(text) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => codePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => codePoint(parseInt(d, 10)))
    .replace(/&([a-z][a-z0-9]*);/gi, (whole, name) => {
      const known = NAMED_ENTITIES[name] ?? NAMED_ENTITIES[name.toLowerCase()];
      if (known !== undefined) return known;
      // Rare named entities: let the browser decode them when we have one.
      if (typeof document !== "undefined") {
        const el = document.createElement("textarea");
        el.innerHTML = whole;
        return el.value;
      }
      return whole;
    });
}

const COMMENT_RE = /<!--[\s\S]*?-->/g;
const SCRIPT_STYLE_RE = /<(script|style)\b[\s\S]*?<\/\1\s*>/gi;
const BLOCK_TAG_RE =
  /<\/?(?:br|p|div|li|ul|ol|h[1-6]|tr|table|thead|tbody|tfoot|section|article|aside|header|footer|nav|blockquote|pre|hr|dl|dt|dd|figure|figcaption|form|fieldset)\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
const CELL_TAG_RE = /<\/?(?:td|th)\b(?:"[^"]*"|'[^']*'|[^>"'])*>/gi;
const ANY_TAG_RE = /<\/?[a-zA-Z][^\s>/]*(?:"[^"]*"|'[^']*'|[^>"'])*>/g;
const LOOKS_LIKE_HTML_RE = /<\/?[a-zA-Z][^\s>/]*(?:"[^"]*"|'[^']*'|[^>"'])*>|&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;

const BREAK = "\uE000";

/** True when the text contains HTML tags or entities. */
export const looksLikeHtml = (text) => LOOKS_LIKE_HTML_RE.test(text || "");

/**
 * Turn Sitecore HTML into the plain text a reader would see, the way a browser
 * would: tags removed, entities decoded, runs of whitespace collapsed, and line
 * breaks only where <br> or block elements (p, div, li, headings...) put them.
 * Text that isn't HTML is returned untouched.
 */
export function htmlToText(raw) {
  const source = raw || "";
  if (!looksLikeHtml(source)) return { text: source, converted: false };

  const flat = source
    .replace(COMMENT_RE, "")
    .replace(SCRIPT_STYLE_RE, "")
    .replace(BLOCK_TAG_RE, BREAK)
    .replace(CELL_TAG_RE, " ")
    .replace(ANY_TAG_RE, "");

  const text = decodeEntities(flat)
    .replace(/\s+/g, " ")
    .split(BREAK)
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return { text, converted: true };
}
