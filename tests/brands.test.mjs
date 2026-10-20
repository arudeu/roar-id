import test from "node:test";
import assert from "node:assert/strict";
import { detectBrand } from "../lib/brands.js";
import { analyzeFields, applyFixes, switchCtaDomain, switchCtaDomainInValues, compareWithSource } from "../lib/html-checks.js";

const path = (domain, product = "casino") =>
  `/vanilla.mobile/${domain}/mobileportal-v1.0/promotions/${product}/50k-halloween-leaderboard/50k-halloween-leaderboard`;

test("brand: site, product and colours come from the item path", () => {
  const b = detectBrand(path("m2.on.betmgm.ca"));
  assert.deepEqual(
    { domain: b.domain, name: b.name, category: b.category, bg: b.bg, fg: b.fg, detected: b.categoryDetected },
    { domain: "on.betmgm.ca", name: "BetMGM", category: "casino", bg: "#d4b962", fg: "#000000", detected: true },
  );
});

test("brand: colours per brand and product", () => {
  const colors = (d, p) => {
    const b = detectBrand(path(d, p));
    return `${b.bg} ${b.fg}`;
  };
  // BetMGM: casino, arcade and sports are gold/black, poker is green/white
  for (const p of ["casino", "arcade", "sports"]) assert.equal(colors("m2.nj.betmgm.com", p), "#d4b962 #000000");
  assert.equal(colors("m2.nj.betmgm.com", "poker"), "#00a35b #ffffff");
  assert.equal(colors("m2.playmgm.com", "casino"), "#d4b962 #000000");
  // Borgata Online
  assert.equal(colors("m2.borgataonline.com", "casino"), "#1F00AE #ffffff");
  assert.equal(colors("m2.pa.borgataonline.com", "arcade"), "#1F00AE #ffffff");
  assert.equal(colors("m2.borgataonline.com", "poker"), "#f47523 #ffffff");
  assert.equal(colors("m2.borgataonline.com", "sports"), "#5ac8e8 #ffffff");
  // single-colour brands ignore the product
  assert.equal(colors("m2.nj.partycasino.com", "casino"), "#f00a47 #ffffff");
  assert.equal(colors("m2.nj.partypoker.com", "poker"), "#e8490d #ffffff");
  assert.equal(colors("m2.on.wheeloffortunecasino.com", "casino"), "#efe700 #000000");
  assert.equal(colors("m2.wheeloffortunecasino.com", "casino"), "#efe700 #000000");
});

test("brand: mobile prefix is optional, unknown sites and empty paths give null", () => {
  assert.equal(detectBrand(path("on.betmgm.ca")).domain, "on.betmgm.ca");
  assert.equal(detectBrand(path("M2.ab.betmgm.ca")).domain, "ab.betmgm.ca");
  assert.equal(detectBrand(path("m2.example.com")), null);
  assert.equal(detectBrand(""), null);
  assert.equal(detectBrand(undefined), null);
});

test("brand: no product in the path falls back to the default colours", () => {
  const b = detectBrand("/vanilla.mobile/m2.on.betmgm.ca/mobileportal-v1.0/misc/thing");
  assert.equal(b.categoryDetected, false);
  assert.equal(b.bg, "#d4b962");
});

const html =
  '<p>Intro</p> <p> <a class="btn btn-primary" data-offer-id="1" data-offer-type="promos">Opt In</a> ' +
  '<a class="btn btn-primary" href="https://www.nj.betmgm.com/en/promo/lbpromo/2742331">See Rankings</a> </p>' +
  '<p>Drop it <a style="color: #d4b962;" href="https://www.nj.betmgm.com/en/promo/offers/grouped?filter=cb">here</a>.</p>' +
  '<img src="https://scmedia.nj.betmgm.com/$-$/5035a87023004a2c8595f304945ed6f7.jpg" alt="x" />';

test("switch: CTA links move to the detected site; media and plain links stay", () => {
  const out = switchCtaDomain(html, "on.betmgm.ca");
  assert.match(out, /href="https:\/\/www\.on\.betmgm\.ca\/en\/promo\/lbpromo\/2742331"/);
  // inline text link is not a CTA
  assert.match(out, /href="https:\/\/www\.nj\.betmgm\.com\/en\/promo\/offers\/grouped\?filter=cb"/);
  // images / media keep nj.betmgm.com
  assert.match(out, /src="https:\/\/scmedia\.nj\.betmgm\.com\//);
  // nothing else changed
  assert.equal(out.replace("www.on.betmgm.ca", "www.nj.betmgm.com").replace("on.betmgm.ca", "nj.betmgm.com"), html);
});

test("switch: no-ops and edge cases", () => {
  assert.equal(switchCtaDomain(html, "nj.betmgm.com"), html);
  assert.equal(switchCtaDomain(html, ""), html);
  assert.equal(switchCtaDomain("", "on.betmgm.ca"), "");
  const bare = '<a class="btn" href="http://nj.betmgm.com/x?y=1&amp;z=2">Go</a><a class="btn" href="https://scmedia.nj.betmgm.com/f.pdf">PDF</a>';
  assert.equal(
    switchCtaDomain(bare, "borgataonline.com"),
    '<a class="btn" href="http://borgataonline.com/x?y=1&amp;z=2">Go</a><a class="btn" href="https://scmedia.nj.betmgm.com/f.pdf">PDF</a>',
  );
});

test("checker: flags CTA links on the wrong site with an exact, fixable position", () => {
  const { issues } = analyzeFields({ detaileddescription: html }, { ctaDomain: "on.betmgm.ca" });
  const hits = issues.filter((i) => i.rule === "cta-domain");
  assert.equal(hits.length, 1);
  assert.equal(hits[0].severity, "error");
  assert.equal(html.slice(hits[0].from, hits[0].to), "nj.betmgm.com");
  assert.equal(applyFixes(html, hits).value, switchCtaDomain(html, "on.betmgm.ca"));
  // off by default, and quiet when the promotion really is on nj.betmgm.com
  assert.equal(analyzeFields({ detaileddescription: html }).issues.some((i) => i.rule === "cta-domain"), false);
  assert.equal(
    analyzeFields({ detaileddescription: html }, { ctaDomain: "nj.betmgm.com" }).issues.some((i) => i.rule === "cta-domain"),
    false,
  );
});

test("values: prefilled fields are switched, so they match the switched Sitecore value", () => {
  const fetched = { detaileddescription: html, promotiontitle: "$50K Halloween Leaderboard", steps: undefined };
  const values = switchCtaDomainInValues(fetched, "on.betmgm.ca");
  assert.equal(values.detaileddescription, switchCtaDomain(html, "on.betmgm.ca"));
  assert.equal(values.promotiontitle, fetched.promotiontitle);
  // the editor starts from the switched text and is compared with the same switched text: no "differs"
  assert.equal(compareWithSource(values.detaileddescription, values.detaileddescription).status, "match");
  // and the switched prefill raises no CTA-domain error
  assert.equal(
    analyzeFields({ detaileddescription: values.detaileddescription }, { ctaDomain: "on.betmgm.ca" }).issues.some((i) => i.rule === "cta-domain"),
    false,
  );
  // no brand: nothing changes
  assert.equal(switchCtaDomainInValues(fetched, undefined), fetched);
});

const tiles =
  '<p><a class="btn btn-primary" href="https://www.nj.betmgm.com/en/promo/lbpromo/26150145">SEE RANKINGS</a></p>' +
  '<p><strong>Click Tiles Below To Play Eligible Games:</strong></p>' +
  '<p> <a href="https://www.nj.betmgm.com/en/casino/launchng/LiveDealernespooycarnjp"><img alt="Spooky Carnival" src="https://casinogames.borgataonline.com/htmllobby/images/newlmticons/square/LiveDealernespooycarnjp.jpg" width="100" height="100"></a> ' +
  '<a href="https://www.nj.betmgm.com/en/casino/launchng/evoossbloodsuck2"><img alt="Blood Suckers II" src="https://casinogames.borgataonline.com/htmllobby/images/newlmticons/square/evoossbloodsuck2.jpg" width="100" height="100"></a> </p>' +
  '<p>Drop it <a style="color: #1f00ae;" href="https://www.nj.betmgm.com/en/promo/offers/grouped?filter=cb">here</a>.</p>' +
  '<img src="https://scmedia.nj.betmgm.com/$-$/fbd37c8cb5b64a028fcb87c60ede5e5f.jpg" alt="x" />';

test("tiles: game tile links switch with the CTAs (Borgata Online)", () => {
  const b = detectBrand("/vanilla.mobile/m2.borgataonline.com/mobileportal-v1.0/promotions/casino/halloween-40k-leaderboard/halloween-40k-leaderboard");
  assert.deepEqual([b.domain, b.bg, b.fg], ["borgataonline.com", "#1F00AE", "#ffffff"]);

  const out = switchCtaDomain(tiles, b.domain);
  assert.match(out, /href="https:\/\/www\.borgataonline\.com\/en\/promo\/lbpromo\/26150145"/);
  assert.match(out, /href="https:\/\/www\.borgataonline\.com\/en\/casino\/launchng\/LiveDealernespooycarnjp"/);
  assert.match(out, /href="https:\/\/www\.borgataonline\.com\/en\/casino\/launchng\/evoossbloodsuck2"/);
  // tile images, media and the plain text link are untouched
  assert.equal((out.match(/casinogames\.borgataonline\.com/g) || []).length, 2);
  assert.match(out, /src="https:\/\/scmedia\.nj\.betmgm\.com\//);
  assert.match(out, /href="https:\/\/www\.nj\.betmgm\.com\/en\/promo\/offers\/grouped\?filter=cb"/);
  assert.equal((out.match(/nj\.betmgm\.com/g) || []).length, 2); // the "here" link and the scmedia image
});

test("tiles: the checker flags each tile and CTA, and one fix handles them all", () => {
  const { issues } = analyzeFields({ detaileddescription: tiles }, { ctaDomain: "borgataonline.com" });
  const hits = issues.filter((i) => i.rule === "cta-domain");
  assert.equal(hits.length, 3);
  assert.deepEqual(hits.map((h) => h.message.split(" link")[0]), ["CTA", "Game tile", "Game tile"]);
  hits.forEach((h) => assert.equal(tiles.slice(h.from, h.to), "nj.betmgm.com"));
  assert.equal(applyFixes(tiles, hits).value, switchCtaDomain(tiles, "borgataonline.com"));
});
