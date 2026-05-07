const scene = new THREE.Scene();
const skyColor = 0x7fc7ff;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(skyColor, 90, 250);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0xdfefff, 0x2f4565, 0.85);
scene.add(ambient);

const sun = new THREE.DirectionalLight(0xffffff, 1.2);
sun.position.set(18, 34, 12);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 120;
sun.shadow.camera.left = -100;
sun.shadow.camera.right = 100;
sun.shadow.camera.top = 100;
sun.shadow.camera.bottom = -100;
scene.add(sun);

const fill = new THREE.DirectionalLight(0x99c6ff, 0.25);
fill.position.set(-40, 30, -20);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(420, 420, 6, 6),
  new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    color: 0x2a6b3d,
    roughness: 0.95,
    metalness: 0.02,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const trackConfigs = [
  {
    id: 'tropical',
    name: 'Pista Tropical',
    trackColor: 0x141b35,
    borderColor: 0xffd87a,
    centerColor: 0xffffff,
    groundColor: 0x4b8f36,
    start: new THREE.Vector3(0, 0.4, 75),
    rotation: Math.PI,
    outerFn: (t) => new THREE.Vector2(Math.sin(t) * 52, Math.cos(t) * 82),
    innerFn: (t) => new THREE.Vector2(Math.sin(t) * 38, Math.cos(t) * 58),
    centerFn: (t) => new THREE.Vector2(Math.sin(t) * 45, Math.cos(t) * 70),
  },
  {
    id: 'desert',
    name: 'Pista Desierto',
    trackColor: 0x3d2617,
    borderColor: 0xf7b83c,
    centerColor: 0xfff2bb,
    groundColor: 0xd8b174,
    start: new THREE.Vector3(-2, 0.4, 70),
    rotation: Math.PI,
    outerFn: (t) => {
      const radius = 55 + Math.sin(3 * t) * 10;
      return new THREE.Vector2(Math.sin(t) * radius, Math.cos(t) * 38);
    },
    innerFn: (t) => {
      const radius = 38 + Math.sin(3 * t) * 7;
      return new THREE.Vector2(Math.sin(t) * radius, Math.cos(t) * 22);
    },
    centerFn: (t) => {
      const radius = 48 + Math.sin(3 * t) * 8;
      return new THREE.Vector2(Math.sin(t) * radius, Math.cos(t) * 30);
    },
  },
  {
    id: 'neon',
    name: 'Pista Neón',
    trackColor: 0x141f43,
    borderColor: 0x79f2ff,
    centerColor: 0x9dfffb,
    groundColor: 0x0b1233,
    start: new THREE.Vector3(0, 0.4, 72),
    rotation: Math.PI,
    outerFn: (t) => {
      const x = Math.sin(t) * 40 * (1 + 0.18 * Math.cos(2 * t));
      const z = Math.cos(t) * 72;
      return new THREE.Vector2(x, z);
    },
    innerFn: (t) => {
      const x = Math.sin(t) * 28 * (1 + 0.18 * Math.cos(2 * t));
      const z = Math.cos(t) * 46;
      return new THREE.Vector2(x, z);
    },
    centerFn: (t) => {
      const x = Math.sin(t) * 34 * (1 + 0.18 * Math.cos(2 * t));
      const z = Math.cos(t) * 59;
      return new THREE.Vector2(x, z);
    },
  },
];

let currentTrack = null;
let trackGroup = new THREE.Group();
scene.add(trackGroup);

let kart;

const state = {
  speed: 0,
  turn: 0,
  position: new THREE.Vector3(),
  rotation: 0,
  keys: { forward: false, backward: false, left: false, right: false },
  laps: 0,
  bestMessage: 'Bienvenido a Arfe Bros: usa W/A/S/D para conducir.',
  lastFinish: false,
  maxLaps: 3,
  playerColor: 0x8B4513,
};

const speedEl = document.getElementById('speed');
const lapEl = document.getElementById('lap');
const messageEl = document.getElementById('message');
const trackNameEl = document.getElementById('track-name');
const trackSelect = document.getElementById('track-select');

const playerSelect = document.getElementById('player-select');
const startButton = document.getElementById('start-button');
const menuOverlay = document.getElementById('menu-overlay');
const gameOverlay = document.getElementById('game-overlay');

let gameStarted = false;

startButton.addEventListener('click', () => {
  const selectedTrack = trackSelect.value;
  const selectedPlayer = playerSelect.value;
  const colorMap = { red: 0x8B4513, yellow: 0xDAA520, purple: 0x800080 };
  state.playerColor = colorMap[selectedPlayer];
  setTrack(selectedTrack);
  kart = buildKart(state.playerColor);
  scene.add(kart.group);
  menuOverlay.style.display = 'none';
  gameOverlay.style.display = 'block';
  gameStarted = true;
});

trackSelect.addEventListener('change', () => setTrack(trackSelect.value));

window.addEventListener('keydown', (event) => {
  if (event.key === 'w' || event.key === 'W') state.keys.forward = true;
  if (event.key === 's' || event.key === 'S') state.keys.backward = true;
  if (event.key === 'a' || event.key === 'A') state.keys.left = true;
  if (event.key === 'd' || event.key === 'D') state.keys.right = true;
});
window.addEventListener('keyup', (event) => {
  if (event.key === 'w' || event.key === 'W') state.keys.forward = false;
  if (event.key === 's' || event.key === 'S') state.keys.backward = false;
  if (event.key === 'a' || event.key === 'A') state.keys.left = false;
  if (event.key === 'd' || event.key === 'D') state.keys.right = false;
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function createGroundTexture() {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#3c6b3f';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = 2;
  for (let i = 0; i < size; i += 32) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.encoding = THREE.sRGBEncoding;
  return texture;
}

function samplePath(fn, segments = 140) {
  const points = [];
  for (let i = 0; i < segments; i += 1) {
    const t = (i / segments) * Math.PI * 2;
    points.push(fn(t));
  }
  return points;
}

function buildFinishLine(position) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.25 });
  for (let i = -1; i <= 1; i += 2) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.2, 12), material);
    bar.position.set(i * 2.8, 0.12, position.z);
    group.add(bar);
  }
  return group;
}

function buildTrack(config) {
  const outerPoints = samplePath(config.outerFn, 160);
  const innerPoints = samplePath(config.innerFn, 160).reverse();
  const shape = new THREE.Shape(outerPoints);
  shape.holes.push(new THREE.Path(innerPoints));

  const trackMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 128),
    new THREE.MeshStandardMaterial({
      color: config.trackColor,
      roughness: 0.25,
      metalness: 0.08,
    })
  );
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.receiveShadow = true;

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape, 128)),
    new THREE.LineBasicMaterial({ color: config.borderColor, transparent: true, opacity: 0.85 })
  );
  edge.rotation.x = -Math.PI / 2;

  const centerPoints = samplePath(config.centerFn, 200).map((point) => new THREE.Vector3(point.x, 0.05, point.y));
  const centerLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(centerPoints),
    new THREE.LineDashedMaterial({ color: config.centerColor, dashSize: 2.5, gapSize: 2.5, linewidth: 2 })
  );
  centerLine.computeLineDistances();
  centerLine.rotation.x = -Math.PI / 2;

  return {
    mesh: trackMesh,
    edge,
    centerLine,
    finishLine: buildFinishLine(config.start),
    outerPoints,
    innerPoints,
    config,
  };
}

function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function isOnTrack(x, z) {
  const point = new THREE.Vector2(x, z);
  return pointInPolygon(point, currentTrack.outerPoints) && !pointInPolygon(point, currentTrack.innerPoints);
}

function setTrack(trackId) {
  const next = trackConfigs.find((item) => item.id === trackId) || trackConfigs[0];
  if (currentTrack) {
    trackGroup.clear();
  }
  currentTrack = buildTrack(next);
  trackGroup.add(currentTrack.mesh, currentTrack.edge, currentTrack.centerLine, currentTrack.finishLine);
  state.position.copy(next.start);
  state.rotation = next.rotation;
  state.laps = 0;
  state.lastFinish = false;
  state.bestMessage = `Prefiere la ${next.name} y acelera.`;
  trackNameEl.textContent = next.name;
  trackSelect.value = next.id;
}

function buildKart(color) {
  const group = new THREE.Group();

  // Patata: esfera alargada
  const potatoGeo = new THREE.SphereGeometry(1.2, 16, 12);
  potatoGeo.scale(1, 0.8, 1.5);
  const potato = new THREE.Mesh(potatoGeo, new THREE.MeshStandardMaterial({ color: color, roughness: 0.8 }));
  potato.position.y = 0.6;
  potato.castShadow = true;
  group.add(potato);

  // Ojos: dos esferas pequeñas
  const eyeGeo = new THREE.SphereGeometry(0.1, 8, 8);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
  const eye1 = new THREE.Mesh(eyeGeo, eyeMat);
  eye1.position.set(0.3, 0.8, 0.8);
  group.add(eye1);
  const eye2 = new THREE.Mesh(eyeGeo, eyeMat);
  eye2.position.set(-0.3, 0.8, 0.8);
  group.add(eye2);

  // Ruedas: cilindros pequeños
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.4, 8);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });
  for (const [x, z] of [[0.6, 0.8], [-0.6, 0.8], [0.6, -0.8], [-0.6, -0.8]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.2, z);
    wheel.castShadow = true;
    group.add(wheel);
  }

  return { group };
}

function updatePhysics(delta) {
  const accel = state.keys.forward ? 0.09 : 0;
  const brake = state.keys.backward ? 0.14 : 0;
  const turn = state.keys.left ? 1 : state.keys.right ? -1 : 0;

  state.speed += accel - brake;
  state.speed -= Math.sign(state.speed) * 0.018;
  state.speed = Math.max(Math.min(state.speed, 8.2), -3.5);

  const turnScale = Math.max(0.18, 1 - Math.abs(state.speed) / 8.2);
  state.rotation += turn * 0.035 * (state.speed !== 0 ? Math.sign(state.speed) : 1) * turnScale;

  const forward = new THREE.Vector3(Math.sin(state.rotation), 0, Math.cos(state.rotation));
  state.position.addScaledVector(forward, state.speed * delta * 18);

  if (!isOnTrack(state.position.x, state.position.z)) {
    state.speed *= 0.92;
    state.position.addScaledVector(forward, -state.speed * delta * 5);
    state.bestMessage = '¡Cuidado! Vuelve al circuito antes de perder velocidad.';
  } else {
    state.bestMessage = 'Acelera y controla la curva. ¡Tú puedes!';
  }

  const finishZ = currentTrack.config.start.z;
  const crossing = state.position.z > finishZ - 2 && state.position.z < finishZ + 4 && Math.abs(state.position.x - currentTrack.config.start.x) < 8 && state.speed > 0;
  if (crossing && !state.lastFinish) {
    state.laps += 1;
    if (state.laps >= state.maxLaps) {
      state.bestMessage = '¡Perfecto! Carrera completada en Arfe Bros.';
      state.speed = 0;
    } else {
      state.bestMessage = `Vueltas: ${state.laps} / ${state.maxLaps} — sigue así.`;
    }
  }
  state.lastFinish = crossing;

  if (state.laps >= state.maxLaps) {
    state.speed = 0;
  }
}

function updateCamera() {
  const offset = new THREE.Vector3(0, 5.2, -10).applyAxisAngle(new THREE.Vector3(0, 1, 0), state.rotation);
  camera.position.copy(state.position).add(offset);
  camera.lookAt(new THREE.Vector3(state.position.x, state.position.y + 0.8, state.position.z));
}

function updateUI() {
  speedEl.textContent = Math.round(Math.abs(state.speed * 22));
  lapEl.textContent = `${state.laps} / ${state.maxLaps}`;
  messageEl.textContent = state.bestMessage;
}

let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  if (!gameStarted) return;
  const delta = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  updatePhysics(delta);
  kart.group.position.copy(state.position);
  kart.group.rotation.y = state.rotation;
  updateCamera();
  updateUI();
}
requestAnimationFrame(animate);
