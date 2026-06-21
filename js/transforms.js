// Pure data transforms: raw Uint8Array spectrum/time-domain data in, plain
// numbers and arrays out. No DOM, no Web Audio, no module-level state — these
// are the numerically-load-bearing core of the live spectrum and of Signature
// comparison, so they live here in isolation where they can be unit-tested in
// Node and survive the rendering layer being rewritten around them.

// Log-spaced frequency bars with sensitivity gain applied, clamped to [0, 1].
// This is loudness-*preserving* (a louder sound makes taller bars) — it drives
// the live spectrum graph, not the loudness-invariant Signature.
export function barsFromSpectrum(data, count, gain) {
  const bars = [];
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

// Evenly-spaced time-domain waveform samples with sensitivity gain applied,
// clamped to [-1, 1]. Signed — silence (all 128) yields all 0; positive/negative
// deflection maps to the waveform line in the Waveform graph (mode 2).
export function waveformFromTime(timeData, count, gain) {
  const samples = [];
  const n = timeData.length;
  for (let i = 0; i < count; i++) {
    const start = Math.floor((i / count) * n);
    const end = Math.max(start + 1, Math.floor(((i + 1) / count) * n));
    let sum = 0;
    for (let j = start; j < end; j++) {
      sum += timeData[j] || 0;
    }
    const avg = sum / (end - start);
    const value = ((avg - 128) / 128) * gain;
    samples.push(Math.max(-1, Math.min(1, value)));
  }
  return samples;
}

// Scalar signal descriptors. rms/peak come from the time-domain signal (centered
// at 128), centroid from the frequency spectrum. Each result is in [0, 1].
export function measureSignal(timeData, frequencyData, gain) {
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

  const rms = Math.sqrt(sum / timeData.length) * gain;
  const centroid = total > 0 ? weighted / total / frequencyData.length : 0;
  return {
    rms: Math.min(1, rms),
    peak: Math.min(1, peak * gain),
    centroid
  };
}

// Reduce a full frequency spectrum to log-spaced bars, normalized to its own
// peak so the *shape* of a sound is compared, not how loud it happened to be.
export function spectrumToBars(spectrum, count) {
  const bars = new Array(count).fill(0);
  const usableBins = Math.floor(spectrum.length * 0.72);
  let max = 1e-6;
  for (let i = 0; i < count; i++) {
    const start = Math.floor(Math.pow(i / count, 1.7) * usableBins);
    const end = Math.max(start + 1, Math.floor(Math.pow((i + 1) / count, 1.7) * usableBins));
    let sum = 0;
    for (let j = start; j < end; j++) sum += spectrum[j] || 0;
    const value = sum / (end - start) / 255;
    bars[i] = value;
    if (value > max) max = value;
  }
  for (let i = 0; i < count; i++) bars[i] /= max;
  return bars;
}

// Compact acoustic descriptors that separate one animal's voice from another.
export function spectrumFeatures(spectrum) {
  const n = spectrum.length;
  let total = 0;
  let weighted = 0;
  for (let i = 0; i < n; i++) {
    const v = spectrum[i] / 255;
    total += v;
    weighted += v * i;
  }
  const centroid = total > 0 ? (weighted / total) / n : 0;

  let cumulative = 0;
  let rolloff = 0;
  const target = total * 0.85;
  for (let i = 0; i < n; i++) {
    cumulative += spectrum[i] / 255;
    if (cumulative >= target) { rolloff = i / n; break; }
  }

  const centroidBin = centroid * n;
  let variance = 0;
  for (let i = 0; i < n; i++) {
    variance += (spectrum[i] / 255) * (i - centroidBin) * (i - centroidBin);
  }
  const bandwidth = total > 0 ? Math.sqrt(variance / total) / n : 0;

  let logSum = 0;
  let arithSum = 0;
  const eps = 1e-6;
  for (let i = 0; i < n; i++) {
    const v = spectrum[i] / 255 + eps;
    logSum += Math.log(v);
    arithSum += v;
  }
  const flatness = Math.exp(logSum / n) / (arithSum / n);

  return { centroid, rolloff, bandwidth, flatness };
}

// Mean absolute difference between two bar arrays — the comparison at the heart
// of reading two Signatures as visibly different. Symmetric, zero for equals.
export function barsDistance(a, b) {
  let sum = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]);
  return sum / n;
}
