// Microphone lifecycle and signal extraction from the Web Audio analyser.
import { state } from "./state.js";
import { sensitivity, smoothing, micState, keyMic, liveDot, emptyState, levelReadout } from "./dom.js";
import { finalizeCapture } from "./signatures.js";
import { barsFromSpectrum, measureSignal as measureSignalPure } from "./transforms.js";

export async function startMic() {
  try {
    state.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    state.analyser = state.audioContext.createAnalyser();
    state.analyser.fftSize = 2048;
    state.analyser.minDecibels = -90;
    state.analyser.maxDecibels = -15;
    state.analyser.smoothingTimeConstant = Number(smoothing.value);
    state.source = state.audioContext.createMediaStreamSource(state.stream);
    state.source.connect(state.analyser);
    // A context created without a user gesture can start suspended, which
    // freezes the analyser at zero; nudge it back to running.
    if (state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
    state.frequencyData = new Uint8Array(state.analyser.frequencyBinCount);
    state.timeData = new Uint8Array(state.analyser.fftSize);
    state.isLive = true;
    micState.textContent = "mic live";
    keyMic.classList.add("on");
    liveDot.classList.add("live");
    emptyState.classList.add("hidden");
  } catch (error) {
    levelReadout.textContent = "mic unavailable";
    emptyState.classList.remove("hidden");
    console.error(error);
  }
}

export function stopMic() {
  if (state.capturing) finalizeCapture();
  if (state.stream) {
    state.stream.getTracks().forEach((track) => track.stop());
  }
  if (state.source) {
    state.source.disconnect();
  }
  if (state.audioContext && state.audioContext.state !== "closed") {
    state.audioContext.close();
  }
  state.stream = null;
  state.source = null;
  state.analyser = null;
  state.audioContext = null;
  state.isLive = false;
  micState.textContent = "mic off";
  keyMic.classList.remove("on");
  liveDot.classList.remove("live");
  emptyState.classList.remove("hidden");
  levelReadout.textContent = "idle";
}

export function sampleAudio() {
  if (!state.analyser || !state.isLive || state.isFrozen) return;
  state.analyser.getByteFrequencyData(state.frequencyData);
  state.analyser.getByteTimeDomainData(state.timeData);
}

export function getBars(count) {
  return barsFromSpectrum(state.frequencyData, count, Number(sensitivity.value));
}

export function measureSignal() {
  return measureSignalPure(state.timeData, state.frequencyData, Number(sensitivity.value));
}

// Gentle synthetic data so the graphs breathe while the mic is off.
export function drawIdle(now) {
  const { timeData, frequencyData } = state;
  for (let i = 0; i < timeData.length; i++) {
    timeData[i] = 128 + Math.sin(now * 0.0018 + i * 0.035) * 4;
  }
  for (let i = 0; i < frequencyData.length; i++) {
    const breath = Math.sin(now * 0.0012 + i * 0.02) * 4 + 5;
    frequencyData[i] = Math.max(0, breath - i * 0.015);
  }
}
