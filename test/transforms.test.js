// Unit-test seam for Faunaform's pure data transforms.
//
// We import from js/transforms.js (DOM-free) rather than audio.js / signatures.js
// so the test runner never cascade-evaluates dom.js (which touches `document` at
// module load). audio.js's getBars()/measureSignal() are thin wrappers that feed
// live state + sensitivity gain into barsFromSpectrum()/measureSignal() here, so
// testing these cores tests the numerics those wrappers depend on.
import test from "node:test";
import assert from "node:assert/strict";
import {
  barsFromSpectrum,
  measureSignal,
  spectrumToBars,
  spectrumFeatures,
  barsDistance
} from "../js/transforms.js";

const BINS = 1024;
const BAR_COUNT = 96;

// --- synthetic inputs ---------------------------------------------------------

// Frequency-domain silence: every bin at 0.
const freqSilence = new Uint8Array(BINS);

// Time-domain silence: the analyser centers the waveform at 128, so a silent
// signal is all-128 (NOT all-0 — all-0 would read as full negative deflection).
const timeSilence = new Uint8Array(BINS).fill(128);

// Single tone: one bin pinned at full scale.
const singleTone = new Uint8Array(BINS);
singleTone[256] = 255;

// White noise: uniform pseudo-random, deterministic so the suite is repeatable.
// (mulberry32 — a small, well-distributed PRNG; a bare LCG's low bits are not
// uniform and would collapse most bins to 0.)
const whiteNoise = (() => {
  let s = 0x9e3779b9;
  const rand = () => {
    s |= 0; s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const arr = new Uint8Array(BINS);
  for (let i = 0; i < BINS; i++) arr[i] = Math.floor(rand() * 256);
  return arr;
})();

// Shaped spectrum: energy ramped toward the high bins (emphasized highs).
const emphasizedHighs = new Uint8Array(BINS);
for (let i = 0; i < BINS; i++) emphasizedHighs[i] = Math.round((i / (BINS - 1)) * 255);

// Mirror: emphasized lows, for relative comparisons.
const emphasizedLows = new Uint8Array(BINS);
for (let i = 0; i < BINS; i++) emphasizedLows[i] = Math.round((1 - i / (BINS - 1)) * 255);

const inRange01 = (x) => x >= 0 && x <= 1;

// --- barsFromSpectrum (core of audio.getBars) --------------------------------

test("barsFromSpectrum: silence yields all-zero bars", () => {
  const bars = barsFromSpectrum(freqSilence, BAR_COUNT, 1);
  assert.equal(bars.length, BAR_COUNT);
  assert.ok(bars.every((b) => b === 0), "every bar should be exactly 0");
});

test("barsFromSpectrum: output stays within [0, 1] for any input/gain", () => {
  for (const gain of [0.5, 1, 4, 100]) {
    const bars = barsFromSpectrum(whiteNoise, BAR_COUNT, gain);
    assert.ok(bars.every(inRange01), `gain ${gain} produced out-of-range bar`);
  }
});

test("barsFromSpectrum: large gain clamps loud bins to exactly 1", () => {
  const bars = barsFromSpectrum(emphasizedHighs, BAR_COUNT, 1000);
  assert.equal(Math.max(...bars), 1);
});

test("barsFromSpectrum: more gain never lowers a bar (monotonic in gain)", () => {
  const low = barsFromSpectrum(whiteNoise, BAR_COUNT, 1);
  const high = barsFromSpectrum(whiteNoise, BAR_COUNT, 2);
  for (let i = 0; i < BAR_COUNT; i++) assert.ok(high[i] >= low[i]);
});

// --- measureSignal (core of audio.measureSignal) -----------------------------

test("measureSignal: silence yields zero rms, peak, and centroid", () => {
  const { rms, peak, centroid } = measureSignal(timeSilence, freqSilence, 1);
  assert.equal(rms, 0);
  assert.equal(peak, 0);
  assert.equal(centroid, 0);
});

test("measureSignal: rms/peak/centroid all within [0, 1]", () => {
  const time = new Uint8Array(BINS);
  for (let i = 0; i < BINS; i++) time[i] = 128 + Math.round(Math.sin(i * 0.2) * 100);
  const { rms, peak, centroid } = measureSignal(time, whiteNoise, 3);
  assert.ok(inRange01(rms), "rms out of range");
  assert.ok(inRange01(peak), "peak out of range");
  assert.ok(inRange01(centroid), "centroid out of range");
});

test("measureSignal: centroid tracks where spectral energy sits", () => {
  const lowC = measureSignal(timeSilence, emphasizedLows, 1).centroid;
  const highC = measureSignal(timeSilence, emphasizedHighs, 1).centroid;
  assert.ok(highC > lowC, "highs-emphasized spectrum should have higher centroid");
});

test("measureSignal: full-scale deflection peaks near 1 and clamps with gain", () => {
  const time = new Uint8Array(BINS).fill(255); // max positive deflection
  const { peak } = measureSignal(time, freqSilence, 1);
  assert.ok(peak > 0.99 && peak <= 1);
  const clamped = measureSignal(time, freqSilence, 10).peak;
  assert.equal(clamped, 1);
});

// --- spectrumToBars (loudness-invariant Signature bars) ----------------------

test("spectrumToBars: silence yields all-zero bars", () => {
  const bars = spectrumToBars(freqSilence, BAR_COUNT);
  assert.equal(bars.length, BAR_COUNT);
  assert.ok(bars.every((b) => b === 0));
});

test("spectrumToBars: max bar is exactly 1.0 for any non-silent input", () => {
  for (const [name, spec] of [
    ["single tone", singleTone],
    ["white noise", whiteNoise],
    ["emphasized highs", emphasizedHighs]
  ]) {
    const bars = spectrumToBars(spec, BAR_COUNT);
    assert.equal(Math.max(...bars), 1, `${name}: peak bar should normalize to 1.0`);
    assert.ok(bars.every(inRange01), `${name}: bar out of [0,1]`);
  }
});

test("spectrumToBars: loudness-invariant — scaling input leaves the shape unchanged", () => {
  const full = spectrumToBars(emphasizedHighs, BAR_COUNT);
  const quiet = new Uint8Array(BINS);
  for (let i = 0; i < BINS; i++) quiet[i] = Math.round(emphasizedHighs[i] * 0.4);
  const quietBars = spectrumToBars(quiet, BAR_COUNT);
  for (let i = 0; i < BAR_COUNT; i++) {
    // Integer quantization at low amplitude introduces tiny rounding; allow slack.
    assert.ok(Math.abs(full[i] - quietBars[i]) < 0.05, `bar ${i} shape drifted with loudness`);
  }
});

// --- spectrumFeatures --------------------------------------------------------

test("spectrumFeatures: silence yields zeroed descriptors", () => {
  const { centroid, rolloff, bandwidth } = spectrumFeatures(freqSilence);
  assert.equal(centroid, 0);
  assert.equal(rolloff, 0);
  assert.equal(bandwidth, 0);
});

test("spectrumFeatures: centroid, rolloff, bandwidth, flatness within [0, 1]", () => {
  for (const spec of [singleTone, whiteNoise, emphasizedHighs, emphasizedLows]) {
    const f = spectrumFeatures(spec);
    assert.ok(inRange01(f.centroid), "centroid out of range");
    assert.ok(inRange01(f.rolloff), "rolloff out of range");
    assert.ok(inRange01(f.bandwidth), "bandwidth out of range");
    assert.ok(inRange01(f.flatness), "flatness out of range");
  }
});

test("spectrumFeatures: emphasized highs read brighter than emphasized lows", () => {
  const hi = spectrumFeatures(emphasizedHighs);
  const lo = spectrumFeatures(emphasizedLows);
  assert.ok(hi.centroid > lo.centroid, "centroid should be higher for highs");
  assert.ok(hi.rolloff > lo.rolloff, "rolloff should be higher for highs");
});

test("spectrumFeatures: noise is flatter (less tonal) than a single tone", () => {
  const tone = spectrumFeatures(singleTone).flatness;
  const noise = spectrumFeatures(whiteNoise).flatness;
  assert.ok(noise > tone, "white noise should have higher spectral flatness than a tone");
});

// --- barsDistance ------------------------------------------------------------

test("barsDistance: zero for identical inputs", () => {
  const bars = spectrumToBars(whiteNoise, BAR_COUNT);
  assert.equal(barsDistance(bars, bars), 0);
  assert.equal(barsDistance(bars, bars.slice()), 0);
});

test("barsDistance: symmetric", () => {
  const a = spectrumToBars(emphasizedHighs, BAR_COUNT);
  const b = spectrumToBars(emphasizedLows, BAR_COUNT);
  assert.equal(barsDistance(a, b), barsDistance(b, a));
});

test("barsDistance: non-negative and bounded by [0, 1] for normalized bars", () => {
  const a = spectrumToBars(emphasizedHighs, BAR_COUNT);
  const b = spectrumToBars(emphasizedLows, BAR_COUNT);
  const d = barsDistance(a, b);
  assert.ok(d > 0, "distinct shapes should differ");
  assert.ok(inRange01(d), "distance of normalized bars should stay within [0,1]");
});

test("barsDistance: grows as shapes diverge", () => {
  const ref = spectrumToBars(emphasizedHighs, BAR_COUNT);
  const near = spectrumToBars(
    Uint8Array.from(emphasizedHighs, (v) => Math.min(255, v + 5)),
    BAR_COUNT
  );
  const far = spectrumToBars(emphasizedLows, BAR_COUNT);
  assert.ok(barsDistance(ref, far) > barsDistance(ref, near));
});
