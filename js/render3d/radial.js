// Live radial energy form: spectrum columns bent into a circular equalizer.
import * as THREE from "three";
import { palette } from "../state.js";

// Match the 2D spectrum gradient stops from render.js.
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

export function createRadialForm({
  barCount = 96,
  radius = 2.6,
  floorY = -0.75,
  maxHeight = 2.4
} = {}) {
  const geometry = new THREE.BoxGeometry(1, 1, 1);
  // Unlit material: instanceColor tints at full saturation so the bars read as
  // vivid glowing columns regardless of scene lights.
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff
  });

  const mesh = new THREE.InstancedMesh(geometry, material, barCount);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

  const circumference = Math.PI * 2 * radius;
  const columnWidth = (circumference / barCount) * 0.6;
  const columnDepth = columnWidth;
  const minHeight = 0.05;
  const angles = new Float32Array(barCount);
  const baseXs = new Float32Array(barCount);
  const baseZs = new Float32Array(barCount);

  for (let i = 0; i < barCount; i++) {
    const angle = (i / barCount) * Math.PI * 2;
    angles[i] = angle;
    baseXs[i] = radius * Math.cos(angle);
    baseZs[i] = radius * Math.sin(angle);
    mesh.setColorAt(i, colorAtIndex(i, barCount));
  }
  mesh.instanceColor.needsUpdate = true;

  const dummy = new THREE.Object3D();

  function update(bars) {
    const n = Math.min(barCount, bars.length);
    for (let i = 0; i < n; i++) {
      const height = Math.max(minHeight, bars[i] * maxHeight);
      dummy.position.set(baseXs[i], floorY + height / 2, baseZs[i]);
      dummy.rotation.y = angles[i];
      dummy.scale.set(columnWidth, height, columnDepth);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function dispose() {
    mesh.geometry.dispose();
    mesh.material.dispose();
  }

  return { mesh, update, dispose };
}
