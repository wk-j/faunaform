// Live 3D spectrogram form: a scrolling "waterfall" surface. Frequency runs
// across the X axis, time recedes into the scene along Z (newest at the front
// edge, history flowing back), and loudness is BOTH the height of the surface
// and its color. Reading a sound's shape over time becomes reading a landscape:
// a sustained tone is a ridge, a chirp a diagonal wall, a hiss a broad plateau.
//
// Built as one BufferGeometry grid (freqCols × timeRows). Each frame the height
// + color rows shift one step toward the back and the newest spectrum is written
// into the front row, then the position.y and color attributes are re-uploaded.
// Vertices are unlit + vertex-colored to match the other forms; the relief and
// the orbit camera carry the 3D, no per-frame normal recompute needed.
import * as THREE from "three";

// Reusable scratch so the hot loops allocate nothing.
const _c = [0, 0, 0];

// Loudness → color, stored as linear RGB (0-1) straight from THREE.Color, the
// same space the other forms feed their vertex/instance colors. Quiet sits near
// the light workspace (a pale ridge that stays out of the way); louder climbs
// the brand gradient to a vivid rose peak.
// Deeper, more saturated than the pastel bar palette so the surface reads rich
// (not washed out) on the light workspace: faint signal is already a solid
// teal, and peaks drive through green/amber/red into a deep magenta.
const STOPS = [
  { t: 0.0, c: new THREE.Color(0xbfd0db).toArray() }, // pale base (mostly alpha-clipped)
  { t: 0.16, c: new THREE.Color(0x149aa8).toArray() }, // deep teal
  { t: 0.4, c: new THREE.Color(0x1f9d52).toArray() }, // green
  { t: 0.62, c: new THREE.Color(0xe08a12).toArray() }, // amber
  { t: 0.82, c: new THREE.Color(0xd62f3f).toArray() }, // red
  { t: 1.0, c: new THREE.Color(0x7a1560).toArray() } // deep magenta
];

// Write the linear color for loudness `t` into out[0..2].
function colorAt(t, out) {
  let lo = STOPS[0];
  let hi = STOPS[STOPS.length - 1];
  for (let i = 1; i < STOPS.length; i++) {
    if (t <= STOPS[i].t) {
      lo = STOPS[i - 1];
      hi = STOPS[i];
      break;
    }
  }
  const span = hi.t - lo.t;
  const k = span > 0 ? (t - lo.t) / span : 0;
  out[0] = lo.c[0] + (hi.c[0] - lo.c[0]) * k;
  out[1] = lo.c[1] + (hi.c[1] - lo.c[1]) * k;
  out[2] = lo.c[2] + (hi.c[2] - lo.c[2]) * k;
}

export function createSpectrogramForm({
  freqCols = 110,
  timeRows = 240,
  spanX = 9,
  spanZ = 13,
  floorY = -0.75,
  maxHeight = 4,
  binFraction = 0.7
} = {}) {
  const N = freqCols * timeRows;
  const positions = new Float32Array(N * 3);
  // RGBA: the alpha channel hides the quiet base. Cells with little energy get
  // alpha ~0 and are discarded by the material's alphaTest, so silence shows the
  // scene floor through it instead of laying down a second flat sheet on top of
  // the grid. Only real signal rises and renders.
  const colors = new Float32Array(N * 4);
  const loud = new Float32Array(N); // per-cell loudness [0,1], the scrollable state

  // Fixed X (frequency) and Z (time) per vertex; only Y and color move.
  for (let t = 0; t < timeRows; t++) {
    for (let f = 0; f < freqCols; f++) {
      const i = t * freqCols + f;
      const x = -spanX / 2 + (f / (freqCols - 1)) * spanX;
      // t = 0 is the newest row at the front (+Z), older rows recede to -Z.
      const z = spanZ / 2 - (t / (timeRows - 1)) * spanZ;
      positions[i * 3] = x;
      positions[i * 3 + 1] = floorY;
      positions[i * 3 + 2] = z;
      colors[i * 4 + 3] = 0; // start fully transparent (silent)
    }
  }

  // Two triangles per grid quad.
  const index = [];
  for (let t = 0; t < timeRows - 1; t++) {
    for (let f = 0; f < freqCols - 1; f++) {
      const a = t * freqCols + f;
      const b = a + 1;
      const c = a + freqCols;
      const d = c + 1;
      index.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  const positionAttr = new THREE.BufferAttribute(positions, 3);
  const colorAttr = new THREE.BufferAttribute(colors, 4);
  positionAttr.setUsage(THREE.DynamicDrawUsage);
  colorAttr.setUsage(THREE.DynamicDrawUsage);
  geometry.setAttribute("position", positionAttr);
  geometry.setAttribute("color", colorAttr);
  geometry.setIndex(index);

  // alphaTest discards near-transparent (quiet) fragments outright — no blending,
  // so there is no second floor and no transparency sort order to manage; drawn
  // (loud) fragments stay fully opaque and depth-correct.
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide,
    transparent: true,
    alphaTest: 0.35,
    // No fog: distant (older) rows would otherwise wash toward the light
    // background and the colors would read as pale.
    fog: false
  });

  const mesh = new THREE.Mesh(geometry, material);
  // Y changes every frame, so a static bounding sphere would wrongly cull it.
  mesh.frustumCulled = false;

  function update(frequencyData, gain = 1) {
    const usableBins = Math.max(1, Math.floor(frequencyData.length * binFraction));
    // Shift every row one step toward the back (row t <- row t-1).
    loud.copyWithin(freqCols, 0, N - freqCols);
    // Write the newest spectrum into the front row (t = 0).
    for (let f = 0; f < freqCols; f++) {
      const bin = Math.min(usableBins - 1, Math.floor((f / freqCols) * usableBins));
      loud[f] = Math.min(1, ((frequencyData[bin] || 0) / 255) * gain);
    }
    // Re-derive height + color + alpha for every cell from the shifted loudness
    // field. Alpha ramps up fast so faint signal still shows but true silence
    // (alpha below alphaTest) is discarded — no flat quiet sheet.
    for (let i = 0; i < N; i++) {
      const v = loud[i];
      positions[i * 3 + 1] = floorY + v * maxHeight;
      colorAt(v, _c);
      colors[i * 4] = _c[0];
      colors[i * 4 + 1] = _c[1];
      colors[i * 4 + 2] = _c[2];
      colors[i * 4 + 3] = Math.min(1, v * 6);
    }
    positionAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}
