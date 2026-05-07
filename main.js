const scene = new THREE.Scene();
const skyColor = 0x000011;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(0x001122, 50, 300);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // for 4K-ish
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0x001122, 0x000033, 0.3);
scene.add(ambient);

const neonLight1 = new THREE.DirectionalLight(0x00ffff, 0.8);
neonLight1.position.set(10, 20, 10);
neonLight1.castShadow = true;
neonLight1.shadow.mapSize.set(4096, 4096);
scene.add(neonLight1);

const neonLight2 = new THREE.DirectionalLight(0xff00ff, 0.5);
neonLight2.position.set(-10, 15, -10);
scene.add(neonLight2);

const pointLight1 = new THREE.PointLight(0x00aaff, 2, 100);
pointLight1.position.set(0, 10, 0);
scene.add(pointLight1);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(420, 420, 6, 6),
  new THREE.MeshStandardMaterial({
    map: createGroundTexture(),
    color: 0x111111,
    roughness: 0.9,
    metalness: 0.1,
  }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const trackConfigs = [
  {
    id: 'cyberpunk',
    name: 'Pista Cyberpunk',
    trackColor: 0x000000,
    borderColor: 0x00ffff,
    centerColor: 0xffffff,
    groundColor: 0x111111,
    start: new THREE.Vector3(0, 0.4, 75),
    rotation: Math.PI,
    outerFn: (t) => new THREE.Vector2(Math.sin(t) * 52, Math.cos(t) * 82),
    innerFn: (t) => new THREE.Vector2(Math.sin(t) * 38, Math.cos(t) * 58),
    centerFn: (t) => new THREE.Vector2(Math.sin(t) * 45, Math.cos(t) * 70),
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
  bestMessage: 'Bienvenido a Cyberpunk Racing: acelera en la noche neón.',
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

  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(0,255,255,0.3)';
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

  // Billboards
  const billboardMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.3 });
  const billboard1 = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), billboardMat);
  billboard1.position.set(20, 3, 20);
  billboard1.rotation.y = Math.PI / 4;
  const billboard2 = new THREE.Mesh(new THREE.PlaneGeometry(4, 2), billboardMat);
  billboard2.position.set(-20, 3, -20);
  billboard2.rotation.y = -Math.PI / 4;

  return {
    mesh: trackMesh,
    edge,
    centerLine,
    finishLine: buildFinishLine(config.start),
    billboard1,
    billboard2,
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
  trackGroup.add(currentTrack.mesh, currentTrack.edge, currentTrack.centerLine, currentTrack.finishLine, currentTrack.billboard1, currentTrack.billboard2);
  state.position.copy(next.start);
  state.rotation = next.rotation;
  state.laps = 0;
  state.lastFinish = false;
  state.bestMessage = `Entra en ${next.name} y acelera bajo las luces neón.`;
  trackNameEl.textContent = next.name;
  trackSelect.value = next.id;
}

function buildKart(color) {
  const group = new THREE.Group();

  // Body: low, wide, aerodynamic
  const bodyGeo = new THREE.BoxGeometry(3, 0.8, 5);
  bodyGeo.scale(1, 0.5, 1);
  const body = new THREE.Mesh(bodyGeo, new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.1, metalness: 0.9 }));
  body.position.y = 0.4;
  body.castShadow = true;
  group.add(body);

  // Carbon fiber accents
  const accentGeo = new THREE.BoxGeometry(2.8, 0.1, 4.8);
  const accent = new THREE.Mesh(accentGeo, new THREE.MeshStandardMaterial({ color: color, roughness: 0.2, metalness: 0.8, emissive: color, emissiveIntensity: 0.1 }));
  accent.position.y = 0.5;
  group.add(accent);

  // Massive rear wing
  const wingGeo = new THREE.BoxGeometry(3.5, 0.1, 0.5);
  const wing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.7 }));
  wing.position.set(0, 1.2, -2);
  group.add(wing);

  // Front wing
  const frontWing = new THREE.Mesh(wingGeo, new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.3, metalness: 0.7 }));
  frontWing.position.set(0, 0.3, 2);
  group.add(frontWing);

  // Wheels: racing slicks
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
  for (const [x, z] of [[1.2, 1.5], [-1.2, 1.5], [1.2, -1.5], [-1.2, -1.5]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.4, z);
    wheel.castShadow = true;
    group.add(wheel);
  }

  // Neon accents
  const neonGeo = new THREE.BoxGeometry(0.1, 0.1, 4);
  const neonMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
  const neon1 = new THREE.Mesh(neonGeo, neonMat);
  neon1.position.set(1.5, 0.6, 0);
  group.add(neon1);
  const neon2 = new THREE.Mesh(neonGeo, neonMat);
  neon2.position.set(-1.5, 0.6, 0);
  group.add(neon2);

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
    state.bestMessage = '¡Cuidado! Vuelve a la pista neón antes de perder velocidad.';
  } else {
    state.bestMessage = 'Acelera y controla la curva en la noche cyberpunk. ¡Tú puedes!';
  }

  const finishZ = currentTrack.config.start.z;
  const crossing = state.position.z > finishZ - 2 && state.position.z < finishZ + 4 && Math.abs(state.position.x - currentTrack.config.start.x) < 8 && state.speed > 0;
  if (crossing && !state.lastFinish) {
    state.laps += 1;
    if (state.laps >= state.maxLaps) {
      state.bestMessage = '¡Perfecto! Carrera completada en Cyberpunk Racing.';
      state.speed = 0;
    } else {
      state.bestMessage = `Vueltas: ${state.laps} / ${state.maxLaps} — sigue dominando la pista.`;
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

const rainDrops = [];
for (let i = 0; i < 500; i++) {
  const drop = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.3), new THREE.MeshBasicMaterial({ color: 0x00aaff, transparent: true, opacity: 0.6 }));
  drop.position.set(Math.random() * 400 - 200, Math.random() * 50 + 10, Math.random() * 400 - 200);
  scene.add(drop);
  rainDrops.push(drop);
}

function updateRain(delta) {
  for (const drop of rainDrops) {
    drop.position.y -= 15 * delta;
    if (drop.position.y < 0) drop.position.y = 50;
  }
}

let lastTime = performance.now();
function animate(time) {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  if (!gameStarted) return;
  const delta = Math.min(0.033, (time - lastTime) / 1000);
  lastTime = time;

  updatePhysics(delta);
  updateRain(delta);
  kart.group.position.copy(state.position);
  kart.group.rotation.y = state.rotation;
  updateCamera();
  updateUI();
}
requestAnimationFrame(animate);
