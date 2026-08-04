import { SERIES_BY_ID } from "./pattern-data.js";

const SHARE_PREFIX = "hq1_";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function roundToStep(value, min, step) {
  if (!step) return value;
  const precision = Math.max(0, (String(step).split(".")[1] || "").length);
  return Number((min + Math.round((value - min) / step) * step).toFixed(precision));
}

function sanitizeAttributes(series, incoming, fallback) {
  return Object.fromEntries(
    series.parameters.map((parameter) => {
      const value = incoming?.[parameter.key];
      if (parameter.options) {
        return [
          parameter.key,
          parameter.options.includes(value) ? value : (fallback?.[parameter.key] ?? parameter.value),
        ];
      }
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return [parameter.key, fallback?.[parameter.key] ?? parameter.value];
      const clamped = Math.min(parameter.max, Math.max(parameter.min, numeric));
      return [parameter.key, roundToStep(clamped, parameter.min, parameter.step)];
    }),
  );
}

export function createPatternSnapshot(state) {
  const series = SERIES_BY_ID[state.seriesId];
  if (!series) throw new Error("This design uses a series that is not available.");
  const paletteIndex = Math.min(
    series.palettes.length - 1,
    Math.max(0, Math.round(state.paletteIndexesBySeriesId?.[state.seriesId] ?? 0)),
  );
  const palette = state.paletteValuesBySeriesId?.[state.seriesId] || series.palettes[paletteIndex];

  return {
    version: 1,
    seriesId: state.seriesId,
    seed: Math.max(0, Math.min(999999, Math.round(Number(state.seed) || 0))),
    paletteIndex,
    palette: {
      bg: palette.bg,
      colors: [...palette.colors],
    },
    attributes: { ...state.parametersBySeriesId?.[state.seriesId] },
  };
}

export function encodePatternShare(snapshot) {
  const compact = {
    v: 1,
    s: snapshot.seriesId,
    n: snapshot.seed,
    i: snapshot.paletteIndex,
    p: [snapshot.palette.bg, ...snapshot.palette.colors],
    a: snapshot.attributes,
  };
  return `${SHARE_PREFIX}${bytesToBase64Url(new TextEncoder().encode(JSON.stringify(compact)))}`;
}

export function decodePatternShare(input) {
  let value = String(input || "").trim();
  if (!value) throw new Error("Paste a Haptique design hash or share link.");

  try {
    const url = new URL(value);
    value = url.hash || url.searchParams.get("design") || value;
  } catch {
    // A share hash is expected to fail URL parsing.
  }
  value = value.replace(/^#/, "");
  if (value.startsWith("design=")) value = value.slice("design=".length);
  value = decodeURIComponent(value);

  if (/^\d{1,6}$/.test(value)) {
    return { version: 0, seed: Number(value) };
  }
  if (!value.startsWith(SHARE_PREFIX)) throw new Error("That is not a Haptique design hash.");

  let compact;
  try {
    compact = JSON.parse(new TextDecoder().decode(base64UrlToBytes(value.slice(SHARE_PREFIX.length))));
  } catch {
    throw new Error("That design hash is damaged or incomplete.");
  }
  if (compact.v !== 1 || !SERIES_BY_ID[compact.s] || !Array.isArray(compact.p) || !compact.a) {
    throw new Error("That design hash is not supported.");
  }

  return {
    version: 1,
    seriesId: compact.s,
    seed: compact.n,
    paletteIndex: compact.i,
    palette: { bg: compact.p[0], colors: compact.p.slice(1) },
    attributes: compact.a,
  };
}

export function applyPatternSnapshot(state, snapshot) {
  if (snapshot.version === 0) {
    return { ...state, seed: Math.max(0, Math.min(999999, Math.round(snapshot.seed || 0))) };
  }

  const series = SERIES_BY_ID[snapshot.seriesId];
  if (!series) throw new Error("This design uses a series that is not available.");
  const paletteIndex = Math.min(
    series.palettes.length - 1,
    Math.max(0, Math.round(Number(snapshot.paletteIndex) || 0)),
  );
  const defaultPalette = series.palettes[paletteIndex];
  const colors = Array.isArray(snapshot.palette?.colors)
    ? snapshot.palette.colors.slice(0, defaultPalette.colors.length)
    : [];
  const palette = {
    bg: HEX_COLOR.test(snapshot.palette?.bg) ? snapshot.palette.bg : defaultPalette.bg,
    colors: defaultPalette.colors.map((color, index) =>
      HEX_COLOR.test(colors[index]) ? colors[index] : color,
    ),
  };

  return {
    ...state,
    seriesId: snapshot.seriesId,
    seed: Math.max(0, Math.min(999999, Math.round(Number(snapshot.seed) || 0))),
    paletteIndexesBySeriesId: {
      ...state.paletteIndexesBySeriesId,
      [snapshot.seriesId]: paletteIndex,
    },
    paletteValuesBySeriesId: {
      ...state.paletteValuesBySeriesId,
      [snapshot.seriesId]: palette,
    },
    parametersBySeriesId: {
      ...state.parametersBySeriesId,
      [snapshot.seriesId]: sanitizeAttributes(
        series,
        snapshot.attributes,
        state.parametersBySeriesId?.[snapshot.seriesId],
      ),
    },
  };
}

export function createPatternShareUrl(code, location = window.location) {
  return `${location.origin}${location.pathname}${location.search}#design=${code}`;
}
