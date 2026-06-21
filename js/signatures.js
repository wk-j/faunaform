// Capturing, describing, and comparing sound signatures.
import { state, SIG_BARS, CAPTURE_MS, SIG_COLORS, SIG_LABELS } from "./state.js";
import { keyCapture, signatureEmpty, signatureLegend, diffReadout } from "./dom.js";
import { spectrumToBars, spectrumFeatures, barsDistance } from "./transforms.js";

// The pure transforms live in transforms.js (DOM-free, unit-tested); re-export
// the two that other rendering modules import from here so call sites are
// unchanged.
export { spectrumToBars, spectrumFeatures, barsDistance };

export function accumulateCapture(now) {
  const { captureAccum, frequencyData } = state;
  for (let i = 0; i < captureAccum.length && i < frequencyData.length; i++) {
    captureAccum[i] += frequencyData[i];
  }
  state.captureFrames++;
  if (now - state.captureStart >= CAPTURE_MS) finalizeCapture();
}

export function startCapture() {
  if (!state.isLive) {
    flashDiff("start mic first");
    return;
  }
  if (state.capturing) return;
  state.capturing = true;
  state.captureAccum = new Float32Array(state.frequencyData.length);
  state.captureFrames = 0;
  state.captureStart = performance.now();
  keyCapture.classList.add("on");
}

export function finalizeCapture() {
  state.capturing = false;
  keyCapture.classList.remove("on");
  if (state.captureFrames === 0) return;
  const accum = state.captureAccum;
  const avg = new Float32Array(accum.length);
  for (let i = 0; i < avg.length; i++) avg[i] = accum[i] / state.captureFrames;
  state.signatures.push({
    label: "Sound " + SIG_LABELS[state.signatures.length % SIG_LABELS.length],
    color: SIG_COLORS[state.signatures.length % SIG_COLORS.length],
    bars: spectrumToBars(avg, SIG_BARS),
    features: spectrumFeatures(avg)
  });
  signatureEmpty.classList.add("hidden");
  renderLegend();
  updateDiff();
}

export function clearSignatures() {
  state.signatures = [];
  signatureEmpty.classList.remove("hidden");
  renderLegend();
  updateDiff();
}

function flashDiff(message) {
  diffReadout.textContent = message;
  state.diffFlashUntil = performance.now() + 1400;
}

export function updateDiff() {
  if (performance.now() < state.diffFlashUntil) return;
  const sigs = state.signatures;
  if (sigs.length === 0) {
    diffReadout.textContent = "no captures";
  } else if (sigs.length === 1) {
    diffReadout.textContent = "1 capture";
  } else {
    const a = sigs[sigs.length - 2].bars;
    const b = sigs[sigs.length - 1].bars;
    diffReadout.textContent = `Δ last two ${Math.round(barsDistance(a, b) * 100)}%`;
  }
}

function renderLegend() {
  signatureLegend.innerHTML = "";
  state.signatures.forEach((sig) => {
    const item = document.createElement("div");
    item.className = "legend-item";
    const chip = document.createElement("span");
    chip.className = "legend-chip";
    chip.style.background = sig.color;
    const text = document.createElement("span");
    text.innerHTML = `${sig.label} <span class="muted">· bright ${Math.round(sig.features.centroid * 100)}% · ${sig.features.flatness > 0.35 ? "noisy" : "tonal"}</span>`;
    item.append(chip, text);
    signatureLegend.appendChild(item);
  });
}
