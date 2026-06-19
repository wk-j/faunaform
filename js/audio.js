// Microphone lifecycle and signal extraction from the Web Audio analyser.
import { state } from "./state.js";
import { sensitivity, smoothing, micState, keyMic, liveDot, emptyState, levelReadout } from "./dom.js";
import { finalizeCapture } from "./signatures.js";

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
  const bars = [];
  const gain = Number(sensitivity.value);
  const data = state.frequencyData;
  const usableBins = Math.floor(data.length * 0.72);
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.pow(i / count, 1.7) * usableBins);
    const end = Math.max(start + 1, Math.floor(Math.pow((i + 1) / count, 1.7) * usableBins));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += data[j] || 0;
    }
    const avg = sum / (end - start);
    bars.push(Math.min(1, (avg / 255) * gain));
  }
  return bars;
}

export function measureSignal() {
  const { timeData, frequencyData } = state;
  let sum = 0;
  let peak = 0;
  let weighted = 0;
  let total = 0;

  for (let i = 0; i < timeData.length; i++) {
    const value = Math.abs((timeData[i] - 128) / 128);
    sum += value * value;
    peak = Math.max(peak, value);
  }

  for (let i = 0; i < frequencyData.length; i++) {
    const value = frequencyData[i] / 255;
    weighted += value * i;
    total += value;
  }

  const gain = Number(sensitivity.value);
  const rms = Math.sqrt(sum / timeData.length) * gain;
  const centroid = total > 0 ? weighted / total / frequencyData.length : 0;
  return {
    rms: Math.min(1, rms),
    peak: Math.min(1, peak * gain),
    centroid
  };
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
