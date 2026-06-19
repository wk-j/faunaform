// Shared mutable runtime state and constants for Faunaform.
// Every module reads and writes through this single object so the app keeps
// one source of truth (no live-binding surprises across module boundaries).
export const state = {
  audioContext: null,
  analyser: null,
  stream: null,
  source: null,
  frequencyData: new Uint8Array(1024),
  timeData: new Uint8Array(1024),
  rafId: 0,
  isLive: false,
  isFrozen: false,
  micSupported: true,
  helpOpen: false,
  controlsVisible: false,
  lastFrame: performance.now(),
  phase: 0,
  signatures: [],
  capturing: false,
  captureAccum: null,
  captureFrames: 0,
  captureStart: 0,
  diffFlashUntil: 0
};

export const SIG_BARS = 96;
export const CAPTURE_MS = 650;
export const SIG_COLORS = ["#50d6d0", "#f4c45a", "#ed6f87", "#9a8cff", "#b9e769"];
export const SIG_LABELS = "ABCDEFGH";

export const palette = {
  text: "#edf3f8",
  muted: "#8c9aaa",
  cyan: "#50d6d0",
  lime: "#b9e769",
  amber: "#f4c45a",
  rose: "#ed6f87",
  violet: "#9a8cff"
};
