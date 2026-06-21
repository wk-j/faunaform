// Composition root: audio sampling, 3D spectrum rendering, and bootstrap wiring.
import { state, SIG_BARS } from "./state.js";
import { sensitivity, micState, keyMic, levelReadout } from "./dom.js";
import { sampleAudio, drawIdle, stopMic, startMic } from "./audio.js";
import { barsFromSpectrum } from "./transforms.js";
import { initControls } from "./controls.js";
import { getMode, onModeChange } from "./modes.js";

const loadingOverlay = document.getElementById("loadingOverlay");
const errorOverlay = document.getElementById("errorOverlay");
const errorMessage = document.getElementById("errorMessage");
const errorReload = document.getElementById("errorReload");
const workspaceCanvas = document.getElementById("workspaceCanvas");
const workspace = document.querySelector(".workspace.workspace-3d");

let render3d = null;
let micPrompt = null;
let modeHud = null;
let placeholderOverlay = null;

function hideLoading() {
  loadingOverlay?.classList.add("hidden");
}

function showError(message) {
  hideLoading();
  if (errorMessage) errorMessage.textContent = message;
  errorOverlay?.removeAttribute("hidden");
}

function ensureMicPrompt() {
  if (micPrompt || !workspace) return micPrompt;

  if (!document.getElementById("micPromptStyles")) {
    const style = document.createElement("style");
    style.id = "micPromptStyles";
    style.textContent = `
      .mic-prompt {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-items: center;
        padding: 1.2rem;
        color: rgba(237, 243, 248, .72);
        text-align: center;
        pointer-events: none;
        transition: opacity .2s ease, visibility .2s ease;
      }
      .mic-prompt.hidden {
        opacity: 0;
        visibility: hidden;
      }
      .mic-prompt strong {
        display: block;
        margin-bottom: .3rem;
        color: var(--text);
        font-size: 1.02rem;
      }
      .mic-prompt span {
        display: block;
        max-width: 25rem;
        color: var(--muted);
        font-size: .88rem;
      }
    `;
    document.head.appendChild(style);
  }

  micPrompt = document.createElement("div");
  micPrompt.id = "micPrompt";
  micPrompt.className = "mic-prompt";
  micPrompt.innerHTML =
    "<strong>Microphone is off</strong><span>Press <kbd>M</kbd> to begin the live spectrum.</span>";
  workspace.appendChild(micPrompt);
  return micPrompt;
}

function updateMicPrompt() {
  const prompt = ensureMicPrompt();
  if (!prompt) return;
  // The mic prompt only makes sense over the live spectrum (mode 1); on the
  // placeholder modes the spectrum isn't shown, so keep it hidden there.
  prompt.classList.toggle("hidden", state.isLive || state.currentMode !== 1);
}

// HUD indicator + placeholder text share one injected stylesheet, mirroring the
// #micPrompt pattern so index.html (touched by other slices) stays untouched.
function ensureWorkspaceChromeStyles() {
  if (document.getElementById("workspaceChromeStyles")) return;
  const style = document.createElement("style");
  style.id = "workspaceChromeStyles";
  style.textContent = `
    .mode-hud {
      position: absolute;
      top: .85rem;
      left: .9rem;
      z-index: 3;
      display: flex;
      align-items: center;
      gap: .5rem;
      padding: .32rem .7rem;
      border: 1px solid var(--line-strong);
      border-radius: 999px;
      background: rgba(13, 17, 23, .62);
      color: var(--text);
      font-size: .82rem;
      letter-spacing: .02em;
      pointer-events: none;
      backdrop-filter: blur(6px);
    }
    .mode-hud::before {
      content: "";
      width: .42rem;
      height: .42rem;
      border-radius: 50%;
      background: var(--cyan);
      box-shadow: 0 0 10px rgba(80, 214, 208, .6);
    }
    .placeholder-overlay {
      position: absolute;
      inset: 0;
      z-index: 2;
      display: grid;
      place-items: center;
      padding: 1.2rem;
      text-align: center;
      pointer-events: none;
      transition: opacity .2s ease, visibility .2s ease;
    }
    .placeholder-overlay.hidden {
      opacity: 0;
      visibility: hidden;
    }
    .placeholder-overlay strong {
      display: block;
      margin-bottom: .3rem;
      color: var(--text);
      font-size: 1.05rem;
    }
    .placeholder-overlay span {
      display: block;
      max-width: 26rem;
      color: var(--muted);
      font-size: .88rem;
    }
  `;
  document.head.appendChild(style);
}

function ensureWorkspaceChrome() {
  if (!workspace) return;
  ensureWorkspaceChromeStyles();

  if (!modeHud) {
    modeHud = document.createElement("div");
    modeHud.id = "modeHud";
    modeHud.className = "mode-hud";
    // Persistent live region so screen readers announce each mode switch.
    modeHud.setAttribute("role", "status");
    modeHud.setAttribute("aria-live", "polite");
    workspace.appendChild(modeHud);
  }

  if (!placeholderOverlay) {
    placeholderOverlay = document.createElement("div");
    placeholderOverlay.id = "placeholderOverlay";
    placeholderOverlay.className = "placeholder-overlay hidden";
    placeholderOverlay.setAttribute("aria-live", "polite");
    placeholderOverlay.innerHTML =
      '<div><strong class="placeholder-label"></strong>' +
      "<span>This graph form is coming in a later release.</span></div>";
    workspace.appendChild(placeholderOverlay);
  }
}

// React to a mode change: swap the active 3D form, update the HUD label, show or
// hide the "in development" overlay, and re-evaluate the mic prompt. Camera and
// mic state are owned elsewhere and deliberately left alone, so they persist.
function applyMode(mode) {
  ensureWorkspaceChrome();
  render3d?.setActiveForm(mode.key);
  if (modeHud) modeHud.textContent = mode.name;
  if (placeholderOverlay) {
    const label = placeholderOverlay.querySelector(".placeholder-label");
    if (label) label.textContent = `${mode.name} — in development`;
    placeholderOverlay.classList.toggle("hidden", mode.id === 1);
  }
  updateMicPrompt();
}

function render(now) {
  state.rafId = requestAnimationFrame(render);

  if (!state.isFrozen) {
    // Keep audio flowing in every mode so the mic stays live across switches;
    // only the spectrum form consumes the bars, so feed it only on mode 1.
    if (!state.isLive) {
      drawIdle(now);
    } else {
      sampleAudio();
    }

    if (state.currentMode === 1) {
      const bars = barsFromSpectrum(
        state.frequencyData,
        SIG_BARS,
        Number(sensitivity.value)
      );
      render3d?.updateSpectrum(bars);
    }
  }

  render3d?.renderFrame();
  updateMicPrompt();

  if (state.isLive) {
    levelReadout.textContent = "live";
  }
}

async function boot3d() {
  const { createRender3d } = await import("./render3d.js");
  render3d = createRender3d(workspaceCanvas, { onFirstFrame: hideLoading });

  drawIdle(performance.now());
  render3d.updateSpectrum(
    barsFromSpectrum(state.frequencyData, SIG_BARS, Number(sensitivity.value))
  );
  // Sync the renderer's active form to whatever mode is current (in case the
  // user pressed 2/3/4 while Three.js was still loading from the CDN).
  applyMode(getMode());
  state.rafId = requestAnimationFrame(render);
}

function init() {
  initControls();
  ensureMicPrompt();
  ensureWorkspaceChrome();

  // Reflect the default mode (Spectrum) in the HUD immediately, even before the
  // renderer finishes loading; further switches flow through onModeChange.
  onModeChange(applyMode);
  applyMode(getMode());

  errorReload?.addEventListener("click", () => window.location.reload());
  window.addEventListener("beforeunload", stopMic);

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    state.micSupported = false;
    micState.textContent = "mic n/a";
    keyMic.style.opacity = ".45";
    levelReadout.textContent = "unsupported";
  }

  const resumeAudio = () => {
    if (state.audioContext && state.audioContext.state === "suspended") {
      state.audioContext.resume();
    }
  };
  window.addEventListener("pointerdown", resumeAudio);
  window.addEventListener("keydown", resumeAudio);

  if (!workspaceCanvas) {
    showError("Workspace canvas is missing from the page.");
    return;
  }

  boot3d().catch((error) => {
    console.error("Failed to load the 3D workspace:", error);
    showError(
      "Could not load the 3D renderer. The Three.js CDN may be unreachable — check your network and reload."
    );
  });

  if (state.micSupported) {
    startMic();
  }
}

init();
