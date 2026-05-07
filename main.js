const scene = new THREE.Scene();
const skyColor = 0x050612;
scene.background = new THREE.Color(skyColor);
scene.fog = new THREE.Fog(0x050612, 30, 400);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 800);
camera.position.set(0, 140, 0);
camera.up.set(0, 0, -1);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
document.body.appendChild(renderer.domElement);

const ambient = new THREE.HemisphereLight(0x111133, 0x000000, 0.4);
scene.add(ambient);

const skylight = new THREE.DirectionalLight(0xe8f5ff, 0.45);
skylight.position.set(90, 120, 90);
skylight.castShadow = true;
skylight.shadow.mapSize.set(4096, 4096);
scene.add(skylight);

const flood1 = new THREE.PointLight(0xffffff, 2.5, 220, 2);
flood1.position.set(60, 70, 54);
scene.add(flood1);
const flood2 = new THREE.PointLight(0xffffff, 2.5, 220, 2);
flood2.position.set(-60, 70, 54);
scene.add(flood2);
const flood3 = new THREE.PointLight(0xffe2bb, 1.8, 220, 2);
flood3.position.set(18, 70, -40);
scene.add(flood3);

const ambientGlow = new THREE.PointLight(0x0099ff, 1.2, 140, 2);
ambientGlow.position.set(-22, 28, 34);
scene.add(ambientGlow);

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
    id: 'f1',
    name: 'Circuito F1',
    trackColor: 0x1a1a1a,
    borderColor: 0xffffff,
    centerColor: 0xff2d2d,
    groundColor: 0x111111,
    start: new THREE.Vector3(-2, 0.4, 76),
    rotation: Math.PI,
    outerPoints: [
      new THREE.Vector2(-12, 78),
      new THREE.Vector2(12, 78),
      new THREE.Vector2(38, 78),
      new THREE.Vector2(62, 70),
      new THREE.Vector2(70, 58),
      new THREE.Vector2(66, 46),
      new THREE.Vector2(50, 36),
      new THREE.Vector2(28, 28),
      new THREE.Vector2(8, 30),
      new THREE.Vector2(-14, 36),
      new THREE.Vector2(-28, 46),
      new THREE.Vector2(-38, 60),
      new THREE.Vector2(-46, 70),
      new THREE.Vector2(-50, 76),
    ],
    innerPoints: [
      new THREE.Vector2(-8, 76),
      new THREE.Vector2(8, 76),
      new THREE.Vector2(34, 76),
      new THREE.Vector2(58, 70),
      new THREE.Vector2(64, 58),
      new THREE.Vector2(60, 48),
      new THREE.Vector2(44, 38),
      new THREE.Vector2(22, 32),
      new THREE.Vector2(6, 34),
      new THREE.Vector2(-10, 38),
      new THREE.Vector2(-22, 48),
      new THREE.Vector2(-32, 58),
      new THREE.Vector2(-42, 68),
      new THREE.Vector2(-46, 74),
    ],
    drsStart: new THREE.Vector3(-12, 0.1, 78),
    drsEnd: new THREE.Vector3(38, 0.1, 78),
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
  bestMessage: 'Bienvenido al Gran Premio: domina el circuito F1.',
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

  ctx.fillStyle = '#111111';
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255,255,255,0.14)';
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

  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 600; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 3 - 1.5, y + Math.random() * 6 - 3);
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
  const outerPoints = config.outerPoints;
  const innerPoints = config.innerPoints.slice().reverse();
  const shape = new THREE.Shape(outerPoints);
  shape.holes.push(new THREE.Path(innerPoints));

  const trackMesh = new THREE.Mesh(
    new THREE.ShapeGeometry(shape, 128),
    new THREE.MeshStandardMaterial({
      color: config.trackColor,
      roughness: 0.2,
      metalness: 0.12,
    })
  );
  trackMesh.rotation.x = -Math.PI / 2;
  trackMesh.receiveShadow = true;

  const edge = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.ShapeGeometry(shape, 128)),
    new THREE.LineBasicMaterial({ color: config.borderColor, transparent: true, opacity: 0.9 })
  );
  edge.rotation.x = -Math.PI / 2;

  const centerPoints = outerPoints.map((point, index) => {
    const inner = innerPoints[innerPoints.length - 1 - index] || point;
    return new THREE.Vector3((point.x + inner.x) / 2, 0.05, (point.y + inner.y) / 2);
  });
  const centerLine = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(centerPoints),
    new THREE.LineDashedMaterial({ color: config.centerColor, dashSize: 3, gapSize: 2, linewidth: 2 })
  );
  centerLine.computeLineDistances();
  centerLine.rotation.x = -Math.PI / 2;

  const drsZone = buildDRSZone(config);
  const pitLane = buildPitLane();
  const bridge = buildBridge();
  const tunnel = buildTunnel();
  const grandstands = buildGrandstands();
  const paddock = buildPaddock();
  const billboards = buildBillboards();
  const lights = buildFloodlights();
  const fences = buildFenceLines();
  const palmTrees = buildLandscape();

  return {
    mesh: trackMesh,
    edge,
    centerLine,
    finishLine: buildFinishLine(config.start),
    drsZone,
    pitLane,
    bridge,
    tunnel,
    grandstands,
    paddock,
    billboards,
    lights,
    fences,
    palmTrees,
    outerPoints,
    innerPoints,
    config,
  };
}

function buildDRSZone(config) {
  const zone = new THREE.Mesh(
    new THREE.PlaneGeometry(config.drsEnd.x - config.drsStart.x, 2),
    new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.35, transparent: true, opacity: 0.35 })
  );
  zone.rotation.x = -Math.PI / 2;
  zone.position.set((config.drsStart.x + config.drsEnd.x) / 2, 0.02, config.drsStart.z);
  return zone;
}

function buildPitLane() {
  const group = new THREE.Group();
  const lane = new THREE.Mesh(
    new THREE.PlaneGeometry(84, 10),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.8, metalness: 0.1 })
  );
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(12, 0.01, 84);
  group.add(lane);

  const lineMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 });
  const divider = new THREE.Mesh(new THREE.BoxGeometry(84, 0.02, 0.2), lineMat);
  divider.position.set(12, 0.05, 79);
  group.add(divider);

  const garageMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.6, metalness: 0.3 });
  for (let i = 0; i < 6; i += 1) {
    const box = new THREE.Mesh(new THREE.BoxGeometry(10, 4, 6), garageMat);
    box.position.set(-24 + i * 14, 2, 89);
    group.add(box);
  }

  const truckMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7, metalness: 0.25 });
  for (let i = 0; i < 4; i += 1) {
    const truck = new THREE.Mesh(new THREE.BoxGeometry(8, 2.4, 4), truckMat);
    truck.position.set(-26 + i * 24, 1.2, 95);
    group.add(truck);
  }

  return group;
}

function buildBridge() {
  const group = new THREE.Group();
  const left = new THREE.Mesh(new THREE.BoxGeometry(4, 12, 6), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.6 }));
  left.position.set(-22, 6, 28);
  const right = left.clone();
  right.position.set(22, 6, 28);
  const top = new THREE.Mesh(new THREE.BoxGeometry(52, 1, 6), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.6 }));
  top.position.set(0, 12, 28);
  group.add(left, right, top);
  return group;
}

function buildTunnel() {
  const group = new THREE.Group();
  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(18, 8, 10), new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 }));
  tunnel.position.set(-36, 4, 42);
  group.add(tunnel);
  const led = new THREE.Mesh(new THREE.PlaneGeometry(16, 2), new THREE.MeshStandardMaterial({ color: 0x0f7fff, emissive: 0x0f7fff, emissiveIntensity: 0.5 }));
  led.rotation.x = -Math.PI / 2;
  led.position.set(-36, 7, 37);
  group.add(led);
  return group;
}

function buildGrandstands() {
  const group = new THREE.Group();
  const standMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.7 });
  for (let i = 0; i < 3; i += 1) {
    const stand = new THREE.Mesh(new THREE.BoxGeometry(36, 8, 10), standMat);
    stand.position.set(0, 4, 94 + i * 12);
    group.add(stand);
  }
  const crowdMat = new THREE.MeshBasicMaterial({ color: 0xffb500 });
  const crowd = new THREE.Mesh(new THREE.PlaneGeometry(36, 10), crowdMat);
  crowd.position.set(0, 9, 102);
  crowd.rotation.x = -Math.PI / 2;
  group.add(crowd);
  return group;
}

function buildPaddock() {
  const group = new THREE.Group();
  const padMat = new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 0.8 });
  const pad = new THREE.Mesh(new THREE.BoxGeometry(50, 4, 22), padMat);
  pad.position.set(-64, 2, 62);
  group.add(pad);
  const helipad = new THREE.Mesh(new THREE.CylinderGeometry(4, 4, 0.5, 24), new THREE.MeshStandardMaterial({ color: 0x444444, roughness: 0.7 }));
  helipad.position.set(-64, 0.25, 46);
  group.add(helipad);
  const hmark = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.5, 32), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  hmark.rotation.x = -Math.PI / 2;
  hmark.position.set(-64, 0.55, 46);
  group.add(hmark);
  return group;
}

function buildBillboards() {
  const group = new THREE.Group();
  const billboardMat = new THREE.MeshStandardMaterial({ color: 0xffcc00, emissive: 0xffcc00, emissiveIntensity: 0.4 });
  const board1 = new THREE.Mesh(new THREE.PlaneGeometry(24, 6), billboardMat);
  board1.position.set(0, 8, 86);
  board1.rotation.y = Math.PI;
  const board2 = board1.clone();
  board2.position.set(-42, 8, 44);
  board2.rotation.y = Math.PI / 2;
  group.add(board1, board2);
  return group;
}

function buildFloodlights() {
  const group = new THREE.Group();
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
  for (const pos of [[48, 0, 40], [48, 0, 84], [-46, 0, 32], [-46, 0, 72]]) {
    const pole = new THREE.Mesh(new THREE.BoxGeometry(0.8, 20, 0.8), poleMat);
    pole.position.set(pos[0], 10, pos[2]);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.5, 1.5), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.8 }));
    lamp.position.set(pos[0], 20.2, pos[2]);
    group.add(pole, lamp);
  }
  return group;
}

function buildFenceLines() {
  const group = new THREE.Group();
  const fenceMat = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.9 });
  const lineMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
  for (const pos of [[0, 0, 88], [42, 0, 68], [-42, 0, 68], [0, 0, 34]]) {
    const fence = new THREE.Mesh(new THREE.BoxGeometry(70, 3, 0.4), lineMat);
    fence.position.set(pos[0], 1.5, pos[2]);
    group.add(fence);
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.6, 5, 0.6), fenceMat);
    post.position.set(pos[0] - 34, 2.5, pos[2]);
    group.add(post);
  }
  return group;
}

function buildLandscape() {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a3a3a, roughness: 0.9 });
  for (const pos of [[18, 0, 92], [-18, 0, 92], [36, 0, 32], [-36, 0, 32], [0, 0, 58]]) {
    const palm = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.6, 8, 8), trunkMat);
    palm.position.set(pos[0], 4, pos[2]);
    group.add(palm);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 8), new THREE.MeshStandardMaterial({ color: 0x2a6c21, roughness: 0.8 }));
    leaves.position.set(pos[0], 8, pos[2]);
    group.add(leaves);
  }
  return group;
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
  trackGroup.add(
    currentTrack.mesh,
    currentTrack.edge,
    currentTrack.centerLine,
    currentTrack.finishLine,
    currentTrack.drsZone,
    currentTrack.pitLane,
    currentTrack.bridge,
    currentTrack.tunnel,
    currentTrack.grandstands,
    currentTrack.paddock,
    currentTrack.billboards,
    currentTrack.lights,
    currentTrack.fences,
    currentTrack.palmTrees
  );
  state.position.copy(next.start);
  state.rotation = next.rotation;
  state.laps = 0;
  state.lastFinish = false;
  state.bestMessage = `Entra en ${next.name} y domina el Gran Premio.`;
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
  camera.position.set(state.position.x, 130, state.position.z);
  camera.lookAt(state.position.x, 0, state.position.z);
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
