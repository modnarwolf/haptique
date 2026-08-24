import {
  CAMPAIGN_SERIES_BY_ID,
  CAMPAIGN_SERIES_BY_SLUG,
  STUDIO_SERIES_BY_SLUG,
  STUDIO_SERIES_SLUGS,
} from "../data/site-content.js";

export const PAGE_PATHS = Object.freeze({
  shop: "/",
  studio: "/studio",
  about: "/about",
});

export function normalizePathname(pathname = "/") {
  const withLeadingSlash = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const normalized = withLeadingSlash.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

export function hasDesignHash(hash = "") {
  return hash.startsWith("#design=");
}

function decodeSlug(value) {
  try {
    return decodeURIComponent(value).toLowerCase();
  } catch {
    return "";
  }
}

export function routeFromLocation(location = {}) {
  const pathname = normalizePathname(location.pathname || "/");
  if (hasDesignHash(location.hash)) return { page: "studio", seriesId: null };
  if (pathname === "/" || pathname === "/shop") return { page: "shop", seriesId: null };
  if (pathname === "/about") return { page: "about", seriesId: null };
  if (pathname === "/studio") return { page: "studio", seriesId: null };

  const studioMatch = pathname.match(/^\/studio\/([^/]+)$/);
  if (studioMatch) {
    const slug = decodeSlug(studioMatch[1]);
    return { page: "studio", seriesId: STUDIO_SERIES_BY_SLUG[slug] || null };
  }

  const seriesMatch = pathname.match(/^\/series\/([^/]+)$/);
  if (seriesMatch) {
    const slug = decodeSlug(seriesMatch[1]);
    const series = CAMPAIGN_SERIES_BY_SLUG[slug];
    if (series) return { page: "series", seriesId: series.id };
  }

  return { page: "shop", seriesId: null, notFound: true };
}

export function pathForRoute(route) {
  if (route.page === "series") {
    const series = CAMPAIGN_SERIES_BY_ID[route.seriesId];
    return series ? `/series/${series.slug}` : "/";
  }
  if (route.page === "studio" && route.seriesId) {
    const slug = STUDIO_SERIES_SLUGS[route.seriesId];
    return slug ? `/studio/${slug}` : "/studio";
  }
  return PAGE_PATHS[route.page] || "/";
}

export function routeForPage(page, seriesId = null) {
  if (page === "series" && !CAMPAIGN_SERIES_BY_ID[seriesId]) return { page: "shop", seriesId: null };
  return { page, seriesId };
}

export function titleForRoute(route) {
  if (route.page === "series") {
    const series = CAMPAIGN_SERIES_BY_ID[route.seriesId];
    return series ? `${series.name} Series — Haptique` : "Haptique — Creative software for real things";
  }
  if (route.page === "studio") return "Pattern Studio — Haptique";
  if (route.page === "about") return "About — Haptique";
  return "Haptique — Creative software for real things";
}
