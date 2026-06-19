// Cached DOM references and 2D canvas contexts.
const byId = (id) => document.getElementById(id);

export const canvases = {
  spectrum: byId("spectrumCanvas"),
  waveform: byId("waveformCanvas"),
  radial: byId("radialCanvas"),
  signature: byId("signatureCanvas")
};

export const ctx = {
  spectrum: canvases.spectrum.getContext("2d"),
  waveform: canvases.waveform.getContext("2d"),
  radial: canvases.radial.getContext("2d"),
  signature: canvases.signature.getContext("2d")
};

export const app = byId("app");
export const controlsToggle = byId("controlsToggle");
export const keyMic = byId("keyMic");
export const keyCapture = byId("keyCapture");
export const keyFreeze = byId("keyFreeze");
export const micState = byId("micState");
export const freezeState = byId("freezeState");
export const helpOverlay = byId("helpOverlay");
export const sensitivity = byId("sensitivity");
export const smoothing = byId("smoothing");
export const sensitivityValue = byId("sensitivityValue");
export const smoothingValue = byId("smoothingValue");
export const levelReadout = byId("levelReadout");
export const peakReadout = byId("peakReadout");
export const centroidReadout = byId("centroidReadout");
export const emptyState = byId("emptyState");
export const liveDot = byId("liveDot");
export const signatureLegend = byId("signatureLegend");
export const signatureEmpty = byId("signatureEmpty");
export const diffReadout = byId("diffReadout");
