// groktimus-model.js — groktimus: a Grok mind riding an Optimus-class humanoid.
// The silhouette every factory-robot render taught you: pearl-white shell
// panels over a charcoal undersuit, a featureless gloss-black faceplate with a
// single light bar that doubles as a voice meter, articulated white limbs with
// dark joints — plus the streamer kit this rig always ships with: gunmetal
// headphones and a boom mic that lights up when it talks.
// Returns { group, update(t,{speaking}) } via createGroktimus(), or a full
// staged scene via mountScene(canvas).
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

export const PALETTE = {
  shell: 0xe9ebee,      // pearl-white panels
  shell2: 0xd6dade,     // slightly shaded panel variant
  suit: 0x191b20,       // charcoal undersuit / joints
  steel: 0x8b93a1,      // hardware
  gunmetal: 0x0c0e12,   // headphones
  glass: 0x040507,      // faceplate
  glow: 0xdff3ff,       // light bar / mic (cold white)
  ink: 0x0a0b0e,
  bg: 0x0a0b0e,
};

function shellMat(color, rough = 0.42, metal = 0.25) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
}
function rbox(w, h, d, r, mat) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

export function createGroktimus() {
  const group = new THREE.Group();

  const matShell = shellMat(PALETTE.shell, 0.34, 0.22);
  const matShell2 = shellMat(PALETTE.shell2, 0.4, 0.2);
  const matSuit = shellMat(PALETTE.suit, 0.62, 0.18);
  const matSteel = shellMat(PALETTE.steel, 0.3, 0.65);
  const matHP = shellMat(PALETTE.gunmetal, 0.35, 0.55);
  const matGlass = new THREE.MeshStandardMaterial({ color: PALETTE.glass, roughness: 0.08, metalness: 0.6 });
  const matGlow = new THREE.MeshStandardMaterial({
    color: PALETTE.glow, emissive: PALETTE.glow, emissiveIntensity: 1.5, roughness: 0.3,
  });
  const matMic = new THREE.MeshStandardMaterial({ color: PALETTE.gunmetal, roughness: 0.35, metalness: 0.4 });

  // ---------- HEAD — smooth white helmet, gloss-black faceplate ----------
  const head = new THREE.Group();
  group.add(head);

  const helmet = rbox(1.62, 1.5, 1.62, 0.5, matShell);
  helmet.position.set(0, 2.06, -0.06);
  head.add(helmet);

  // faceplate: one featureless black pane sunk into the helmet front
  const face = rbox(1.16, 0.96, 0.5, 0.32, matGlass);
  face.position.set(0, 2.02, 0.62);
  head.add(face);

  // the light bar — groktimus's only "eye", and its voice meter
  const bars = [];
  const bar = rbox(0.78, 0.1, 0.08, 0.035, matGlow);
  bar.position.set(0, 2.08, 0.9);
  head.add(bar);
  bars.push(bar);

  // chin vent slits on the faceplate
  for (let i = -1; i <= 1; i++) {
    const slot = rbox(0.26, 0.045, 0.06, 0.02, matSuit);
    slot.position.set(i * 0.32, 1.68, 0.86);
    head.add(slot);
  }

  // neck — dark stack between helmet and collar
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.4, 0.5, 18), matSuit);
  neck.position.set(0, 1.28, -0.02);
  neck.castShadow = true;
  group.add(neck);

  // ---------- TORSO — white chest plate over charcoal core ----------
  const torso = new THREE.Group();
  group.add(torso);

  // broad chest plate, slight forward lean of mass
  const chest = rbox(2.14, 1.28, 1.24, 0.3, matShell);
  chest.position.set(0, 0.62, 0.02);
  torso.add(chest);
  // sternum seam — two panel halves read
  const seam = rbox(0.05, 1.0, 0.06, 0.02, matSuit);
  seam.position.set(0, 0.64, 0.66);
  torso.add(seam);
  // collar ring
  const collar = rbox(1.1, 0.22, 0.9, 0.1, matShell2);
  collar.position.set(0, 1.24, 0.0);
  torso.add(collar);

  // charcoal midriff — the flexible waist every humanoid hides here
  const waist = rbox(1.34, 0.72, 0.92, 0.2, matSuit);
  waist.position.set(0, -0.36, 0.0);
  torso.add(waist);

  // pelvis shell
  const pelvis = rbox(1.62, 0.56, 1.04, 0.22, matShell2);
  pelvis.position.set(0, -0.86, 0.0);
  torso.add(pelvis);

  // ---------- ARMS — white segments, dark joints, dark hands ----------
  const arms = [];
  for (const sx of [-1, 1]) {
    const arm = new THREE.Group();
    // shoulder pad
    const pad = rbox(0.66, 0.6, 0.78, 0.24, matShell);
    pad.position.set(sx * 0.1, 0.1, 0);
    arm.add(pad);
    // upper arm
    const upper = rbox(0.44, 0.86, 0.5, 0.16, matShell2);
    upper.position.set(sx * 0.08, -0.52, 0);
    arm.add(upper);
    // elbow joint
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.23, 18, 18), matSuit);
    elbow.position.set(sx * 0.08, -1.02, 0);
    elbow.castShadow = true;
    arm.add(elbow);
    // forearm — slight flare, like a gauntlet
    const fore = rbox(0.42, 0.8, 0.46, 0.15, matShell);
    fore.position.set(sx * 0.08, -1.5, 0.03);
    arm.add(fore);
    // dark articulated hand
    const hand = rbox(0.3, 0.4, 0.4, 0.11, matSuit);
    hand.position.set(sx * 0.08, -2.02, 0.05);
    arm.add(hand);
    arm.position.set(sx * 1.24, 1.02, 0.02);
    arm.rotation.z = sx * 0.05;
    torso.add(arm);
    arms.push(arm);
  }

  // ---------- LEGS — white thigh + shin plates, dark knees and feet ----------
  for (const sx of [-1, 1]) {
    const hipX = sx * 0.5;
    const thigh = rbox(0.56, 0.92, 0.66, 0.2, matShell);
    thigh.position.set(hipX, -1.52, 0.02);
    torso.add(thigh);
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.24, 18, 18), matSuit);
    knee.position.set(hipX, -2.02, 0.04);
    knee.castShadow = true;
    torso.add(knee);
    // shin with a calf flare
    const shin = rbox(0.5, 0.94, 0.6, 0.18, matShell2);
    shin.position.set(hipX, -2.52, 0.0);
    torso.add(shin);
    const foot = rbox(0.54, 0.24, 0.94, 0.1, matSuit);
    foot.position.set(hipX, -3.06, 0.14);
    torso.add(foot);
  }

  // ---------- HEADPHONES + BOOM MIC (the streamer kit) ----------
  const band = new THREE.Mesh(new THREE.TorusGeometry(1.06, 0.08, 14, 44, Math.PI), matHP);
  band.position.set(0, 2.14, -0.06);
  band.castShadow = true;
  head.add(band);
  for (const sx of [-1, 1]) {
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.32, 26), matHP);
    cup.rotation.z = Math.PI / 2;
    cup.position.set(sx * 0.98, 2.02, -0.06);
    cup.castShadow = true;
    head.add(cup);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.032, 10, 26), matGlow);
    ring.rotation.y = Math.PI / 2;
    ring.position.set(sx * 1.15, 2.02, -0.06);
    head.add(ring);
  }
  // boom mic from the left cup to just under the faceplate
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.98, 1.8, 0.16),
    new THREE.Vector3(-0.92, 1.44, 0.62),
    new THREE.Vector3(-0.56, 1.3, 0.9),
    new THREE.Vector3(-0.2, 1.36, 0.96),
  ]);
  const boom = new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.042, 10, false), matHP);
  boom.castShadow = true;
  head.add(boom);
  const micBall = new THREE.Mesh(new THREE.SphereGeometry(0.12, 20, 20), matMic);
  micBall.position.set(-0.17, 1.36, 0.98);
  head.add(micBall);

  // stand on the same floor as the rest of the rig (ground plane is at -1.63)
  group.scale.setScalar(0.94);
  group.position.y = 1.36;
  const baseY = group.position.y;

  // ---------- animation ----------
  let blinkT = 2.0, blinking = 0;

  function update(t, opts = {}) {
    const speaking = !!opts.speaking;
    // idle sway — it stands, it doesn't float
    group.position.y = baseY + Math.sin(t * 1.1) * 0.025;
    // head tracks around slowly; nods harder while talking
    head.rotation.x = Math.sin(t * (speaking ? 4.0 : 0.9)) * (speaking ? 0.05 : 0.016);
    head.rotation.y = Math.sin(t * 0.4) * 0.12;
    torso.rotation.y = Math.sin(t * 0.4) * 0.04;
    // arms swing slightly out of phase
    arms[0].rotation.x = Math.sin(t * 1.2 + 1) * 0.05;
    arms[1].rotation.x = Math.sin(t * 1.2) * 0.05;
    // light-bar "blink": snaps thin for a beat
    blinkT -= 0.016;
    if (blinkT <= 0) { blinking = 1; blinkT = 2.5 + Math.random() * 3.5; }
    if (blinking > 0) {
      blinking -= 0.14;
      const sy = Math.max(0.14, Math.abs(Math.cos(blinking * Math.PI)));
      bars.forEach(b => (b.scale.y = sy));
      if (blinking <= 0) bars.forEach(b => (b.scale.y = 1));
    }
    // speaking: the bar brightens and pulses wide, the mic lights up
    matGlow.emissiveIntensity = speaking ? 2.2 + Math.sin(t * 11) * 0.7 : 1.35 + Math.sin(t * 1.6) * 0.15;
    matMic.emissive.setHex(speaking ? PALETTE.glow : 0x000000);
    matMic.emissiveIntensity = speaking ? 0.7 + Math.sin(t * 12) * 0.3 : 0;
    const w = speaking ? 1 + Math.abs(Math.sin(t * 9)) * 0.18 : 1;
    bars.forEach(b => (b.scale.x = w));
  }

  return { group, update, bars };
}

// Full ready-to-render scene (lights + shadow ground + framing).
export function mountScene(canvas, { transparent = false, space = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: transparent });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  if (!transparent) renderer.setClearColor(PALETTE.bg, 1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  camera.position.set(0, 1.5, 15.2);
  camera.lookAt(0, 0.78, 0);

  // studio light: the white shell wants a slightly softer key than the old
  // obsidian unit, and a cool rim to keep the panel edges crisp
  scene.add(new THREE.HemisphereLight(0xdfe9ff, 0x1a1d24, 0.65));
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.25);
  key.position.set(5, 9, 7);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 1; key.shadow.camera.far = 40;
  key.shadow.camera.left = -8; key.shadow.camera.right = 8;
  key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
  key.shadow.bias = -0.0004; key.shadow.radius = 6;
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xc9dcff, 0.45); fill.position.set(-7, 3, 5); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xa8d8ff, 0.8); rim.position.set(-2, 4, -8); scene.add(rim);
  if (space) {
    // on black the white shell already pops; keep one strong rim for the
    // silhouette and a cool bounce from below that reads as planet-light
    key.intensity = 0.9;
    rim.intensity = 1.9; rim.color.setHex(0xbfe4ff); rim.position.set(-4, 5, -7);
    const rim2 = new THREE.DirectionalLight(0xffffff, 1.2); rim2.position.set(5, 4, -6); scene.add(rim2);
    const bounce = new THREE.DirectionalLight(0x7fb6ff, 0.5); bounce.position.set(0, -6, 3); scene.add(bounce);
  }

  // no cast shadow in space — there is no floor up there
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: space ? 0 : 0.22 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -1.63;
  ground.receiveShadow = true;
  scene.add(ground);

  const bot = createGroktimus();
  scene.add(bot.group);

  function resize() {
    const w = canvas.clientWidth || canvas.width, h = canvas.clientHeight || canvas.height;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  const clock = new THREE.Clock();
  let speaking = false;
  function loop() {
    requestAnimationFrame(loop);
    bot.update(clock.getElapsedTime(), { speaking });
    renderer.render(scene, camera);
  }
  resize(); addEventListener("resize", resize); loop();

  return { setSpeaking: (v) => { speaking = v; }, resize, scene, camera, renderer, bot };
}
