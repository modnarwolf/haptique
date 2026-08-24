import assert from "node:assert/strict";
import test from "node:test";
import {
  hasDesignHash,
  normalizePathname,
  pathForRoute,
  routeForPage,
  routeFromLocation,
  titleForRoute,
} from "../src/routing/app-routes.js";

test("maps public paths to app routes", () => {
  assert.deepEqual(routeFromLocation({ pathname: "/" }), { page: "shop", seriesId: null });
  assert.deepEqual(routeFromLocation({ pathname: "/studio" }), { page: "studio", seriesId: null });
  assert.deepEqual(routeFromLocation({ pathname: "/about/" }), { page: "about", seriesId: null });
  assert.deepEqual(routeFromLocation({ pathname: "/series/moire" }), { page: "series", seriesId: "sr0070" });
  assert.deepEqual(routeFromLocation({ pathname: "/studio/cut-ribbons" }), { page: "studio", seriesId: "sr0030" });
});

test("creates canonical, shareable paths", () => {
  assert.equal(pathForRoute(routeForPage("shop")), "/");
  assert.equal(pathForRoute(routeForPage("about")), "/about");
  assert.equal(pathForRoute(routeForPage("series", "sr0040")), "/series/loom");
  assert.equal(pathForRoute(routeForPage("studio", "sr0020")), "/studio/swatch");
});

test("keeps legacy recipe hashes opening in Studio", () => {
  assert.equal(hasDesignHash("#design=hq1_example"), true);
  assert.deepEqual(
    routeFromLocation({ pathname: "/", hash: "#design=hq1_example" }),
    { page: "studio", seriesId: null },
  );
});

test("falls back safely for unknown and malformed paths", () => {
  assert.equal(normalizePathname("//series//moire//"), "/series/moire");
  assert.deepEqual(
    routeFromLocation({ pathname: "/series/not-a-series" }),
    { page: "shop", seriesId: null, notFound: true },
  );
  assert.doesNotThrow(() => routeFromLocation({ pathname: "/series/%E0%A4%A" }));
});

test("provides route-specific document titles", () => {
  assert.equal(titleForRoute({ page: "series", seriesId: "sr0070" }), "Moiré Series — Haptique");
  assert.equal(titleForRoute({ page: "studio", seriesId: "sr0070" }), "Pattern Studio — Haptique");
});

