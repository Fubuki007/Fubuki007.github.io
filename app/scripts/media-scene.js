import * as THREE from "three";

const scene = new THREE.Scene();
scene.background = new THREE.Color("#0d0f18");
const camera = new THREE.PerspectiveCamera(35, 16 / 9, 0.1, 100);
camera.position.set(0, 0, 16);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
});
renderer.setSize(1280, 720);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.65;
document.body.appendChild(renderer.domElement);

const sculpture = new THREE.Group();
scene.add(sculpture);
const chrome = new THREE.MeshPhysicalMaterial({
  color: "#d9dcef",
  metalness: 0.52,
  roughness: 0.22,
  clearcoat: 1,
  clearcoatRoughness: 0.12,
  side: THREE.DoubleSide,
});
const geometry = new THREE.TorusKnotGeometry(2.55, 0.72, 340, 36, 2, 3);
const mesh = new THREE.Mesh(geometry, chrome);
mesh.rotation.set(0.35, -0.5, -0.28);
mesh.scale.set(1.07, 1, 0.75);
sculpture.add(mesh);
const inner = new THREE.Mesh(
  new THREE.TorusKnotGeometry(2.25, 0.25, 320, 22, 2, 3),
  new THREE.MeshPhysicalMaterial({
    color: "#8d8fe1",
    metalness: 0.7,
    roughness: 0.18,
    clearcoat: 1,
  }),
);
inner.rotation.set(0.2, -0.5, -0.28);
inner.scale.set(1.07, 1, 0.75);
sculpture.add(inner);

scene.add(new THREE.AmbientLight("#8b90bb", 1.2));
const lights = [
  ["#ffffff", 24, [-6, 6, 6]],
  ["#6f9bff", 34, [7, -2, 4]],
  ["#ad8fff", 22, [3, 5, -5]],
  ["#fafafa", 15, [-5, -6, 1]],
];
for (const [color, intensity, position] of lights) {
  const light = new THREE.PointLight(color, intensity, 30);
  light.position.set(...position);
  scene.add(light);
}
window.renderFrame = (t = 0) => {
  sculpture.rotation.set(
    -0.1 + Math.sin(t * 0.75) * 0.1,
    t * 0.42,
    Math.sin(t * 0.5) * 0.08,
  );
  sculpture.position.y = Math.sin(t * 0.75) * 0.1;
  renderer.render(scene, camera);
};
window.renderFrame();
