import assert from "node:assert/strict";
import test from "node:test";

import { getProductFormat } from "../src/data/product-catalog.js";
import {
  PRINT_LAYOUTS,
  TOTE_AOP_MEDIUM_PRESET,
  getMirroredToteGeometry,
} from "../src/pattern-studio/print-layouts.js";

test("medium tote uses the Printify production sheet", () => {
  const format = getProductFormat("tote", "16 × 16 in");
  assert.equal(format.width, 2625);
  assert.equal(format.height, 5250);
  assert.equal(format.dpi, 150);
  assert.equal(format.artworkWidth, 2400);
  assert.equal(format.artworkHeight, 2280);
});

test("medium tote mirrors two faces through the center gusset", () => {
  const layout = PRINT_LAYOUTS[TOTE_AOP_MEDIUM_PRESET];
  assert.deepEqual(getMirroredToteGeometry(layout), {
    width: 2625,
    height: 5250,
    halfHeight: 2625,
    faceHeight: 2494,
    bleedHeight: 131,
    bottomFaceY: 2756,
  });

  const preview = getMirroredToteGeometry(layout, 800, 1600);
  assert.equal(preview.faceHeight, 760);
  assert.equal(preview.bleedHeight, 40);
  assert.equal(preview.bottomFaceY, 840);
});
