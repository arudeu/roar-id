/**
 * Spell checker for the HTML field checker.
 *
 * Pure JS (no DOM, no React), so it runs under `npm test` like html-checks.js.
 * It only ever looks at the *visible text* of a field: tags, attributes,
 * comments, <script>/<style>, entities, URLs and e-mail addresses are skipped,
 * and every issue keeps exact offsets into the original HTML.
 *
 *   createDictionary(aff, dic)  -> { has(word), suggest(word, limit) }
 *   parseIgnoreList(text)       -> string[]
 *   spellChecks(ctx, options)   -> adds "spelling" issues through ctx.add
 */

/* -------------------------------------------------------------------------- */
/* Dictionary (Hunspell .aff / .dic, expanded once into a Set)                 */
/* -------------------------------------------------------------------------- */

const LETTERS = "abcdefghijklmnopqrstuvwxyz'";

const normalize = (w) => w.replace(/[\u2019\u2018]/g, "'");
const isAllCaps = (w) => w.length > 1 && w === w.toUpperCase() && w !== w.toLowerCase();
const isCapitalized = (w) => /^[A-ZÀ-Þ][a-zß-ÿ']+$/.test(w);
const capitalize = (w) => w.charAt(0).toUpperCase() + w.slice(1);

function parseAffix(aff) {
  const rules = { PFX: {}, SFX: {} };
  for (const raw of aff.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    if (!line.startsWith("PFX ") && !line.startsWith("SFX ")) continue;
    const p = line.split(/\s+/);
    const [type, flag] = p;
    if (p.length === 4 && /^[YN]$/.test(p[2]) && /^\d+$/.test(p[3])) {
      rules[type][flag] = { cross: p[2] === "Y", list: [] }; // header line
      continue;
    }
    const group = rules[type][flag];
    if (!group) continue;
    const strip = p[2] === "0" ? "" : p[2];
    const add = (p[3] === "0" ? "" : p[3]).split("/")[0];
    const cond = p[4] || ".";
    group.list.push({
      strip,
      add,
      test: new RegExp(type === "PFX" ? `^${cond}` : `${cond}$`),
    });
  }
  return rules;
}

function applyRule(type, rule, word) {
  if (!rule.test.test(word)) return null;
  if (type === "SFX") {
    if (rule.strip && !word.endsWith(rule.strip)) return null;
    return word.slice(0, word.length - rule.strip.length) + rule.add;
  }
  if (rule.strip && !word.startsWith(rule.strip)) return null;
  return rule.add + word.slice(rule.strip.length);
}

export function createDictionary(aff, dic) {
  const rules = parseAffix(aff);
  const words = new Set();
  const noSuggest = new Set();

  const lines = dic.split(/\r?\n/);
  for (let i = 1; i < lines.length; i++) {
    const entry = lines[i].trim().split(/\s/)[0];
    if (!entry) continue;
    const slash = entry.indexOf("/");
    const stem = normalize(slash === -1 ? entry : entry.slice(0, slash));
    const flags = slash === -1 ? "" : entry.slice(slash + 1);
    if (/\d/.test(stem) || flags.includes("c")) continue; // ordinals / compound-only
    const hidden = flags.includes("!"); // offensive: valid, but never suggested

    const forms = [stem];
    const prefixed = [];
    for (const f of flags) {
      const sfx = rules.SFX[f];
      if (sfx) {
        for (const r of sfx.list) {
          const out = applyRule("SFX", r, stem);
          if (!out) continue;
          forms.push(out);
          if (sfx.cross) {
            for (const g of flags) {
              const pfx = rules.PFX[g];
              if (!pfx || !pfx.cross) continue;
              for (const pr of pfx.list) {
                const both = applyRule("PFX", pr, out);
                if (both) prefixed.push(both);
              }
            }
          }
        }
      }
      const pfx = rules.PFX[f];
      if (pfx) {
        for (const r of pfx.list) {
          const out = applyRule("PFX", r, stem);
          if (out) forms.push(out);
        }
      }
    }
    for (const w of forms.concat(prefixed)) {
      words.add(w);
      if (hidden) noSuggest.add(w);
    }
  }

  const known = (w) => {
    if (words.has(w)) return true;
    const lower = w.toLowerCase();
    if (lower === w) return false; // lowercase word that only exists capitalized (a name)
    if (isAllCaps(w)) return words.has(lower) || words.has(capitalize(lower));
    return isCapitalized(w) && words.has(lower);
  };

  const cache = new Map();

  /** Candidates within one edit (typo, missing/extra letter, swapped letters). */
  function suggest(word, limit = 4) {
    const w = normalize(word);
    const key = `${limit}:${w}`;
    if (cache.has(key)) return cache.get(key);

    const lower = w.toLowerCase();
    const costs = new Map();
    const consider = (cand, cost) => {
      if (cand.length < 2 || cand === lower || /^'|'$|''/.test(cand)) return;
      const hit = words.has(cand) ? cand : words.has(capitalize(cand)) ? capitalize(cand) : null;
      if (!hit || noSuggest.has(hit)) return;
      let c = cost;
      if (cand[0] !== lower[0]) c += 2; // typos rarely hit the first letter
      if (cand.includes("'") && !lower.includes("'")) c += 1.5;
      if (hit !== cand && !isCapitalized(w)) c += 1; // would turn it into a proper noun
      const prev = costs.get(hit);
      if (prev === undefined || c < prev) costs.set(hit, c);
    };

    const n = lower.length;
    for (let i = 0; i < n; i++) {
      consider(lower.slice(0, i) + lower.slice(i + 1), 1); // delete
      if (i < n - 1) {
        consider(lower.slice(0, i) + lower[i + 1] + lower[i] + lower.slice(i + 2), 0); // swap
      }
      for (const ch of LETTERS) {
        if (ch !== lower[i]) consider(lower.slice(0, i) + ch + lower.slice(i + 1), 1); // replace
      }
    }
    for (let i = 0; i <= n; i++) {
      for (const ch of LETTERS) consider(lower.slice(0, i) + ch + lower.slice(i), 1); // insert
    }

    const recase = (s) =>
      isAllCaps(w) ? s.toUpperCase() : isCapitalized(w) && s[0] === s[0].toLowerCase() ? capitalize(s) : s;
    const out = [...costs.entries()]
      .sort((a, b) => a[1] - b[1] || a[0].length - b[0].length || (a[0] < b[0] ? -1 : 1))
      .slice(0, limit)
      .map(([s]) => recase(s));
    cache.set(key, out);
    return out;
  }

  return { has: (w) => known(normalize(w)), suggest, size: words.size };
}

/* -------------------------------------------------------------------------- */
/* Ignore list                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Terms that are never flagged out of the box (gaming / payments vocabulary the
 * general dictionary doesn't know). The user's own list is added on top.
 */
export const DEFAULT_IGNORE = [
  "sportsbook", "sportsbooks", "parlay", "parlays", "moneyline", "moneylines",
  "betmgm", "mgm", "mastercard", "venmo", "skrill", "neteller", "paysafe",
  "wagerable", "rollover", "cashout", "bonusbet", "bonusbets", "igaming",
  "freeplay", "livestream", "pregame", "noreferrer",
];

/** One term per line or comma-separated; blank lines and duplicates are dropped. */
export function parseIgnoreList(text) {
  const seen = new Set();
  const out = [];
  for (const part of String(text || "").split(/[\n\r,;]+/)) {
    const term = part.trim().replace(/\s+/g, " ");
    const key = term.toLowerCase();
    if (!term || seen.has(key)) continue;
    seen.add(key);
    out.push(term);
  }
  return out;
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function buildIgnore(list) {
  const words = new Set();
  const phrases = [];
  for (const term of [...DEFAULT_IGNORE, ...list]) {
    const t = normalize(term).trim();
    if (!t) continue;
    if (/\s/.test(t)) phrases.push(t);
    else words.add(t.toLowerCase());
  }
  // longest phrases first so "Mega Spin Bonanza" wins over "Mega Spin"
  phrases.sort((a, b) => b.length - a.length);
  const phraseRe = phrases.length
    ? new RegExp(
        `(?<![A-Za-z'])(?:${phrases.map((p) => p.split(" ").map(escapeRe).join("\\s+")).join("|")})(?:'s)?(?![A-Za-z])`,
        "gi",
      )
    : null;
  return { words, phraseRe };
}

function isIgnored(word, words) {
  const l = normalize(word).toLowerCase();
  if (words.has(l)) return true;
  const base = l.replace(/'s$/, "").replace(/s'$/, "s");
  if (words.has(base)) return true;
  // plurals of an ignored term: "Zorbos" / "Zorbo's"
  return base.endsWith("s") && words.has(base.slice(0, -1));
}

/* -------------------------------------------------------------------------- */
/* Visible-text view with a map back to the original HTML                      */
/* -------------------------------------------------------------------------- */

// Tags that sit inside a word's text flow: "Condi<b>tions</b>" is one word.
const INLINE = new Set(
  "a abbr b bdi bdo big cite code del dfn em font i ins kbd mark q s samp small span strike strong tt u var".split(" "),
);
const BREAKERS = new Set(
  "p div li br ul ol h1 h2 h3 h4 h5 h6 td th tr table blockquote section article hr header footer dl dt dd".split(" "),
);

const APOSTROPHE_ENTITIES = /^(?:rsquo|lsquo|apos|#8217|#8216|#39|#x27|#x2019|#x2018)$/i;
const ENTITY_RE = /^&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/i;

function buildSpellView(value, tokens) {
  const chars = [];
  const starts = [];
  const ends = [];
  const push = (ch, from, to) => {
    chars.push(ch);
    starts.push(from);
    ends.push(to);
  };

  let pos = 0;
  const copyText = (until) => {
    while (pos < until) {
      const ch = value[pos];
      if (ch === "&") {
        const m = ENTITY_RE.exec(value.slice(pos, pos + 12));
        if (m) {
          const name = m[1];
          if (APOSTROPHE_ENTITIES.test(name)) push("'", pos, pos + m[0].length);
          else if (/^[A-Za-z](?:acute|grave|uml|circ|tilde|cedil|ring|slash)$/.test(name)) push(name[0], pos, pos + m[0].length);
          else push(" ", pos, pos + m[0].length);
          pos += m[0].length;
          continue;
        }
      }
      push(ch, pos, pos + 1);
      pos++;
    }
  };

  for (const t of tokens) {
    if (t.type === "stray-lt") continue; // plain text
    if (t.from < pos) continue;
    copyText(t.from);
    if (t.type === "open" || t.type === "close") {
      if (!INLINE.has(t.name)) push(BREAKERS.has(t.name) ? "\n" : " ", t.from, t.to);
    } else {
      push(" ", t.from, t.to); // comments, doctype, <script>/<style> bodies
    }
    pos = Math.max(pos, t.to);
  }
  copyText(value.length);
  return { text: chars.join(""), starts, ends };
}

const blank = (text, re) => text.replace(re, (m) => " ".repeat(m.length));

function sentenceStart(text, i) {
  let k = i - 1;
  while (k >= 0 && (text[k] === " " || text[k] === "\t")) k--;
  if (k < 0 || text[k] === "\n") return true;
  return /[.!?:;"“”(\u2022*]/.test(text[k]);
}

/* -------------------------------------------------------------------------- */
/* The check                                                                   */
/* -------------------------------------------------------------------------- */

const WORD_RE = /[A-Za-zÀ-ÖØ-öø-ÿ]+(?:['\u2019][A-Za-zÀ-ÖØ-öø-ÿ]+)*/g;

/**
 * @param ctx      { value, tokens, add } from the field analysis
 * @param options  { dict, ignore?: string[], skipNames?: boolean }
 */
export function spellChecks(ctx, options) {
  const { value, tokens, add } = ctx;
  const { dict, skipNames = true } = options;
  if (!dict) return;
  const ignore = buildIgnore(options.ignore || []);

  const view = buildSpellView(value, tokens);
  let text = view.text;

  // things that look like words but aren't copy
  text = blank(text, /\b(?:https?:\/\/|www\.)\S+/gi);
  text = blank(text, /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g);
  text = blank(text, /\b[\w-]+(?:\.[\w-]+)*\.(?:com|net|org|co|ca|io|us|uk|gov|edu|app)\b(?:\/\S*)?/gi);
  text = blank(text, /\{\{[\s\S]*?\}\}|\$\{[^}]*\}/g);
  if (ignore.phraseRe) text = blank(text, ignore.phraseRe);

  const re = new RegExp(WORD_RE.source, "g");
  let m;
  while ((m = re.exec(text)) !== null) {
    const word = m[0];
    const i = m.index;
    const end = i + word.length;
    if (word.replace(/'/g, "").length < 3) continue;

    const before = text[i - 1];
    const after = text[end];
    if (before !== undefined && /[\d_@#\\/]/.test(before)) continue; // 1st, a_b, @user, paths
    if (after !== undefined && /[\d_@\\]/.test(after)) continue;
    if (/[a-z][A-Z]/.test(word)) continue; // BetMGM, iPhone
    if (isAllCaps(word) && word.length <= 4) continue; // acronyms: NJ, FAQ, USA
    if (isIgnored(word, ignore.words)) continue;
    if (dict.has(word)) continue;

    // possessives and plural possessives of known words
    const norm = normalize(word);
    if (/'s$/i.test(norm) && dict.has(norm.slice(0, -2))) continue;
    if (/s'$/i.test(norm) && dict.has(norm.slice(0, -1))) continue;
    if (norm.includes("'") && norm.split("'").every((p) => !p || p.length < 3 || dict.has(p))) continue;

    const suggestions = dict.suggest(word, 4);
    // Names and brands: capitalized mid-sentence words are only flagged when
    // they are one edit away from a real word ("Elligible" yes, "Zyxland" no).
    if (skipNames && isCapitalized(word) && !sentenceStart(text, i) && !suggestions.length) continue;
    if (skipNames && isAllCaps(word) && !suggestions.length) continue;

    const from = view.starts[i];
    const to = view.ends[end - 1];
    const contiguous = value.slice(from, to) === word; // no tag or entity inside the word
    const usable = contiguous ? suggestions : [];
    const hint = usable.length ? ` — did you mean ${usable.slice(0, 3).map((s) => `“${s}”`).join(", ")}?` : "";

    add(
      "spelling",
      "warning",
      `“${word}” may be misspelled${hint}`,
      from,
      to,
      usable.length ? [{ from, to, insert: usable[0] }] : undefined,
      { word, suggestions: usable, noBulk: true },
    );
  }
}
