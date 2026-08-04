import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { SERIES, createDefaultPatternState } from "../src/pattern-studio/pattern-data.js";
import { createPatternSnapshot, encodePatternShare } from "../src/pattern-studio/pattern-share.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = resolve(root, "public", "textures", "curated", "blankets");
const outputFile = resolve(outputDirectory, "curated_list.json");
const seeds = [1042, 7319, 18444, 28701, 39017, 46288, 53812, 61904, 70431, 81620, 90377, 99421];

await mkdir(outputDirectory, { recursive: true });

const seriesHashes = Object.fromEntries(
  SERIES.map((series) => [series.id, seeds.map((seed, index) => {
    const state = createDefaultPatternState();
    const paletteIndex = index % series.palettes.length;
    const palette = series.palettes[paletteIndex];
    state.seriesId = series.id;
    state.seed = seed + Number(series.id.slice(2));
    state.paletteIndexesBySeriesId[series.id] = paletteIndex;
    state.paletteValuesBySeriesId[series.id] = {
      bg: palette.bg,
      colors: [...palette.colors],
    };
    return {
      id: `${series.id}-${String(index + 1).padStart(2, "0")}`,
      name: `Edition ${String(index + 1).padStart(2, "0")}`,
      hash: encodePatternShare(createPatternSnapshot(state)),
    };
  })]),
);

const manifest = {
  version: 1,
  productId: "blankets",
  series: seriesHashes,
};

await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`Wrote ${SERIES.length} curated blanket series to ${outputFile}`);
