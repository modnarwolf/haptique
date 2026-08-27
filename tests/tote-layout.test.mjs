import assert from "node:assert/strict";
import test from "node:test";

import { getProductFormat } from "../src/data/product-catalog.js";
import { composeRotatedClockwise } from "../src/pattern-studio/p5-pattern-engine.js";
import {
  BLANKET_PRINT_PRESETS,
  PRINT_LAYOUTS,
  TOTE_AOP_MEDIUM_PRESET,
  getMirroredToteGeometry,
  getProductPrintPreset,
} from "../src/pattern-studio/print-layouts.js";

test("medium tote uses the Printify production sheet", () => {
  const format = getProductFormat("tote", "16 × 16 in");
  assert.equal(format.width, 2625);
  assert.equal(format.height, 5250);
  assert.equal(format.dpi, 150);
  assert.equal(format.artworkWidth, 2400);
  assert.equal(format.artworkHeight, 2280);
});

test("woven blanket edits vertically and exports to Printify's landscape dimensions", () => {
  const small = getProductFormat("blanket", "37 × 52 in");
  const large = getProductFormat("blanket", "60 × 80 in");
  assert.deepEqual([small.width, small.height], [4992, 3552]);
  assert.deepEqual([large.width, large.height], [7680, 5760]);
  assert.deepEqual([small.artworkWidth, small.artworkHeight], [3552, 4992]);
  assert.deepEqual([large.artworkWidth, large.artworkHeight], [5760, 7680]);
  assert.ok(small.aspectRatio < 1);
  assert.equal(
    getProductPrintPreset("blanket", "37 × 52 in"),
    BLANKET_PRINT_PRESETS["37 × 52 in"],
  );
});

test("blanket production artwork rotates 90 degrees clockwise", () => {
  const calls = [];
  const context = {
    save() { calls.push(["save"]); },
    setTransform(...args) { calls.push(["setTransform", ...args]); },
    clearRect(...args) { calls.push(["clearRect", ...args]); },
    translate(...args) { calls.push(["translate", ...args]); },
    rotate(...args) { calls.push(["rotate", ...args]); },
    drawImage(...args) { calls.push(["drawImage", ...args]); },
    restore() { calls.push(["restore"]); },
  };
  const canvas = { width: 4992, height: 3552, getContext: () => context };
  const artwork = { width: 3552, height: 4992 };
  composeRotatedClockwise(canvas, artwork);

  assert.deepEqual(calls.find(([name]) => name === "translate"), ["translate", 4992, 0]);
  assert.deepEqual(calls.find(([name]) => name === "rotate"), ["rotate", Math.PI / 2]);
  assert.deepEqual(
    calls.find(([name]) => name === "drawImage").slice(-4),
    [0, 0, 3552, 4992],
  );
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
