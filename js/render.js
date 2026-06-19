// All canvas drawing for the four graph forms.
import { state, palette, SIG_BARS } from "./state.js";
import { canvases, ctx, sensitivity } from "./dom.js";
import { getBars } from "./audio.js";
import { spectrumToBars } from "./signatures.js";

function clear(context, canvas) {
  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawGrid(context, canvas, density) {
  const step = density || 64;
  context.save();
  context.strokeStyle = "rgba(237,243,248,.055)";
  context.lineWidth = 1;
  for (let x = 0; x <= canvas.width; x += step) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, canvas.height);
    context.stroke();
  }
  for (let y = 0; y <= canvas.height; y += step) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(canvas.width, y);
    context.stroke();
  }
  context.restore();
}

function hexAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function drawSpectrum(signal) {
  const canvas = canvases.spectrum;
  const context = ctx.spectrum;
  const w = canvas.width;
  const h = canvas.height;
  const bars = getBars(Math.max(48, Math.floor(w / 18)));
  const gap = Math.max(2, w * .0025);
  const barWidth = (w - gap * (bars.length - 1)) / bars.length;

  clear(context, canvas);
  drawGrid(context, canvas, 78);

  const gradient = context.createLinearGradient(0, h, w, 0);
  gradient.addColorStop(0, palette.cyan);
  gradient.addColorStop(.42, palette.lime);
  gradient.addColorStop(.74, palette.amber);
  gradient.addColorStop(1, palette.rose);

  context.save();
  context.shadowColor = "rgba(80, 214, 208, .24)";
  context.shadowBlur = 18;
  for (let i = 0; i < bars.length; i++) {
    const energy = bars[i];
    const x = i * (barWidth + gap);
    const height = Math.max(3, energy * h * .86);
    const y = h - height;
    context.fillStyle = gradient;
    context.fillRect(x, y, barWidth, height);
  }
  context.restore();

  context.save();
  context.strokeStyle = "rgba(237, 243, 248, .82)";
  context.lineWidth = Math.max(2, w * .002);
  context.beginPath();
  bars.forEach((energy, i) => {
    const x = i * (barWidth + gap) + barWidth / 2;
    const y = h - Math.max(3, energy * h * .86);
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  });
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(237,243,248,.62)";
  context.font = `${Math.max(11, w * .012)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText("20 Hz", 18, h - 18);
  context.fillText("20 kHz", w - 78, h - 18);
  context.fillStyle = "rgba(80,214,208,.18)";
  context.fillRect(0, h - (signal.rms * h), w, 2);
  context.restore();
}

export function drawWaveform(signal) {
  const canvas = canvases.waveform;
  const context = ctx.waveform;
  const w = canvas.width;
  const h = canvas.height;
  const gain = Number(sensitivity.value);
  const timeData = state.timeData;

  clear(context, canvas);
  drawGrid(context, canvas, 58);

  context.save();
  context.strokeStyle = "rgba(140,154,170,.38)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(0, h / 2);
  context.lineTo(w, h / 2);
  context.stroke();
  context.restore();

  const fill = context.createLinearGradient(0, 0, w, 0);
  fill.addColorStop(0, palette.violet);
  fill.addColorStop(.5, palette.cyan);
  fill.addColorStop(1, palette.lime);

  context.save();
  context.strokeStyle = fill;
  context.lineWidth = Math.max(2, w * .004);
  context.shadowColor = "rgba(154, 140, 255, .34)";
  context.shadowBlur = 16;
  context.beginPath();
  for (let i = 0; i < timeData.length; i++) {
    const x = (i / (timeData.length - 1)) * w;
    const normalized = ((timeData[i] - 128) / 128) * gain;
    const y = h / 2 + normalized * h * .38;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.stroke();
  context.restore();

  context.save();
  context.fillStyle = "rgba(244,196,90,.12)";
  const peakHeight = signal.peak * h * .5;
  context.fillRect(0, h / 2 - peakHeight, w, peakHeight * 2);
  context.restore();
}

export function drawRadial(signal) {
  const canvas = canvases.radial;
  const context = ctx.radial;
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) * .24;
  const bars = getBars(168);

  clear(context, canvas);
  drawGrid(context, canvas, 54);

  context.save();
  context.translate(cx, cy);

  for (let ring = 1; ring <= 3; ring++) {
    context.beginPath();
    context.strokeStyle = `rgba(237,243,248,${.06 + ring * .025})`;
    context.lineWidth = 1;
    context.arc(0, 0, radius * ring * .62, 0, Math.PI * 2);
    context.stroke();
  }

  const gradient = context.createRadialGradient(0, 0, radius * .2, 0, 0, radius * 2.4);
  gradient.addColorStop(0, "rgba(80,214,208,.95)");
  gradient.addColorStop(.48, "rgba(185,231,105,.78)");
  gradient.addColorStop(1, "rgba(237,111,135,.85)");

  context.beginPath();
  for (let i = 0; i <= bars.length; i++) {
    const idx = i % bars.length;
    const angle = (i / bars.length) * Math.PI * 2 - Math.PI / 2;
    const pulse = bars[idx] * Math.min(w, h) * .24;
    const drift = Math.sin(state.phase * .018 + i * .21) * signal.rms * 18;
    const r = radius + pulse + drift;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) context.moveTo(x, y);
    else context.lineTo(x, y);
  }
  context.closePath();
  context.fillStyle = "rgba(80,214,208,.07)";
  context.fill();
  context.strokeStyle = gradient;
  context.lineWidth = Math.max(2, Math.min(w, h) * .008);
  context.shadowColor = "rgba(80,214,208,.30)";
  context.shadowBlur = 22;
  context.stroke();

  context.beginPath();
  context.fillStyle = `rgba(244,196,90,${.18 + signal.rms * .28})`;
  context.arc(0, 0, radius * (.28 + signal.rms * .42), 0, Math.PI * 2);
  context.fill();

  context.restore();
}

function plotSignature(context, w, h, bars, color, alpha, fill, dashed) {
  const pad = h * 0.1;
  const usable = h - pad * 2;
  context.save();
  if (dashed) context.setLineDash([6, 6]);
  if (fill) {
    context.beginPath();
    for (let i = 0; i < bars.length; i++) {
      const x = (i / (bars.length - 1)) * w;
      const y = h - pad - bars[i] * usable;
      i === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
    }
    context.lineTo(w, h);
    context.lineTo(0, h);
    context.closePath();
    context.fillStyle = hexAlpha(color, 0.1);
    context.fill();
  }
  context.beginPath();
  for (let i = 0; i < bars.length; i++) {
    const x = (i / (bars.length - 1)) * w;
    const y = h - pad - bars[i] * usable;
    i === 0 ? context.moveTo(x, y) : context.lineTo(x, y);
  }
  context.strokeStyle = color;
  context.globalAlpha = alpha;
  context.lineWidth = Math.max(2, w * 0.0035);
  context.shadowColor = color;
  context.shadowBlur = 12;
  context.stroke();
  context.restore();
}

export function drawSignatures() {
  const canvas = canvases.signature;
  const context = ctx.signature;
  const w = canvas.width;
  const h = canvas.height;

  clear(context, canvas);
  drawGrid(context, canvas, 60);

  state.signatures.forEach((sig) => plotSignature(context, w, h, sig.bars, sig.color, 0.95, true, false));

  if (state.isLive && !state.isFrozen) {
    const live = spectrumToBars(state.frequencyData, SIG_BARS);
    plotSignature(context, w, h, live, "#edf3f8", 0.5, false, true);
  }

  context.save();
  context.fillStyle = "rgba(237,243,248,.5)";
  context.font = `${Math.max(10, w * 0.011)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  context.fillText("low", 14, h - 12);
  context.fillText("high", w - 46, h - 12);
  context.restore();
}
