import { readFile } from "node:fs/promises";
import { basename } from "node:path";
import { readEnvironmentFile } from "../src/haptique-features.js";

const fixtures = [
  "assets/reference-textures/golden_gate_hills_2k.hdr",
  "assets/reference-textures/golden_gate_hills_2k.exr",
];

for (const path of fixtures) {
  const bytes = await readFile(path);
  const source = await readEnvironmentFile(new File([bytes], basename(path)));
  console.log(`${basename(path)}: ${source.kind} ${source.width}x${source.height}`);
}
