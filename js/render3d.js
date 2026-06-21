// Three.js workspace: scene, camera, orbit controls, bloom, and the active
// graph form. Forms are direct imports (no registry): only four modes are ever
// planned and the placeholder is shared across modes 2-4, so a string-keyed
// registry would add indirection for no payoff.
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { SIG_BARS } from "./state.js";
import { createSpectrumForm } from "./render3d/spectrum.js";
import { createPlaceholderForm } from "./render3d/placeholder.js";
import { setCameraRotateImpl } from "./camera.js";

const PALETTE = {
  bg: 0x07090d,
  grid: 0x283241
};

function seedPixelRatio() {
  const cores = navigator.hardwareConcurrency || 4;
  const dpr = window.devicePixelRatio || 1;
  if (cores <= 2) return Math.min(dpr, 1);
  if (cores <= 4) return Math.min(dpr, 1.5);
  return Math.min(dpr, 2);
}

export function createRender3d(canvas, { onFirstFrame } = {}) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });
  renderer.setClearColor(PALETTE.bg, 1);
  renderer.setPixelRatio(seedPixelRatio());
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(PALETTE.bg, 0.038);

  const camera = new THREE.PerspectiveCamera(46, 1, 0.1, 80);
  camera.position.set(0, 2.6, 7.8);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 2.5;
  controls.maxDistance = 16;
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.target.set(0, 0.9, 0);
  controls.update();

  const ambient = new THREE.AmbientLight(0x8c9aaa, 0.28);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0x50d6d0, 0.35);
  keyLight.position.set(3, 5, 2);
  scene.add(keyLight);

  const grid = new THREE.GridHelper(14, 28, PALETTE.grid, PALETTE.grid);
  grid.material.opacity = 0.18;
  grid.material.transparent = true;
  grid.position.y = -0.75;
  scene.add(grid);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 14),
    new THREE.MeshBasicMaterial({
      color: PALETTE.bg,
      transparent: true,
      opacity: 0.5
    })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.751;
  scene.add(floor);

  const spectrum = createSpectrumForm({ barCount: SIG_BARS });
  scene.add(spectrum.mesh);

  // Shared placeholder for modes 2-4; hidden until a non-spectrum mode is active.
  const placeholder = createPlaceholderForm();
  placeholder.group.visible = false;
  scene.add(placeholder.group);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // Soft instrument glow: moderate strength, tighter radius, higher threshold.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.38, 0.32, 0.28);
  composer.addPass(bloom);

  let firstFrame = false;
  let placeholderActive = false;
  const clock = new THREE.Clock();

  const orbitOffset = new THREE.Vector3();
  const orbitSpherical = new THREE.Spherical();
  const orbitQuat = new THREE.Quaternion();
  const orbitYUp = new THREE.Vector3(0, 1, 0);
  const orbitQuatInverse = new THREE.Quaternion();

  // Programmatic orbit matching OrbitControls' spherical math (theta/azimuth,
  // phi/polar). Mouse and touch still use OrbitControls directly.
  setCameraRotateImpl((deltaAzimuth, deltaPolar) => {
    orbitOffset.copy(camera.position).sub(controls.target);
    orbitQuat.setFromUnitVectors(camera.up, orbitYUp);
    orbitQuatInverse.copy(orbitQuat).invert();
    orbitOffset.applyQuaternion(orbitQuat);
    orbitSpherical.setFromVector3(orbitOffset);
    orbitSpherical.theta -= deltaAzimuth;
    orbitSpherical.phi -= deltaPolar;
    orbitSpherical.phi = Math.max(
      controls.minPolarAngle,
      Math.min(controls.maxPolarAngle, orbitSpherical.phi)
    );
    orbitSpherical.makeSafe();
    orbitOffset.setFromSpherical(orbitSpherical);
    orbitOffset.applyQuaternion(orbitQuatInverse);
    camera.position.copy(controls.target).add(orbitOffset);
  });

  // Swap the visible form. "spectrum" shows the live spectrum; any other key
  // (waveform/radial/signatures) shows the shared placeholder. Camera and
  // OrbitControls state are untouched, so the view is preserved across switches.
  function setActiveForm(key) {
    placeholderActive = key !== "spectrum";
    spectrum.mesh.visible = !placeholderActive;
    placeholder.group.visible = placeholderActive;
  }

  function resize() {
    const width = Math.max(1, canvas.clientWidth);
    const height = Math.max(1, canvas.clientHeight);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    composer.setSize(width, height);
    bloom.resolution.set(width, height);
  }

  function updateSpectrum(bars) {
    spectrum.update(bars);
  }

  function renderFrame() {
    const elapsed = clock.getElapsedTime();
    if (placeholderActive) placeholder.update(elapsed);
    controls.update();
    composer.render();
    if (!firstFrame) {
      firstFrame = true;
      onFirstFrame?.();
    }
  }

  resize();
  window.addEventListener("resize", resize);

  return {
    updateSpectrum,
    setActiveForm,
    renderFrame,
    dispose() {
      setCameraRotateImpl(null);
      window.removeEventListener("resize", resize);
      controls.dispose();
      spectrum.mesh.geometry.dispose();
      spectrum.mesh.material.dispose();
      placeholder.dispose();
      composer.dispose();
      renderer.dispose();
    }
  };
}
