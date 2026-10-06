/**
 * HTML field checker engine.
 *
 * Pure JS (no DOM, no React) so it can be unit-tested with `npm test`.
 * Every issue carries exact character offsets (`from` / `to`) into the field
 * value, which is what makes precise highlighting, jump-to-issue navigation
 * and one-click fixes possible.
 *
 *   Issue = {
 *     id, field, rule, title, category, severity: "error" | "warning" | "info",
 *     message, from, to, line, col, text,
 *     fix?: [{ from, to, insert }]   // optional auto-fix (one or more edits)
 *   }
 */

export const SEVERITY_ORDER = { error: 0, warning: 1, info: 2 };

// rule id -> [title, category]
export const RULE_META = {
  "unclosed-tag": ["Unclosed tag", "Structure"],
  "stray-close": ["Stray closing tag", "Structure"],
  "overlap": ["Overlapping tags", "Structure"],
  "void-closing": ["Closing tag on void element", "Structure"],
  "self-closing": ["Self-closing non-void tag", "Structure"],
  "unknown-tag": ["Unknown tag", "Structure"],
  "word-markup": ["Word/Office markup", "Structure"],
  "li-outside-list": ["<li> outside list", "Structure"],
  "list-child": ["Invalid list child", "Structure"],
  "empty-list": ["Empty list", "Structure"],
  "nested-a": ["Nested link", "Structure"],
  "block-in-p": ["Block inside <p>", "Structure"],
  "ol-numbering": ["List numbering", "Structure"],
  "ol-start-invalid": ["Invalid list start", "Structure"],
  "unterminated-tag": ["Tag missing >", "Syntax"],
  "unclosed-quote": ["Unclosed attribute quote", "Syntax"],
  "swallowed-tags": ["Quote swallows markup", "Syntax"],
  "missing-lt": ["Missing <", "Syntax"],
  "stray-lt": ["Stray <", "Syntax"],
  "stray-gt": ["Stray >", "Syntax"],
  "unclosed-comment": ["Unclosed comment", "Syntax"],
  "unmatched-closer": ["Unmatched bracket", "Syntax"],
  "unclosed-symbol": ["Unclosed bracket", "Syntax"],
  "unbalanced-quotes": ["Unbalanced quotes", "Syntax"],
  "mixed-quotes": ["Mixed quote styles", "Syntax"],
  "empty-tag": ["Empty tag", "Syntax"],
  "br-tag": ["Line break tag", "Syntax"],
  "strong-dot": ["Stray bold punctuation", "Syntax"],
  "duplicate-attr": ["Duplicate attribute", "Attributes & links"],
  "attr-no-value": ["Attribute missing value", "Attributes & links"],
  "attr-empty": ["Empty attribute", "Attributes & links"],
  "attr-unquoted": ["Unquoted attribute", "Attributes & links"],
  "duplicate-id": ["Duplicate id", "Attributes & links"],
  "link-placeholder": ["Placeholder link", "Attributes & links"],
  "link-padding": ["Link has stray spaces", "Attributes & links"],
  "link-space": ["Unescaped space in URL", "Attributes & links"],
  "link-protocol": ["Bad link protocol", "Attributes & links"],
  "link-insecure": ["Insecure link", "Attributes & links"],
  "link-no-href": ["Link without href", "Attributes & links"],
  "link-empty": ["Link has no text", "Attributes & links"],
  "unsafe-blank": ["target=_blank without noopener", "Attributes & links"],
  "img-alt": ["Image missing alt", "Attributes & links"],
  "word-attr": ["Word/Office attribute", "Attributes & links"],
  "tile-header": ["Tile header mismatch", "Content"],
  "link-placeholder-text": ["Placeholder link text", "Content"],
  "olg-line": ["OLG line", "Content"],
  "brand-casing": ["Brand casing", "Content"],
  "repeated-word": ["Repeated word", "Content"],
  "repeated-sentence": ["Repeated sentence", "Content"],
  "plural": ["Incorrect plural", "Content"],
  "ordinal-sup": ["Ordinal needs <sup>", "Content"],
  "ordinal-suffix": ["Wrong ordinal suffix", "Content"],
  "date-mixed": ["Mixed date formats", "Dates & times"],
  "date-invalid": ["Invalid date", "Dates & times"],
  "date-weekday": ["Weekday mismatch", "Dates & times"],
  "date-month-style": ["Mixed month styles", "Dates & times"],
  "time-format": ["Time format", "Dates & times"],
  "time-no-meridiem": ["Time missing AM/PM", "Dates & times"],
  "special-space": ["Invisible character", "Formatting"],
  "nbsp": ["Non-breaking space", "Formatting"],
  "multi-space": ["Multiple spaces", "Formatting"],
  "comma-space": ["Missing space after comma", "Formatting"],
  "space-before-punct": ["Space before punctuation", "Formatting"],
  "multi-punct": ["Repeated punctuation", "Formatting"],
  "trademark-entity": ["Use HTML entity", "Formatting"],
  "double-dollar": ["Double $", "Money & numbers"],
  "double-percent": ["Double %", "Money & numbers"],
  "dollar-space": ["Space around $", "Money & numbers"],
  "missing-dollar": ["Possible missing $", "Money & numbers"],
  "large-number": ["Number needs comma", "Money & numbers"],
  "number-separator": ["Check thousands separator", "Money & numbers"],
  "amount-tier": ["Amount tiers with slashes", "Money & numbers"],
  "k-shorthand": ["Lowercase K/M", "Money & numbers"],
  "percent-space": ["Space before %", "Money & numbers"],
  "percent-word": ["Spelled-out percent", "Money & numbers"],
  "multiplier-case": ["Multiplier casing", "Money & numbers"],
  "emphasis-mix": ["Mixed emphasis tags", "Consistency"],
  "check-failed": ["Check failed", "Internal"],
};

const VOID_TAGS = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "source", "track", "wbr",
]);

const KNOWN_TAGS = new Set(
  (
    "a abbr address article aside audio b bdi bdo blockquote body br button canvas caption cite code col " +
    "colgroup data dd del details dfn div dl dt em fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 " +
    "head header hr html i iframe img input ins kbd label legend li link main mark meta nav noscript ol " +
    "optgroup option p picture pre q s samp script section select small source span strong style sub " +
    "summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr " +
    "area base embed svg path circle rect g center font strike big tt"
  ).split(" "),
);

const BLOCK_TAGS = new Set([
  "address", "article", "aside", "blockquote", "div", "dl", "fieldset", "figure",
  "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hr", "main",
  "nav", "ol", "p", "pre", "section", "table", "ul",
]);

const VALUE_REQUIRED_ATTRS = new Set([
  "id", "class", "href", "src", "style", "alt", "target", "title", "rel", "name",
  "value", "width", "height",
]);

const COMMON_TAG_NAMES =
  "p|div|span|strong|em|b|i|u|ul|ol|li|a|br|hr|h[1-6]|table|tr|td|th|img|sup|sub|blockquote|section";

const FILL = "\u0001"; // placeholder for masked markup (keeps offsets intact)

const MONTHS = [
  "january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december",
];
const MONTH_PATTERN =
  "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec";
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const WEEKDAY_PATTERN =
  "Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|Mon|Tues|Tue|Wed|Thurs|Thur|Thu|Fri|Sat|Sun";

const SPECIAL_CHARS = {
  "\u00A0": ["no-break space", " "],
  "\u1680": ["ogham space", " "],
  "\u2000": ["en quad", " "], "\u2001": ["em quad", " "], "\u2002": ["en space", " "],
  "\u2003": ["em space", " "], "\u2004": ["three-per-em space", " "],
  "\u2005": ["four-per-em space", " "], "\u2006": ["six-per-em space", " "],
  "\u2007": ["figure space", " "], "\u2008": ["punctuation space", " "],
  "\u2009": ["thin space", " "], "\u200A": ["hair space", " "],
  "\u202F": ["narrow no-break space", " "], "\u205F": ["medium math space", " "],
  "\u3000": ["ideographic space", " "],
  "\u200B": ["zero-width space", ""], "\u200C": ["zero-width non-joiner", ""],
  "\u200D": ["zero-width joiner", ""], "\u200E": ["left-to-right mark", ""],
  "\u200F": ["right-to-left mark", ""], "\u2060": ["word joiner", ""],
  "\uFEFF": ["zero-width no-break space (BOM)", ""],
  "\u2028": ["line separator", "\n"], "\u2029": ["paragraph separator", "\n"],
};
const SPECIAL_CHAR_RE = new RegExp(`[${Object.keys(SPECIAL_CHARS).join("")}]`, "g");

const BRANDS = ["BetMGM"]; // canonical casing; matched ignoring case and inner spaces

/* -------------------------------------------------------------------------- */
/* Small helpers                                                              */
/* -------------------------------------------------------------------------- */

function scan(text, regex, cb) {
  const flags = regex.flags.includes("g") ? regex.flags : regex.flags + "g";
  const re = new RegExp(regex.source, flags);
  let m;
  while ((m = re.exec(text)) !== null) {
    cb(m);
    if (m[0].length === 0) re.lastIndex++;
  }
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return dp[a.length][b.length];
}

function closestTag(name) {
  if (name.length < 3) return null;
  let best = null;
  let bestDist = 3;
  for (const known of KNOWN_TAGS) {
    if (known.length < 2) continue;
    const d = levenshtein(name, known);
    if (d < bestDist) {
      best = known;
      bestDist = d;
    }
  }
  return best;
}

const daysInMonth = (monthIdx, year) =>
  new Date(Date.UTC(year, monthIdx + 1, 0)).getUTCDate();

const monthIndex = (name) => {
  const key = name.toLowerCase().replace(".", "");
  return MONTHS.findIndex((m) => m === key || m.startsWith(key.slice(0, 3)));
};

const weekdayIndex = (name) => {
  const key = name.toLowerCase().slice(0, 3);
  return WEEKDAYS.findIndex((d) => d.startsWith(key));
};

const ordinalSuffix = (n) => {
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[n % 10] || "th";
};

const addCommas = (digits) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/* -------------------------------------------------------------------------- */
/* Tokenizer — quote-aware HTML tag scanner with exact offsets                */
/* -------------------------------------------------------------------------- */

function parseTag(src, start) {
  const n = src.length;
  const closing = src[start + 1] === "/";
  let j = start + (closing ? 2 : 1);
  const nameFrom = j;
  while (j < n && /[A-Za-z0-9:_.-]/.test(src[j])) j++;
  const rawName = src.slice(nameFrom, j);
  const tok = {
    type: closing ? "close" : "open",
    name: rawName.toLowerCase(),
    rawName,
    nameFrom,
    nameTo: j,
    from: start,
    to: start,
    attrs: [],
    selfClose: false,
    problems: [],
  };

  for (;;) {
    while (j < n && /\s/.test(src[j])) j++;
    if (j >= n) {
      tok.to = n;
      tok.problems.push({ code: "unterminated" });
      return tok;
    }
    const c = src[j];
    if (c === ">") {
      tok.to = j + 1;
      return tok;
    }
    if (c === "/") {
      if (src[j + 1] === ">") {
        tok.selfClose = true;
        tok.to = j + 2;
        return tok;
      }
      j++;
      continue;
    }
    if (c === "<") {
      tok.to = j;
      tok.problems.push({ code: "missing-gt" });
      return tok;
    }
    if (c === '"' || c === "'" || c === "=") {
      j++; // junk character inside a tag
      continue;
    }

    const aFrom = j;
    while (j < n && !/[\s"'=<>/]/.test(src[j])) j++;
    const attr = {
      name: src.slice(aFrom, j).toLowerCase(),
      from: aFrom,
      to: j,
      hasValue: false,
      value: "",
      quote: "",
      valueFrom: j,
      valueTo: j,
    };

    let k = j;
    while (k < n && /\s/.test(src[k])) k++;
    if (src[k] === "=") {
      k++;
      while (k < n && /\s/.test(src[k])) k++;
      attr.hasValue = true;
      const q = src[k];
      if (q === '"' || q === "'") {
        const close = src.indexOf(q, k + 1);
        attr.quote = q;
        if (close === -1) {
          // No closing quote anywhere: recover at the next ">" so the rest of
          // the field is still checked instead of being swallowed.
          const gt = src.indexOf(">", k + 1);
          const end = gt === -1 ? n : gt;
          attr.valueFrom = k + 1;
          attr.valueTo = end;
          attr.value = src.slice(k + 1, end);
          attr.to = end;
          tok.attrs.push(attr);
          tok.to = gt === -1 ? n : gt + 1;
          tok.problems.push({ code: "unclosed-quote", at: k });
          return tok;
        }
        attr.valueFrom = k + 1;
        attr.valueTo = close;
        attr.value = src.slice(k + 1, close);
        attr.to = close + 1;
        j = close + 1;
        if (/<\/?[A-Za-z]/.test(attr.value)) {
          // The "value" ran into other markup: a closing quote is missing.
          tok.attrs.push(attr);
          tok.problems.push({ code: "swallowed", attr });
          const gt = attr.value.indexOf(">");
          if (gt !== -1) {
            tok.to = attr.valueFrom + gt + 1;
            return tok;
          }
          continue;
        }
      } else {
        const vf = k;
        while (k < n && !/[\s>]/.test(src[k])) k++;
        attr.valueFrom = vf;
        attr.valueTo = k;
        attr.value = src.slice(vf, k);
        attr.to = k;
        j = k;
      }
    }
    tok.attrs.push(attr);
  }
}

export function tokenize(src) {
  const tokens = [];
  const n = src.length;
  let i = 0;
  while (i < n) {
    const lt = src.indexOf("<", i);
    if (lt === -1) break;
    i = lt;

    if (src.startsWith("<!--", i)) {
      const end = src.indexOf("-->", i + 4);
      if (end === -1) {
        tokens.push({ type: "comment", from: i, to: n, unclosed: true });
        i = n;
      } else {
        tokens.push({ type: "comment", from: i, to: end + 3 });
        i = end + 3;
      }
      continue;
    }
    if (src[i + 1] === "!" || src[i + 1] === "?") {
      const end = src.indexOf(">", i);
      const to = end === -1 ? n : end + 1;
      tokens.push({ type: "comment", from: i, to });
      i = to;
      continue;
    }
    if (!/[A-Za-z]/.test(src[i + (src[i + 1] === "/" ? 2 : 1)] || "")) {
      tokens.push({ type: "stray-lt", from: i, to: i + 1 });
      i++;
      continue;
    }

    const tok = parseTag(src, i);
    tokens.push(tok);
    i = Math.max(tok.to, i + 1);

    if (tok.type === "open" && !tok.selfClose && (tok.name === "script" || tok.name === "style")) {
      const m = new RegExp(`</${tok.name}\\b`, "i").exec(src.slice(i));
      const end = m ? i + m.index : n;
      if (end > i) tokens.push({ type: "comment", from: i, to: end, raw: true });
      i = end;
    }
  }
  return tokens;
}

function maskMarkup(value, tokens, fill) {
  let out = "";
  let pos = 0;
  for (const t of tokens) {
    if (t.type === "stray-lt") continue;
    out += value.slice(pos, t.from) + fill.repeat(t.to - t.from);
    pos = t.to;
  }
  return out + value.slice(pos);
}

/* -------------------------------------------------------------------------- */
/* Issue collector                                                            */
/* -------------------------------------------------------------------------- */

function createCollector(field, value) {
  const lineStarts = [0];
  for (let i = 0; i < value.length; i++) if (value[i] === "\n") lineStarts.push(i + 1);

  const locate = (idx) => {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= idx) lo = mid;
      else hi = mid - 1;
    }
    return { line: lo + 1, col: idx - lineStarts[lo] + 1 };
  };

  const issues = [];
  const seen = new Set();

  const add = (rule, severity, message, from, to, fix) => {
    const len = value.length;
    from = Math.max(0, Math.min(from, len));
    to = Math.max(0, Math.min(to, len));
    if (to <= from) {
      if (from < len) to = from + 1;
      else from = Math.max(0, len - 1);
      if (to <= from) to = Math.min(len, from + 1);
    }
    const id = `${field}:${rule}:${from}-${to}`;
    if (seen.has(id)) return;
    seen.add(id);
    const meta = RULE_META[rule] || [rule, "Other"];
    const { line, col } = locate(from);
    issues.push({
      id, field, rule, title: meta[0], category: meta[1], severity, message,
      from, to, line, col,
      text: value.slice(from, to).slice(0, 80),
      fix: fix && fix.length ? fix : undefined,
    });
  };

  return { issues, add, locate };
}

/* -------------------------------------------------------------------------- */
/* Single-field analysis                                                       */
/* -------------------------------------------------------------------------- */

function analyzeInternal(field, value) {
  const { issues, add, locate } = createCollector(field, value);
  const tokens = tokenize(value);
  const view = maskMarkup(value, tokens, FILL); // visible text only
  const spaced = maskMarkup(value, tokens, " "); // visible text, tags as spaces
  const ctx = { value, tokens, view, spaced, add };

  const safe = (name, fn) => {
    try {
      fn(ctx);
    } catch (err) {
      add("check-failed", "info", `The "${name}" check failed to run (${err.message})`, 0, 1);
    }
  };

  // helper: replacement edit for a regex match (skipped when it spans markup)
  const rep = (m, insert, offset = 0, length = m[0].length - offset) =>
    m[0].includes(FILL) ? undefined : [{ from: m.index + offset, to: m.index + offset + length, insert }];

  safe("tag syntax", syntaxChecks);
  safe("tag structure", structureChecks);
  safe("attributes", attributeChecks);
  safe("symbols", symbolChecks);
  safe("formatting", formattingChecks);
  safe("money", moneyChecks);
  safe("dates", dateChecks);
  safe("content", contentChecks);
  safe("sentences", sentenceChecks);

  /* ----------------------------- syntax -------------------------------- */
  function syntaxChecks() {
    for (const t of tokens) {
      if (t.type === "comment" && t.unclosed) {
        add("unclosed-comment", "error", "HTML comment is never closed — missing -->", t.from, t.from + 4);
      }
      if (t.type === "stray-lt") {
        add("stray-lt", "warning", 'Stray "<" — use &lt; to show a less-than sign', t.from, t.to, [
          { from: t.from, to: t.to, insert: "&lt;" },
        ]);
      }
      if (t.type !== "open" && t.type !== "close") continue;
      for (const p of t.problems) {
        const label = `<${t.type === "close" ? "/" : ""}${t.rawName}>`;
        if (p.code === "unterminated" || p.code === "missing-gt") {
          add("unterminated-tag", "error", `${label} is missing its closing ">"`, t.from, Math.min(t.to, t.from + 40));
        } else if (p.code === "unclosed-quote") {
          add("unclosed-quote", "error", `Attribute quote opened in ${label} is never closed`, p.at, Math.min(value.length, p.at + 40));
        } else if (p.code === "swallowed") {
          add("swallowed-tags", "error", `A quoted value in ${label} runs into other markup — a closing quote is probably missing`, p.attr.from, Math.min(p.attr.to, p.attr.from + 60));
        }
      }
    }

    // ">" in visible text, optionally preceded by a tag name that lost its "<"
    const claimed = [];
    scan(view, new RegExp(`(\\/?)\\b(${COMMON_TAG_NAMES})>`, "gi"), (m) => {
      if (view[m.index - 1] === "<") return;
      claimed.push(m.index + m[0].length - 1);
      add("missing-lt", "error", `Missing "<" before “${m[0]}”`, m.index, m.index + m[0].length, [
        { from: m.index, to: m.index, insert: "<" },
      ]);
    });
    scan(view, />/g, (m) => {
      if (claimed.includes(m.index)) return;
      add("stray-gt", "warning", 'Stray ">" — use &gt; to show a greater-than sign', m.index, m.index + 1, [
        { from: m.index, to: m.index + 1, insert: "&gt;" },
      ]);
    });

    for (const t of tokens) {
      if (t.type === "open" && t.name === "br") {
        const before = value[t.from - 1];
        const after = value[t.to];
        const glue = /\s/.test(before || "") || /\s/.test(after || "") ? "" : " ";
        add("br-tag", "warning", "Line break tag (<br>) — use spaces or separate paragraphs instead", t.from, t.to, [
          { from: t.from, to: t.to, insert: glue },
        ]);
      }
    }

    scan(value, /<(strong|b)>\s*[.,;:!?]\s*<\/\1>/gi, (m) => {
      const punct = m[0].replace(/<[^>]*>/g, "").trim();
      add("strong-dot", "warning", "Bold tag wrapped around only punctuation (usually from pasting out of Word) — remove the tags", m.index, m.index + m[0].length, [
        { from: m.index, to: m.index + m[0].length, insert: punct },
      ]);
    });

    scan(value, /<(\w+)>(?:\s|&nbsp;|\u00A0)*<\/\1>/gi, (m) => {
      if (/^(td|th|textarea|script|iframe|canvas|i)$/i.test(m[1])) return;
      add("empty-tag", "warning", `Empty <${m[1]}> tag — remove it`, m.index, m.index + m[0].length, [
        { from: m.index, to: m.index + m[0].length, insert: "" },
      ]);
    });
  }

  /* ---------------------------- structure ------------------------------ */
  function structureChecks() {
    const stack = [];
    const olTop = [];
    const nearestList = () => {
      for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === "ul" || stack[k].name === "ol") return stack[k];
      return null;
    };

    for (const t of tokens) {
      if (t.type !== "open" && t.type !== "close") continue;
      const label = `<${t.rawName}>`;

      if (t.name.includes(":")) {
        add("word-markup", "warning", `Office/Word markup ${label} — remove it`, t.from, t.to);
        continue;
      }
      if (!KNOWN_TAGS.has(t.name) && !t.name.includes("-")) {
        const guess = closestTag(t.name);
        add("unknown-tag", "warning", `Unknown tag ${label}${guess ? ` — did you mean <${guess}>?` : ""}`, t.from, t.to,
          guess ? [{ from: t.nameFrom, to: t.nameTo, insert: guess }] : undefined);
      }

      if (t.type === "open") {
        if (VOID_TAGS.has(t.name)) continue;
        if (t.selfClose) {
          add("self-closing", "warning", `${label} can't be self-closing in HTML — write <${t.name}></${t.name}>`, t.from, t.to);
          continue;
        }
        const top = stack[stack.length - 1];

        if (t.name === "li") {
          const list = nearestList();
          if (!list) add("li-outside-list", "error", "<li> found outside of a <ul> or <ol> list", t.from, t.to);
          else {
            list.hasLi = true;
            list.liCount++;
          }
        } else if (top && (top.name === "ul" || top.name === "ol") && !["script", "template"].includes(t.name)) {
          add("list-child", "warning", `${label} sits directly inside <${top.name}> — only <li> is allowed there`, t.from, t.to);
        }
        if (t.name === "a" && stack.some((s) => s.name === "a")) {
          add("nested-a", "error", "Nested <a> — a link can't contain another link", t.from, t.to);
        }
        if (top && top.name === "p" && BLOCK_TAGS.has(t.name)) {
          add("block-in-p", "warning", `${label} can't live inside <p> — the browser closes the paragraph early`, t.from, t.to);
        }

        const entry = { name: t.name, token: t, hasLi: false, liCount: 0, listDepth: stack.filter((s) => s.name === "ul" || s.name === "ol").length };
        if (t.name === "ol" && entry.listDepth === 0) olTop.push(entry);
        stack.push(entry);
        continue;
      }

      // closing tag
      if (VOID_TAGS.has(t.name)) {
        add("void-closing", "warning", `${label} is a void element and never has a closing tag`, t.from, t.to, [
          { from: t.from, to: t.to, insert: "" },
        ]);
        continue;
      }
      const idx = (() => {
        for (let k = stack.length - 1; k >= 0; k--) if (stack[k].name === t.name) return k;
        return -1;
      })();
      if (idx === -1) {
        add("stray-close", "error", `Closing </${t.rawName}> has no matching opening tag`, t.from, t.to, [
          { from: t.from, to: t.to, insert: "" },
        ]);
        continue;
      }
      for (let k = stack.length - 1; k > idx; k--) {
        const skipped = stack[k];
        add("overlap", "error", `<${skipped.name}> isn't closed before </${t.rawName}> — tags overlap or a closing tag is missing`, skipped.token.from, skipped.token.to);
      }
      const closed = stack[idx];
      stack.length = idx;
      closed.token.pair = t;

      if ((closed.name === "ul" || closed.name === "ol") && !closed.hasLi) {
        add("empty-list", "warning", `<${closed.name}> list has no <li> items`, closed.token.from, closed.token.to);
      }
      if (closed.name === "a") {
        const inner = value.slice(closed.token.to, t.from);
        const innerText = inner.replace(/<(?!img\b)[^>]*>/gi, "").replace(/&nbsp;|\s|\u00A0/g, "");
        if (!innerText && !/<img\b/i.test(inner)) {
          add("link-empty", "warning", "Link has no visible text", closed.token.from, t.to);
        }
      }
    }

    stack.forEach((s) => {
      add("unclosed-tag", "error", `Unclosed <${s.name}> — missing </${s.name}>`, s.token.from, s.token.to);
    });

    // <ol start="…"> continuation numbering
    let expected = null;
    let prev = null;
    for (const ol of olTop) {
      const startAttr = ol.token.attrs.find((a) => a.name === "start");
      let declared = 1;
      if (startAttr) {
        if (!/^\s*\d+\s*$/.test(startAttr.value)) {
          add("ol-start-invalid", "error", `<ol start="${startAttr.value}"> must be a whole number`, startAttr.from, startAttr.to);
        } else {
          declared = parseInt(startAttr.value, 10);
          if (expected !== null && declared !== expected) {
            add("ol-numbering", "warning", `<ol start="${declared}"> looks out of sequence — the previous list has ${prev.liCount} item(s), so this one should start at ${expected}`, startAttr.from, startAttr.to, [
              { from: startAttr.valueFrom, to: startAttr.valueTo, insert: String(expected) },
            ]);
          }
        }
      }
      expected = declared + ol.liCount;
      prev = ol;
    }
  }

  /* ---------------------------- attributes ----------------------------- */
  function attributeChecks() {
    const ids = new Map();
    for (const t of tokens) {
      if (t.type !== "open") continue;
      const label = `<${t.rawName}>`;
      const seen = new Set();

      for (const a of t.attrs) {
        if (seen.has(a.name)) {
          add("duplicate-attr", "error", `Attribute "${a.name}" appears more than once on ${label}`, a.from, a.to);
        }
        seen.add(a.name);

        if (!a.hasValue) {
          if (VALUE_REQUIRED_ATTRS.has(a.name)) {
            add("attr-no-value", "error", `Attribute "${a.name}" on ${label} is missing its value (e.g. ${a.name}="…")`, a.from, a.to);
          }
          continue;
        }
        if (a.quote === "" && a.value !== "") {
          add("attr-unquoted", "warning", `Value of "${a.name}" on ${label} should be wrapped in quotes`, a.valueFrom, a.valueTo, [
            { from: a.valueFrom, to: a.valueTo, insert: `"${a.value}"` },
          ]);
        }
        if (a.value.trim() === "" && a.name !== "alt" && a.name !== "href" && VALUE_REQUIRED_ATTRS.has(a.name)) {
          add("attr-empty", "warning", `Attribute "${a.name}" on ${label} is empty`, a.from, a.to);
        }
        if (a.name === "id" && a.value.trim()) {
          if (ids.has(a.value)) {
            add("duplicate-id", "error", `Duplicate id "${a.value}" — ids must be unique`, a.from, a.to);
          }
          ids.set(a.value, true);
        }
        if ((a.name === "class" && /\bMso/.test(a.value)) || (a.name === "style" && /mso-/i.test(a.value))) {
          add("word-attr", "warning", `Microsoft Word formatting left in ${label} — paste as plain text instead`, a.from, a.to);
        }
      }

      if (t.name === "img" && !t.attrs.some((a) => a.name === "alt")) {
        add("img-alt", "warning", "<img> has no alt attribute", t.from, t.to);
      }

      if (t.name === "a") {
        const href = t.attrs.find((a) => a.name === "href");
        if (!href) {
          if (!t.attrs.some((a) => a.name === "name" || a.name === "id")) {
            add("link-no-href", "warning", "<a> has no href", t.from, t.to);
          }
        } else if (href.hasValue) {
          const raw = href.value;
          const v = raw.trim();
          if (v === "" || v === "#") {
            add("link-placeholder", "error", `Broken or placeholder link → href="${raw}"`, href.from, href.to);
          } else {
            if (raw !== v && href.quote) {
              add("link-padding", "warning", "Link has spaces at the start or end of the URL", href.valueFrom, href.valueTo, [
                { from: href.valueFrom, to: href.valueTo, insert: v },
              ]);
            }
            if (/^javascript:/i.test(v)) {
              add("link-protocol", "error", "javascript: links aren't allowed", href.from, href.to);
            } else if (/^https?:\/\/https?:\/\//i.test(v)) {
              add("link-protocol", "error", "URL repeats its protocol (https://https://…)", href.from, href.to);
            } else if (/^http:\/\//i.test(v)) {
              add("link-insecure", "info", "Link uses http:// — prefer https://", href.valueFrom, href.valueTo, [
                { from: href.valueFrom + (raw.length - raw.trimStart().length), to: href.valueFrom + (raw.length - raw.trimStart().length) + 7, insert: "https://" },
              ]);
            }
            if (/\s/.test(v) && !/^(mailto|tel):/i.test(v)) {
              add("link-space", "warning", "URL contains an unescaped space — use %20", href.valueFrom, href.valueTo);
            }
          }
        }
        const target = t.attrs.find((a) => a.name === "target");
        const rel = t.attrs.find((a) => a.name === "rel");
        if (target && /^_blank$/i.test(target.value.trim()) && !(rel && /noopener|noreferrer/i.test(rel.value))) {
          add("unsafe-blank", "info", 'target="_blank" should also have rel="noopener"', target.from, target.to);
        }
      }
    }
  }

  /* ------------------------- brackets & quotes ------------------------- */
  function symbolChecks() {
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const closers = { ")": "(", "]": "[", "}": "{" };
    const stack = [];
    for (let i = 0; i < view.length; i++) {
      const ch = view[i];
      if (pairs[ch]) stack.push({ ch, i });
      else if (closers[ch]) {
        if (ch === ")" && /(?:^|[\s\u0001])(?:\d{1,2}|[A-Za-z])$/.test(view.slice(0, i)) && /^(?:\s|\u0001|$)/.test(view.slice(i + 1, i + 2))) continue; // "1)" list marker
        const top = stack[stack.length - 1];
        if (top && top.ch === closers[ch]) stack.pop();
        else add("unmatched-closer", "warning", `Unmatched "${ch}" — no matching "${closers[ch]}"`, i, i + 1);
      }
    }
    stack.forEach(({ ch, i }) => add("unclosed-symbol", "warning", `Unclosed "${ch}" — missing "${pairs[ch]}"`, i, i + 1));

    const straight = [...view.matchAll(/"/g)].map((m) => m.index);
    if (straight.length % 2 === 1) {
      const last = straight[straight.length - 1];
      add("unbalanced-quotes", "warning", 'Unbalanced double quotes (") — one is missing its pair', last, last + 1);
    }
    let depth = 0;
    const openCurly = [];
    for (let i = 0; i < view.length; i++) {
      if (view[i] === "\u201C") {
        depth++;
        openCurly.push(i);
      } else if (view[i] === "\u201D") {
        if (depth === 0) add("unbalanced-quotes", "warning", "Closing curly quote ” has no opening “", i, i + 1);
        else {
          depth--;
          openCurly.pop();
        }
      }
    }
    openCurly.forEach((i) => add("unbalanced-quotes", "warning", "Opening curly quote “ is never closed", i, i + 1));

    if (straight.length && /[\u201C\u201D]/.test(view)) {
      add("mixed-quotes", "info", "Straight (\") and curly (“ ”) double quotes are mixed in this field", straight[0], straight[0] + 1);
    }
    const straightApos = view.match(/\w'\w/);
    if (straightApos && /\w\u2019\w/.test(view)) {
      const i = view.indexOf(straightApos[0]) + 1;
      add("mixed-quotes", "info", "Straight (') and curly (’) apostrophes are mixed in this field", i, i + 1);
    }
  }

  /* ------------------------ text formatting rules ---------------------- */
  function formattingChecks() {
    scan(value, SPECIAL_CHAR_RE, (m) => {
      const [name, replacement] = SPECIAL_CHARS[m[0]];
      const code = "U+" + m[0].charCodeAt(0).toString(16).toUpperCase().padStart(4, "0");
      add("special-space", "error", `Invisible character ${code} (${name}) — ${replacement === "" ? "remove it" : "replace with a normal space"}`, m.index, m.index + 1, [
        { from: m.index, to: m.index + 1, insert: replacement },
      ]);
    });

    scan(value, /&(?:nbsp|#160|#xa0);/gi, (m) => {
      const glue = /\s/.test(value[m.index - 1] || "") || /\s/.test(value[m.index + m[0].length] || "") ? "" : " ";
      add("nbsp", "error", "Non-breaking space (&nbsp;) — use a regular space", m.index, m.index + m[0].length, [
        { from: m.index, to: m.index + m[0].length, insert: glue },
      ]);
    });

    scan(view, /(?<=\S)( {2,})(?=(?:\S|$))/g, (m) => {
      const prevCh = view[m.index - 1];
      const nextCh = view[m.index + m[0].length];
      if (prevCh === FILL && nextCh === FILL) return; // indentation between tags
      if (nextCh === undefined || nextCh === "\n") return; // trailing spaces
      add("multi-space", "warning", `${m[0].length} consecutive spaces — use one`, m.index, m.index + m[0].length, [
        { from: m.index, to: m.index + m[0].length, insert: " " },
      ]);
    });

    scan(view, /[A-Za-z],(?=[A-Za-z])/g, (m) => {
      add("comma-space", "warning", "Missing space after comma", m.index, m.index + 2, rep(m, ", ", 1, 1));
    });
    scan(view, /(?<=[A-Za-z0-9)])([ \t]+)(?=[,;])/g, (m) => {
      add("space-before-punct", "warning", "Space before comma/semicolon", m.index, m.index + m[0].length, rep(m, ""));
    });

    scan(view, /[!?]{2,}/g, (m) =>
      add("multi-punct", "warning", `Repeated punctuation “${m[0]}” — use one`, m.index, m.index + m[0].length, rep(m, m[0][0])));
    scan(view, /,{2,}/g, (m) =>
      add("multi-punct", "warning", "Repeated commas — use one", m.index, m.index + m[0].length, rep(m, ",")));
    scan(view, /(?<!\.)\.\.(?!\.)/g, (m) =>
      add("multi-punct", "warning", 'Two periods in a row — use one period (or "…")', m.index, m.index + 2, rep(m, ".")));

    const entities = { "\u2122": "&trade;", "\u00AE": "&reg;", "\u00A9": "&copy;" };
    scan(view, /[\u2122\u00AE\u00A9]/g, (m) =>
      add("trademark-entity", "warning", `Use the HTML entity ${entities[m[0]]} instead of the ${m[0]} character`, m.index, m.index + 1, rep(m, entities[m[0]])));
  }

  /* --------------------------- money & numbers ------------------------- */
  function moneyChecks() {
    scan(view, /\$\$/g, (m) => add("double-dollar", "error", "Double dollar sign ($$) — use a single $", m.index, m.index + 2, rep(m, "$")));
    scan(view, /%%/g, (m) => add("double-percent", "error", "Double percent sign (%%) — use a single %", m.index, m.index + 2, rep(m, "%")));

    scan(view, /\$\s+\d/g, (m) =>
      add("dollar-space", "error", "Space between $ and the amount", m.index, m.index + m[0].length, rep(m, "$" + m[0].slice(-1))));
    scan(view, /\d[ \t]+\$(?!\d)/g, (m) =>
      add("dollar-space", "warning", "Space between a number and $ — write the amount as $50", m.index, m.index + m[0].length));

    scan(view, /\$\d{4,}(?:\.\d+)?(?![\d,])/g, (m) => {
      const [int, dec] = m[0].slice(1).split(".");
      const fixed = "$" + addCommas(int) + (dec !== undefined ? "." + dec : "");
      add("large-number", "error", `Large number needs a thousands comma → use ${fixed}`, m.index, m.index + m[0].length, rep(m, fixed));
    });
    scan(view, /\$\d{1,3}(?:,\d{3})*,(?:\d{1,2}|\d{4,})(?!\d)/g, (m) =>
      add("number-separator", "warning", "Check the thousands separator in this amount", m.index, m.index + m[0].length));

    scan(view, /\$\d[\d,]*(?:\.\d+)?(?:\/\$?\d[\d,]*(?:\.\d+)?){2,}/g, (m) => {
      const nums = m[0].split("/").map((s) => (s.startsWith("$") ? s : "$" + s));
      const prefix = /up to\s*$/i.test(view.slice(Math.max(0, m.index - 7), m.index)) ? "" : "up to ";
      add("amount-tier", "warning", `Use "up to ${nums.join(", ")}" instead of slashes for amount tiers`, m.index, m.index + m[0].length, rep(m, prefix + nums.join(", ")));
    });

    scan(view, /\$\d+(?:\.\d+)?[km]\b/g, (m) => {
      const up = m[0].slice(0, -1) + m[0].slice(-1).toUpperCase();
      add("k-shorthand", "warning", `Use uppercase K/M for thousands/millions → ${up}`, m.index, m.index + m[0].length, rep(m, up));
    });

    scan(view, /\d[ \t]+%/g, (m) =>
      add("percent-space", "warning", "Space before the % sign", m.index, m.index + m[0].length, rep(m, m[0][0] + "%")));
    scan(view, /\b\d+(?:\.\d+)?\s*percent\b/gi, (m) => {
      const n = m[0].match(/^\d+(?:\.\d+)?/)[0];
      add("percent-word", "info", `Use the % symbol instead of spelling out “percent” → ${n}%`, m.index, m.index + m[0].length, rep(m, n + "%"));
    });

    const multipliers = [...view.matchAll(/\b\d+(?:\.\d+)?([xX])\b/g)];
    if (multipliers.length > 1) {
      const lower = multipliers.filter((m) => m[1] === "x").length;
      const keep = lower >= multipliers.length - lower ? "x" : "X";
      multipliers.filter((m) => m[1] !== keep).forEach((m) => {
        add("multiplier-case", "warning", `Inconsistent multiplier casing — other values in this field use “${keep}”`, m.index, m.index + m[0].length, rep(m, m[0].slice(0, -1) + keep));
      });
    }

    // numbers near money keywords that are probably missing "$"
    const keywords = "bonus(?:es)?|deposit|wager|risk[- ]free|rewards?|cash\\s?back|match|free\\s+bets?|credits?";
    const re = new RegExp(`\\b(${keywords})\\b[^$\\d%\\n]{0,15}?(\\d{1,3}(?:,\\d{3})*(?:\\.\\d+)?)\\b(%)?`, "gid");
    let m;
    while ((m = re.exec(view)) !== null) {
      if (m[3]) continue;
      const [nFrom, nTo] = m.indices[2];
      const after = view.slice(nTo, nTo + 24);
      const around = view[nFrom - 1] + (view[nTo] || "");
      if (/[:/.,]/.test(around[0]) || /^[:/]/.test(after)) continue; // times, dates, decimals
      if (/^\s*(?:x\b|times\b|days?\b|hours?\b|hrs?\b|minutes?\b|mins?\b|spins?\b|free\s+spins?\b|games?\b|players?\b|tickets?\b|points?\b|entries\b|winners?\b|bets?\b|percent\b|per\b|%)/i.test(after)) continue;
      const digits = m[2].replace(/,/g, "");
      if (digits.length === 4 && +digits >= 1900 && +digits <= 2100) continue; // year
      add("missing-dollar", "warning", `Possible missing "$" before ${m[2]} (near “${m[1]}”)`, nFrom, nTo, [
        { from: nFrom, to: nFrom, insert: "$" },
      ]);
    }
  }

  /* -------------------------------- dates ------------------------------ */
  function dateChecks() {
    // times
    scan(view, /\b(\d{1,2})(?::([0-5]\d)(?::([0-5]\d))?)?\s?([AaPp])\.?([Mm])\b\.?/g, (m) => {
      const text = m[0].replace(/\.$/, "");
      const end = m.index + text.length;
      if (/^(0?[1-9]|1[0-2]):[0-5]\d(?::[0-5]\d)? (AM|PM)$/.test(text)) return;
      const hour = parseInt(m[1], 10);
      const ap = m[4].toUpperCase() + "M";
      if (hour < 1 || hour > 12) {
        add("time-format", "error", `Invalid hour in 12-hour time “${text}”`, m.index, end);
        return;
      }
      const suggestion = `${m[1]}:${m[2] || "00"}${m[3] ? ":" + m[3] : ""} ${ap}`;
      add("time-format", "warning", `Incorrect time format — use HH:MM AM/PM → ${suggestion}`, m.index, end,
        text.includes(FILL) ? undefined : [{ from: m.index, to: end, insert: suggestion }]);
    });
    scan(view, /\b\d{1,2}:[0-5]\d\s?(?:E[SD]?T|C[SD]?T|M[SD]?T|P[SD]?T)\b/g, (m) =>
      add("time-no-meridiem", "warning", `Time with a time zone but no AM/PM → “${m[0]}” (e.g. 12:00 PM ET)`, m.index, m.index + m[0].length));

    // named dates (with optional weekday)
    const named = [];
    const namedRe = new RegExp(
      `\\b(?:(${WEEKDAY_PATTERN})\\.?,?\\s+)?(${MONTH_PATTERN})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
      "gid",
    );
    let m;
    while ((m = namedRe.exec(view)) !== null) {
      if (m[2].toLowerCase() === "may" && m[2][0] !== "M") continue;
      const mi = monthIndex(m[2]);
      const day = parseInt(m[3], 10);
      const year = m[4] ? parseInt(m[4], 10) : null;
      const text = m[0];
      named.push({ index: m.index, text, month: m[2], full: m[2].length > 4 && m[2].toLowerCase() !== "sept" });
      if (day < 1 || day > daysInMonth(mi, year ?? 2000)) {
        add("date-invalid", "error", `“${m[2]} ${m[3]}” isn't a real date`, m.index, m.index + text.length);
        continue;
      }
      if (m[1] && year !== null) {
        const actual = new Date(Date.UTC(year, mi, day)).getUTCDay();
        if (weekdayIndex(m[1]) !== actual) {
          const longName = WEEKDAYS[actual][0].toUpperCase() + WEEKDAYS[actual].slice(1);
          const fixedName = m[1].length > 4 ? longName : longName.slice(0, 3);
          const [wFrom, wTo] = m.indices[1];
          add("date-weekday", "error", `${m[2]} ${day}, ${year} falls on a ${longName}, not “${m[1]}”`, m.index, m.index + text.length,
            [{ from: wFrom, to: wTo, insert: fixedName }]);
        }
      }
    }

    // numeric dates M/D/YYYY
    const numeric = [];
    scan(view, /(?<![\d$/.])\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b(?![/\d])/g, (nm) => {
      numeric.push(nm);
      const a = parseInt(nm[1], 10);
      const b = parseInt(nm[2], 10);
      const y = nm[3].length === 2 ? 2000 + parseInt(nm[3], 10) : parseInt(nm[3], 10);
      const end = nm.index + nm[0].length;
      if (a > 12 && b <= 12) {
        add("date-invalid", "error", `“${nm[0]}” looks like day/month — use month/day/year`, nm.index, end,
          nm[0].includes(FILL) ? undefined : [{ from: nm.index, to: end, insert: `${nm[2]}/${nm[1]}/${nm[3]}` }]);
      } else if (a < 1 || a > 12 || b < 1 || b > daysInMonth(a - 1, y)) {
        add("date-invalid", "error", `“${nm[0]}” isn't a real date`, nm.index, end);
      }
    });

    if (numeric.length && named.length) {
      const first = numeric[0];
      add("date-mixed", "warning", `Inconsistent date formats in this field → “${first[0]}” vs “${named[0].text}”`, first.index, first.index + first[0].length);
    }
    const fullCount = named.filter((d) => d.full).length;
    if (named.length > 1 && fullCount > 0 && fullCount < named.length) {
      const abbr = named.find((d) => !d.full);
      add("date-month-style", "info", "Month names mix full (October) and abbreviated (Oct.) styles in this field", abbr.index, abbr.index + abbr.text.length);
    }
  }

  /* ------------------------------ content ------------------------------ */
  function contentChecks() {
    scan(view, /OLG\s+Internal\s+Control\s+Trigger\s+Based/gi, (m) =>
      add("olg-line", "warning", "Contains OLG line (remove for non-NJ states)", m.index, m.index + m[0].length));
    scan(view, /\(Link to [^)]+\)/gi, (m) =>
      add("link-placeholder-text", "error", `Placeholder “${m[0]}” — replace with real link text or remove`, m.index, m.index + m[0].length));
    scan(view, /\b[A-Za-z]{2,}(?<!s)s\(s\)/gi, (m) => {
      const word = m[0].slice(0, -3);
      const good = word.slice(0, -1) + "(s)";
      add("plural", "warning", `Incorrect plural form “${m[0]}” — use “${good}”`, m.index, m.index + m[0].length, /es$/i.test(word) ? undefined : rep(m, good));
    });

    for (const brand of BRANDS) {
      const re = new RegExp(`\\b${brand.replace(/(?<=[a-z])(?=[A-Z])/g, "\\s*")}\\b`, "gi");
      scan(view, re, (m) => {
        if (m[0] === brand) return;
        if (/^\.[a-z]/i.test(view.slice(m.index + m[0].length, m.index + m[0].length + 2))) return; // domain name
        if (view[m.index - 1] === "@") return;
        add("brand-casing", "error", `Incorrect brand casing — should be “${brand}”`, m.index, m.index + m[0].length, rep(m, brand));
      });
    }

    scan(spaced, /\b([A-Za-z]+)[ \t\r\n]+\1\b/gi, (m) => {
      const sameText = value.slice(m.index, m.index + m[0].length) === m[0];
      add("repeated-word", "warning", `Repeated word “${m[1]}”`, m.index, m.index + m[0].length,
        sameText ? [{ from: m.index, to: m.index + m[0].length, insert: m[1] }] : undefined);
    });

    scan(view, /\b(\d+)(st|nd|rd|th)\b/gi, (m) => {
      const n = parseInt(m[1], 10);
      const expected = ordinalSuffix(n);
      const end = m.index + m[0].length;
      const inSup = value.slice(Math.max(0, m.index - 5), m.index).toLowerCase() === "<sup>" || value.slice(end, end + 6).toLowerCase() === "</sup>";
      const wrong = m[2].toLowerCase() !== expected;
      if (wrong) {
        add("ordinal-suffix", "error", `Wrong ordinal suffix — ${m[1]} should be ${m[1]}${expected}`, m.index, end,
          [{ from: m.index, to: end, insert: inSup ? m[1] + expected : `${m[1]}<sup>${expected}</sup>` }]);
      } else if (!inSup) {
        add("ordinal-sup", "warning", `Ordinal missing <sup> tag (e.g., ${m[1]}<sup>${m[2].toLowerCase()}</sup>)`, m.index, end,
          [{ from: m.index, to: end, insert: `${m[1]}<sup>${m[2].toLowerCase()}</sup>` }]);
      }
    });

    // Tile header must agree with the number of game tiles (links containing "launchng")
    const tiles = tokens.filter((t) => t.type === "open" && t.name === "a" && t.attrs.some((a) => a.name === "href" && /launchng/i.test(a.value))).length;
    if (tiles > 0) {
      const plural = tiles > 1;
      scan(view, /Click\s+(Tiles?)\s+Below\s+To\s+Play\s+Eligible\s+(Games?)/gi, (m) => {
        const tilesPlural = /s$/i.test(m[1]);
        const gamesPlural = /s$/i.test(m[2]);
        if (tilesPlural === plural && gamesPlural === plural) return;
        const canonical = plural ? "Click Tiles Below To Play Eligible Games" : "Click Tile Below To Play Eligible Game";
        add("tile-header", "error", `${tiles} tile${plural ? "s" : ""} detected, but the header is ${tilesPlural ? "plural" : "singular"} — should read “${canonical}”`, m.index, m.index + m[0].length, rep(m, canonical));
      });
    }
  }

  /* ----------------------- repeated sentences -------------------------- */
  function sentenceChecks() {
    const cuts = [0, spaced.length];
    for (const t of tokens) {
      if (t.type === "close" && /^(p|li|div|h[1-6]|td|th|blockquote)$/.test(t.name)) cuts.push(t.to);
    }
    scan(spaced, /\n[ \t]*\n/g, (m) => cuts.push(m.index + m[0].length));
    const bounds = [...new Set(cuts)].sort((a, b) => a - b);

    for (let b = 0; b < bounds.length - 1; b++) {
      const segStart = bounds[b];
      const seg = spaced.slice(segStart, bounds[b + 1]);
      const seen = new Set();
      scan(seg, /[\s\S]+?(?:[.!?]+(?=\s|$)|$)/g, (m) => {
        const lead = m[0].length - m[0].trimStart().length;
        const text = m[0].trim();
        const key = text.replace(/\s+/g, " ").toLowerCase();
        if (key.length <= 8 || !/[a-z]/i.test(key)) return;
        const from = segStart + m.index + lead;
        const to = from + text.length;
        if (seen.has(key)) {
          const plain = value.slice(from, to) === text;
          add("repeated-sentence", "warning", "Sentence is repeated in the same paragraph", from, to,
            plain ? [{ from: Math.max(segStart, from - (/\s/.test(value[from - 1] || "") ? 1 : 0)), to, insert: "" }] : undefined);
        }
        seen.add(key);
      });
    }
  }

  return { issues, tokens, add, locate };
}

/* -------------------------------------------------------------------------- */
/* Public API                                                                  */
/* -------------------------------------------------------------------------- */

const sortIssues = (a, b) => a.from - b.from || SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];

export function analyzeField(field, value) {
  if (!value || !value.trim()) return [];
  return analyzeInternal(field, value).issues.sort(sortIssues);
}

export function summarize(issues) {
  const summary = { error: 0, warning: 0, info: 0, total: issues.length };
  issues.forEach((i) => summary[i.severity]++);
  return summary;
}

/** Analyze every field, plus checks that need to see all fields together. */
export function analyzeFields(inputs) {
  const entries = Object.entries(inputs).map(([field, value]) => {
    const text = value || "";
    if (!text.trim()) return { field, text, empty: true, issues: [], tokens: [] };
    const r = analyzeInternal(field, text);
    return { field, text, ...r };
  });

  // <strong>/<b> and <em>/<i> consistency across all fields
  const isIcon = (t) => t.name === "i" && t.attrs.some((a) => a.name === "class");
  const pairs = [
    ["strong", "b", "bold"],
    ["em", "i", "italic"],
  ];
  for (const [semantic, visual, label] of pairs) {
    const pick = (name) =>
      entries.flatMap((e) =>
        e.tokens.filter((t) => t.type === "open" && t.name === name && !isIcon(t)).map((t) => ({ e, t })),
      );
    const a = pick(semantic);
    const b = pick(visual);
    if (!a.length || !b.length) continue;
    const [minority, keep] = b.length <= a.length ? [b, semantic] : [a, visual];
    minority.forEach(({ e, t }) => {
      const edits = [{ from: t.nameFrom, to: t.nameTo, insert: keep }];
      if (t.pair) edits.push({ from: t.pair.nameFrom, to: t.pair.nameTo, insert: keep });
      e.add("emphasis-mix", "warning", `Mixed ${label} tags: <${t.name}> is used here but <${keep}> is used elsewhere — pick one`, t.from, t.to, t.pair ? edits : undefined);
    });
  }

  const order = Object.keys(inputs);
  const issues = entries.flatMap((e) => e.issues.sort(sortIssues));
  issues.sort((x, y) => order.indexOf(x.field) - order.indexOf(y.field) || sortIssues(x, y));
  return { issues, summary: summarize(issues) };
}

/** Merge an issue's fix (or a batch of fixes) into non-overlapping edits. */
export function collectEdits(issues) {
  const edits = issues
    .flatMap((i) => i.fix || [])
    .sort((a, b) => a.from - b.from || a.to - b.to);
  const out = [];
  let end = -1;
  for (const e of edits) {
    if (e.from < end) continue; // overlaps a previous edit
    out.push(e);
    end = Math.max(end, e.to);
  }
  return out;
}

export function applyFixes(value, issues) {
  const edits = collectEdits(issues);
  let out = "";
  let pos = 0;
  for (const e of edits) {
    out += value.slice(pos, e.from) + e.insert;
    pos = e.to;
  }
  return { value: out + value.slice(pos), applied: edits.length };
}

/** Compare what the user typed/pasted with the value stored in Sitecore. */
export function compareWithSource(input, source) {
  if (source === undefined || source === null) return { status: "unknown" };
  if (!input) return { status: "empty" };
  const a = input.replace(/\r\n/g, "\n");
  const b = String(source).replace(/\r\n/g, "\n");
  if (a === b) return { status: "match" };
  if (a.trim() === b.trim()) return { status: "diff", from: Math.max(0, Math.min(a.length, a.length - a.trimStart().length)), to: 1, message: "Differs only by leading/trailing whitespace", whitespaceOnly: true };
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  const upto = a.slice(0, i);
  const line = upto.split("\n").length;
  const col = i - (upto.lastIndexOf("\n") + 1) + 1;
  const found = a.slice(i, i + 24).replace(/\n/g, "↵");
  const wanted = b.slice(i, i + 24).replace(/\n/g, "↵");
  return {
    status: "diff",
    from: Math.min(i, Math.max(0, a.length - 1)),
    to: Math.min(i + Math.max(1, Math.min(found.length, 12)), a.length),
    line,
    col,
    message: `First difference at line ${line}, col ${col}: Sitecore has “${wanted || "(end)"}” but this has “${found || "(end)"}”`,
  };
}
