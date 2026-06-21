// Live waveform form: oscilloscope-style colored trace along the X axis.
import * as THREE from "three";
import { palette } from "../state.js";

// Match the spectrum gradient so mode 2 reads as the same instrument family.
const COLOR_STOPS = [
  { t: 0, hex: palette.cyan },
  { t: 0.42, hex: palette.lime },
  { t: 0.74, hex: palette.amber },
  { t: 1, hex: palette.rose }
];

function colorAtIndex(index, count) {
  const t = count > 1 ? index / (count - 1) : 0;
  for (let i = 1; i < COLOR_STOPS.length; i++) {
    const stop = COLOR_STOPS[i];
    if (t <= stop.t) {
      const prev = COLOR_STOPS[i - 1];
      const local = (t - prev.t) / (stop.t - prev.t);
      return new THREE.Color(prev.hex).lerp(new THREE.Color(stop.hex), local);
    }
  }
  return new THREE.Color(COLOR_STOPS[COLOR_STOPS.length - 1].hex);
}

export function createWaveformForm({
  pointCount = 128,
  span = 11,
  midY = 0.9,
  amplitude = 1.6
} = {}) {
  const vertexCount = pointCount * 2;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const centerYs = new Float32Array(pointCount);
  const geometry = new THREE.BufferGeometry();
  const positionAttribute = new THREE.BufferAttribute(positions, 3);
  positionAttribute.setUsage(THREE.DynamicDrawUsage);

  const gap = pointCount > 1 ? span / (pointCount - 1) : 0;
  const startX = -span / 2;
  const halfThickness = 0.04;

  const indices = [];
  for (let i = 0; i < pointCount - 1; i++) {
    const topA = i * 2;
    const bottomA = topA + 1;
    const topB = topA + 2;
    const bottomB = topA + 3;
    indices.push(topA, bottomA, topB, bottomA, bottomB, topB);
  }

  for (let i = 0; i < pointCount; i++) {
    const x = startX + i * gap;
    const topVertex = i * 2;
    const bottomVertex = topVertex + 1;

    centerYs[i] = midY;
    positions[topVertex * 3] = x;
    positions[topVertex * 3 + 1] = midY + halfThickness;
    positions[topVertex * 3 + 2] = 0;
    positions[bottomVertex * 3] = x;
    positions[bottomVertex * 3 + 1] = midY - halfThickness;
    positions[bottomVertex * 3 + 2] = 0;

    const color = colorAtIndex(i, pointCount);
    colors[topVertex * 3] = color.r;
    colors[topVertex * 3 + 1] = color.g;
    colors[topVertex * 3 + 2] = color.b;
    colors[bottomVertex * 3] = color.r;
    colors[bottomVertex * 3 + 1] = color.g;
    colors[bottomVertex * 3 + 2] = color.b;
  }

  geometry.setIndex(indices);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(geometry, material);

  function update(samples) {
    const n = Math.min(pointCount, samples.length);
    for (let i = 0; i < n; i++) {
      centerYs[i] = midY + samples[i] * amplitude;
      const topVertex = i * 2;
      const bottomVertex = topVertex + 1;
      positions[topVertex * 3 + 1] = centerYs[i] + halfThickness;
      positions[bottomVertex * 3 + 1] = centerYs[i] - halfThickness;
    }
    positionAttribute.needsUpdate = true;
  }

  function dispose() {
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}
