import assert from "node:assert/strict";
import {
  PRINT_LAYOUTS,
  TOTE_AOP_MEDIUM_PRESET,
  getMirroredToteGeometry,
} from "../src/pattern-studio/print-layouts.js";

const layout = PRINT_LAYOUTS[TOTE_AOP_MEDIUM_PRESET];
const print = getMirroredToteGeometry(layout);

assert.deepEqual(print, {
  width: 2625,
  height: 5250,
  halfHeight: 2625,
  faceHeight: 2494,
  bleedHeight: 131,
  bottomFaceY: 2756,
});
assert.equal(print.faceHeight + print.bleedHeight, print.halfHeight);
assert.equal(print.bottomFaceY - print.bleedHeight, print.halfHeight);

const preview = getMirroredToteGeometry(layout, 800, 1600);
assert.equal(preview.faceHeight, 760);
assert.equal(preview.bleedHeight, 40);
assert.equal(preview.bottomFaceY, 840);

console.log("Medium tote layout geometry verified.");
