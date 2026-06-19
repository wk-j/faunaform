// Keyboard control scheme, sliders, and the help overlay.
import { state } from "./state.js";
import {
  app,
  controlsToggle,
  sensitivity,
  smoothing,
  sensitivityValue,
  smoothingValue,
  keyFreeze,
  freezeState,
  helpOverlay
} from "./dom.js";
import { startMic, stopMic } from "./audio.js";
import { startCapture, clearSignatures } from "./signatures.js";

export function updateControlText() {
  sensitivityValue.value = `${Number(sensitivity.value).toFixed(2)}x`;
  smoothingValue.value = Number(smoothing.value).toFixed(2);
  if (state.analyser) {
    state.analyser.smoothingTimeConstant = Number(smoothing.value);
  }
}

function toggleMic() {
  if (!state.micSupported) return;
  if (state.isLive) stopMic();
  else startMic();
}

function toggleFreeze() {
  state.isFrozen = !state.isFrozen;
  keyFreeze.classList.toggle("on", state.isFrozen);
  freezeState.textContent = state.isFrozen ? "frozen" : "freeze";
}

function toggleHelp(force) {
  state.helpOpen = typeof force === "boolean" ? force : !state.helpOpen;
  helpOverlay.hidden = !state.helpOpen;
}

// Show or hide the top control bar; graphs fill the screen when it is hidden.
function toggleControls(force) {
  state.controlsVisible = typeof force === "boolean" ? force : !state.controlsVisible;
  app.classList.toggle("controls-hidden", !state.controlsVisible);
  controlsToggle.classList.toggle("on", state.controlsVisible);
  controlsToggle.setAttribute("aria-pressed", String(state.controlsVisible));
}

function adjustRange(input, delta) {
  const min = parseFloat(input.min);
  const max = parseFloat(input.max);
  input.value = Math.min(max, Math.max(min, parseFloat(input.value) + delta));
  updateControlText();
}

export function initControls() {
  document.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey || event.repeat) return;

    if (event.key === "?") { toggleHelp(); event.preventDefault(); return; }
    if (event.key === "Escape") {
      if (state.helpOpen) { toggleHelp(false); event.preventDefault(); }
      return;
    }

    const big = event.shiftKey ? 5 : 1;
    switch (event.code) {
      case "KeyM": toggleMic(); break;
      case "KeyC": startCapture(); break;
      case "KeyX": clearSignatures(); break;
      case "KeyH": toggleHelp(); break;
      case "KeyT": toggleControls(); break;
      case "Space": toggleFreeze(); break;
      case "ArrowUp": adjustRange(sensitivity, big * 0.05); break;
      case "ArrowDown": adjustRange(sensitivity, -big * 0.05); break;
      case "ArrowRight": adjustRange(smoothing, big * 0.01); break;
      case "ArrowLeft": adjustRange(smoothing, -big * 0.01); break;
      default: return;
    }
    event.preventDefault();
  });

  sensitivity.addEventListener("input", updateControlText);
  smoothing.addEventListener("input", updateControlText);
  controlsToggle.addEventListener("click", () => toggleControls());
}
