// Sitecore display conditions, as used by the "condition" field of items and by data-content-filter attributes:
//   NOT User.LoggedIn
//   Device.IsMobile AND NOT Device.IsAndroid
//   App.Label = 'borgataonline.com'
//   App.Label IN ['pa.borgataonline.com', 'on.betmgm.ca']
//   Request.AbsolutePath CONTAINS '/casino/'
//   Request.Host MATCHES 'promo.betmgm.com'
// Understands AND / OR / NOT and parentheses. Anything it can't evaluate counts as true (the item stays visible)
// and is added to `unknown`.

/**
 * @param {string} expr
 * @param {{ loggedIn?: boolean, label?: string, mobile?: boolean, android?: boolean, ios?: boolean, absolutePath?: string, host?: string }} ctx
 *   loggedIn – User.LoggedIn · label – App.Label (the site, e.g. "borgataonline.com") · mobile/android/ios – Device.IsMobile / IsAndroid / IsIOS
 *   absolutePath / host – Request.AbsolutePath (e.g. "/en/promo/lan/casino/thanksgiving") / Request.Host (e.g. "www.borgataonline.com")
 * @param {string[]} unknown receives the atoms that couldn't be evaluated
 */
export function evalCondition(expr, ctx = {}, unknown = []) {
  const text = (expr || "").trim();
  if (!text) return true;
  // Operators, parentheses, and atoms. Quoted strings are part of an atom (they may hold parentheses, AND, ...).
  const tokens =
    text.match(/\(|\)|\bAND\b|\bOR\b|\bNOT\b|(?:[^()\s'"]|'[^']*'|"[^"]*")(?:'[^']*'|"[^"]*"|[^()'"])*?(?=\s+(?:AND|OR)\b|\)|$)/gi) || [];
  let i = 0;

  const flags = {
    "user.loggedin": !!ctx.loggedIn,
    "device.ismobile": !!ctx.mobile,
    "device.isandroid": !!ctx.android,
    "device.isios": !!ctx.ios,
  };

  const atom = (raw) => {
    const t = raw.trim();
    const flag = flags[t.toLowerCase()];
    if (flag !== undefined) return flag;

    // App.Label = 'x'   /   App.Label IN ['a', 'b']
    const label = String(ctx.label ?? "").toLowerCase();
    const eq = /^App\.Label\s*==?\s*(['"])(.*?)\1$/i.exec(t);
    if (eq) return label === eq[2].toLowerCase();
    const inList = /^App\.Label\s+IN\s*\[([^\]]*)\]$/i.exec(t);
    if (inList) return [...inList[1].matchAll(/(['"])(.*?)\1/g)].some((m) => m[2].toLowerCase() === label);

    // Request.AbsolutePath CONTAINS '/casino/'   /   Request.Host MATCHES 'promo.betmgm.com'
    const req = /^Request\.(AbsolutePath|Host)\s+(CONTAINS|MATCHES|STARTSWITH|ENDSWITH|==?|!=)\s*(['"])(.*?)\3$/i.exec(t);
    if (req) {
      const actual = String((req[1].toLowerCase() === "host" ? ctx.host : ctx.absolutePath) ?? "").toLowerCase();
      const wanted = req[4].toLowerCase();
      switch (req[2].toUpperCase()) {
        case "CONTAINS": return actual.includes(wanted);
        case "STARTSWITH": return actual.startsWith(wanted);
        case "ENDSWITH": return actual.endsWith(wanted);
        case "!=": return actual !== wanted;
        case "MATCHES":
          try {
            return new RegExp(req[4], "i").test(actual);
          } catch {
            return actual === wanted;
          }
        default: return actual === wanted;
      }
    }

    unknown.push(t);
    return true;
  };
  const primary = () => {
    const t = tokens[i++];
    if (t === undefined) return true;
    if (/^NOT$/i.test(t)) return !primary();
    if (t === "(") {
      const v = or();
      if (tokens[i] === ")") i++;
      return v;
    }
    return atom(t);
  };
  const and = () => {
    let v = primary();
    while (/^AND$/i.test(tokens[i] || "")) {
      i++;
      const r = primary();
      v = v && r;
    }
    return v;
  };
  const or = () => {
    let v = and();
    while (/^OR$/i.test(tokens[i] || "")) {
      i++;
      const r = and();
      v = v || r;
    }
    return v;
  };
  return or();
}
