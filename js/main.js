// Composition root: canvas sizing, the animation loop, and bootstrap wiring.
import { state } from "./state.js";
import { canvases, micState, keyMic, levelReadout, peakReadout, centroidReadout } from "./dom.js";
import { sampleAudio, measureSignal, drawIdle, stopMic } from "./audio.js";
import { accumulateCapture, updateDiff } from "./signatures.js";
import { drawSpectrum, drawWaveform, drawRadial, drawSignatures } from "./render.js";
import { updateControlText, initControls } from "./controls.js";

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function resizeAll() {
  Object.values(canvases).forEach(resizeCanvas);
}

function render(now) {
  state.rafId = requestAnimationFrame(render);
  resizeAll();
  const delta = Math.min(48, now - state.lastFrame);
  state.lastFrame = now;
  if (state.isFrozen) {
    return;
  }

  state.phase += delta;

  if (!state.isLive) {
    drawIdle(now);
  } else {
    sampleAudio();
    if (state.capturing) accumulateCapture(now);
  }

  const signal = measureSignal();
  drawSpectrum(signal);
  drawWaveform(signal);
  drawRadial(signal);
  drawSignatures();
  updateDiff();

  if (state.isLive) {
    levelReadout.textContent = `level ${signal.rms.toFixed(2)}`;
  }
  peakReadout.textContent = `peak ${signal.peak.toFixed(2)}`;
  centroidReadout.textContent = `centroid ${Math.round(signal.centroid * 100)}%`;
}

function init() {
  initControls();
  window.addEventListener("resize", resizeAll);
  window.addEventListener("beforeunload", stopMic);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.micSupported = false;
    micState.textContent = "mic n/a";
    keyMic.style.opacity = ".45";
    levelReadout.textContent = "unsupported";
  }

  updateControlText();
  resizeAll();
  state.rafId = requestAnimationFrame(render);
}

init();
