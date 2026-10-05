import * as THREE from "three";
import { WORLD } from "./config";
import { instance, type ModelLibrary, type ModelName } from "./assets";
import { RAPIER, addStaticBox, addStaticBoxFor, localBounds, type DynamicProp } from "./physics";

// La rue de nuit : décor, collisions, lampadaires, néons.
// Les kits Kenney sont modélisés "en miniature" : on les agrandit pour avoir des mètres.

/** Échelle des kits de ville Kenney (1 case de route = 8 m). */
const CITY_SCALE = 8;
/** Échelle des voitures Kenney (une berline ≈ 4 m de long). */
const CAR_SCALE = 1.6;
/** Échelle des modèles Quaternius (lampadaire ≈ 6 m, panneau ≈ 2,4 m). */
const STREETLIGHT_SCALE = 5.5;
const SIGN_SCALE = 4.5;
/** Opacité du faux rayon de lumière sous les lampadaires (très léger !). */
const BEAM_OPACITY = 0.022;

/** Bord intérieur des façades (x = ±9 m) : chaussée 8 m + trottoirs 5 m. */
const FACADE_X = WORLD.roadWidth / 2 + WORLD.sidewalkWidth;
const HALF_LENGTH = WORLD.streetLength / 2;

export interface Street {
  /** Objets qui bougent avec la physique (cônes). */
  props: DynamicProp[];
  /** Où apparaît le joueur, et dans quelle direction il regarde. */
  spawn: { position: THREE.Vector3; yaw: number };
  /** Où est posée la pizza au départ. */
  pizzaSpawn: THREE.Vector3;
  /** À appeler à chaque image (lampadaire qui grésille, néons). */
  update(dt: number, time: number): void;
}

export function buildStreet(scene: THREE.Scene, world: RAPIER.World, models: ModelLibrary): Street {
  const random = seededRandom(2026);
  const updaters: ((dt: number, time: number) => void)[] = [];
  const props: DynamicProp[] = [];

  /** Pose un modèle dans la scène. */
  const place = (
    name: ModelName,
    x: number,
    y: number,
    z: number,
    rotationY: number,
    scale: number,
    collision: "box" | "none" = "box",
    shrink = 1,
  ) => {
    const object = instance(models[name]);
    object.position.set(x, y, z);
    object.rotation.y = rotationY;
    object.scale.setScalar(scale);
    scene.add(object);
    if (collision === "box") addStaticBoxFor(world, object, models[name], scale, shrink);
    freeze(object);
    return object;
  };

  // --- Ciel, brouillard, lumière de lune -----------------------------------
  scene.background = new THREE.Color(WORLD.fogColor);
  scene.fog = new THREE.FogExp2(WORLD.fogColor, WORLD.fogDensity);
  scene.add(new THREE.HemisphereLight(0x2a3760, 0x0b0b0e, 0.5));
  const moon = new THREE.DirectionalLight(0x7d8fc4, 0.35);
  moon.position.set(-20, 40, 10);
  scene.add(moon);

  // --- Sol et chaussée ------------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 1 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);
  addStaticBox(world, new THREE.Vector3(0, -0.5, 0), new THREE.Vector3(200, 1, 200));

  // Asphalte un peu mouillé : moins rugueux, il renvoie les reflets des lampes.
  const wetRoad = new Map<THREE.Material, THREE.Material>();
  for (let z = -HALF_LENGTH + 4; z < HALF_LENGTH; z += CITY_SCALE) {
    // Les dalles du kit sont dessinées pour une route le long de l'axe X : on les tourne d'un quart de tour.
    const tile = place(z === 4 ? "roadCrossing" : "road", 0, -0.15, z, Math.PI / 2, CITY_SCALE, "none");
    tile.castShadow = false;
    tile.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.castShadow = false;
      const original = child.material as THREE.MeshStandardMaterial;
      if (!wetRoad.has(original)) {
        const wet = original.clone();
        wet.roughness = 0.38;
        wet.metalness = 0.15;
        wetRoad.set(original, wet);
      }
      child.material = wetRoad.get(original)!;
    });
  }

  // --- Trottoirs (simples blocs de béton, avec une bordure plus claire) ------
  const concrete = new THREE.MeshStandardMaterial({ color: 0x4a4b52, roughness: 0.92 });
  const curb = new THREE.MeshStandardMaterial({ color: 0x6d6e76, roughness: 0.85 });
  for (const side of [-1, 1]) {
    const width = WORLD.sidewalkWidth;
    const centerX = side * (WORLD.roadWidth / 2 + width / 2);
    const size = new THREE.Vector3(width, WORLD.sidewalkHeight, WORLD.streetLength + 8);
    const center = new THREE.Vector3(centerX, WORLD.sidewalkHeight / 2, 0);
    addBox(scene, concrete, center, size);
    addStaticBox(world, center, size);
    addBox(
      scene,
      curb,
      new THREE.Vector3(side * (WORLD.roadWidth / 2 + 0.12), WORLD.sidewalkHeight / 2 + 0.01, 0),
      new THREE.Vector3(0.24, WORLD.sidewalkHeight + 0.02, WORLD.streetLength + 8),
    );
  }

  // --- Immeubles des deux côtés ---------------------------------------------
  const facadePool: ModelName[] = [
    "buildingA", "buildingB", "buildingC", "buildingD", "buildingE", "buildingF", "buildingG",
    "buildingH", "buildingI", "buildingJ", "buildingK", "buildingL", "buildingM", "skyscraperA", "skyscraperB",
  ];
  /** Positions (z) des façades, pour y accrocher les néons. */
  const facades: { side: number; z: number; width: number }[] = [];
  for (const side of [-1, 1]) {
    // La façade du modèle regarde vers +Z : on la tourne vers la rue.
    const rotation = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    let z = -HALF_LENGTH;
    while (z < HALF_LENGTH) {
      const name = facadePool[Math.floor(random() * facadePool.length)];
      const { size, center } = localBounds(models[name], CITY_SCALE);
      const width = size.x;
      const depth = size.z;
      // Après rotation, la largeur du modèle court le long de la rue (axe Z).
      const target = new THREE.Vector3(side * (FACADE_X + depth / 2), 0, z + width / 2);
      const offset = center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
      place(name, target.x - offset.x, 0, target.z - offset.z, rotation, CITY_SCALE);
      facades.push({ side, z: z + width / 2, width });
      z += width + 0.3;
    }
  }
  // Immeubles qui ferment la rue aux deux bouts.
  for (const [end, name] of [[-1, "buildingN"], [1, "buildingJ"]] as const) {
    const { size, center } = localBounds(models[name], CITY_SCALE);
    const rotation = end < 0 ? 0 : Math.PI;
    const target = new THREE.Vector3(0, 0, end * (HALF_LENGTH + 1 + size.z / 2));
    const offset = center.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation);
    place(name, target.x - offset.x, 0, target.z - offset.z, rotation, CITY_SCALE);
  }
  // Murs invisibles de sécurité, au cas où on se faufilerait entre deux immeubles.
  for (const side of [-1, 1]) {
    addStaticBox(world, new THREE.Vector3(side * (FACADE_X + 0.4), 5, 0), new THREE.Vector3(0.2, 10, WORLD.streetLength + 20));
    addStaticBox(world, new THREE.Vector3(0, 5, side * (HALF_LENGTH + 1.2)), new THREE.Vector3(FACADE_X * 2 + 2, 10, 0.2));
  }

  // --- Voitures abandonnées et débris ---------------------------------------
  const road = 0.01;
  const sidewalk = WORLD.sidewalkHeight;
  place("sedan", -2.0, road, -26, 0.35, CAR_SCALE, "box", 0.92);
  place("taxi", 2.4, road, -3, Math.PI + 0.12, CAR_SCALE, "box", 0.92);
  place("van", -0.4, road, 18, 1.25, CAR_SCALE, "box", 0.92); // en travers de la rue
  place("police", 2.5, road, 34, -0.18, CAR_SCALE, "box", 0.92);
  place("hatchback", -6.4, sidewalk, 7, 0.06, CAR_SCALE, "box", 0.92); // garée sur le trottoir
  place("tire", 1.6, road + 0.45, 21, 0.4, CAR_SCALE, "none").rotation.z = Math.PI / 2;
  place("carDoor", -3.2, road, -22.5, 2.2, CAR_SCALE, "none");
  place("dumpster", 7.4, sidewalk, -12, Math.PI / 2, CITY_SCALE);
  place("barrier", -1.5, road, -HALF_LENGTH + 1.5, 0, CITY_SCALE);
  place("barrier", 2.5, road, HALF_LENGTH - 1.5, Math.PI, CITY_SCALE);
  place("signStop", 4.5, sidewalk, 11, -Math.PI / 2, SIGN_SCALE);
  place("signNoParking", -4.5, sidewalk, -30, Math.PI / 2, SIGN_SCALE);
  place("trafficLight", 4.5, sidewalk, -18, -Math.PI / 2, SIGN_SCALE);

  // Cônes de chantier : ils bougent quand on les percute ou qu'on leur lance la pizza.
  const coneHeight = localBounds(models.cone, CITY_SCALE).size.y;
  for (const [x, z] of [[1.9, 14.6], [2.9, 16.2], [-3.6, 21.4], [-1.2, 22.8], [3.4, 20.5]]) {
    const object = instance(models.cone);
    object.scale.setScalar(CITY_SCALE);
    scene.add(object);
    const body = world.createRigidBody(RAPIER.RigidBodyDesc.dynamic().setTranslation(x, road, z));
    world.createCollider(
      RAPIER.ColliderDesc.cone(coneHeight / 2, 0.3).setTranslation(0, coneHeight / 2, 0).setDensity(40),
      body,
    );
    props.push({ object, body });
  }

  // --- Lampadaires -----------------------------------------------------------
  // "on" = allumé, "flicker" = grésille, "off" = en panne (plus inquiétant).
  const lamps: { x: number; z: number; state: "on" | "flicker" | "off" }[] = [
    { x: -4.5, z: -40, state: "on" },
    { x: 4.5, z: -26, state: "off" },
    { x: -4.5, z: -10, state: "on" },
    { x: 4.5, z: 6, state: "flicker" },
    { x: -4.5, z: 24, state: "on" },
    { x: 4.5, z: 40, state: "off" },
  ];
  const lampTop = localBounds(models.streetlight, STREETLIGHT_SCALE).size.y;
  for (const lamp of lamps) {
    const pole = place("streetlight", lamp.x, sidewalk, lamp.z, 0, STREETLIGHT_SCALE, "box");
    if (lamp.state === "off") continue;

    // L'ampoule brille (le "bloom" la fera baver de lumière).
    const bulbMaterials: THREE.MeshPhongMaterial[] = [];
    const makeGlow = (m: THREE.Material) => {
      if (m.name !== "Glass") return m;
      const glow = (m as THREE.MeshPhongMaterial).clone();
      glow.emissive.set(0xffb35c);
      glow.emissiveIntensity = 4;
      bulbMaterials.push(glow);
      return glow;
    };
    pole.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.material = Array.isArray(child.material) ? child.material.map(makeGlow) : makeGlow(child.material);
    });

    const lightY = sidewalk + lampTop * 0.93;
    const light = new THREE.SpotLight(0xffaa55, 70, 16, 0.95, 0.65, 1.3);
    light.position.set(lamp.x, lightY, lamp.z);
    light.target.position.set(lamp.x * 0.6, 0, lamp.z);
    scene.add(light, light.target);

    const beam = makeLightBeam(0xffb35c, lightY);
    beam.position.set(lamp.x, lightY / 2, lamp.z);
    scene.add(beam);

    if (lamp.state === "flicker") {
      const flicker = new Flicker();
      updaters.push((dt) => {
        const level = flicker.update(dt);
        light.intensity = 70 * level;
        (beam.material as THREE.MeshBasicMaterial).opacity = BEAM_OPACITY * level;
        for (const m of bulbMaterials) m.emissiveIntensity = 0.2 + 4 * level;
      });
    }
  }

  // --- Néons colorés sur les façades ----------------------------------------
  const neonSpots = [
    { text: "PIZZA", color: "#ff2e88", side: -1, z: -17, flicker: true },
    { text: "OPEN 24/7", color: "#2ee6ff", side: 1, z: -6, flicker: false },
    { text: "HÔTEL", color: "#7dff5a", side: -1, z: 15, deadLetter: 1, flicker: false },
    { text: "BAR", color: "#ffb02e", side: 1, z: 29, flicker: true },
  ];
  for (const spot of neonSpots) {
    const sign = makeNeonSign(spot.text, spot.color, spot.deadLetter);
    const x = spot.side * (FACADE_X - 0.15);
    sign.position.set(x, 4.3, spot.z);
    sign.rotation.y = spot.side > 0 ? -Math.PI / 2 : Math.PI / 2;
    scene.add(sign);

    const light = new THREE.PointLight(spot.color, 14, 10, 2);
    light.position.set(spot.side * (FACADE_X - 1.2), 4, spot.z);
    scene.add(light);

    if (spot.flicker) {
      const flicker = new Flicker(0.15);
      const material = sign.material as THREE.MeshBasicMaterial;
      updaters.push((dt) => {
        const level = flicker.update(dt);
        material.opacity = 0.25 + 0.75 * level;
        light.intensity = 14 * level;
      });
    }
  }

  return {
    props,
    spawn: { position: new THREE.Vector3(0, 0.3, -42), yaw: Math.PI },
    pizzaSpawn: new THREE.Vector3(-2.6, sidewalk + 0.05, -38.5),
    update(dt, time) {
      for (const u of updaters) u(dt, time);
    },
  };
}

/** Un objet immobile n'a pas besoin que Three.js recalcule sa position à chaque image. */
function freeze(object: THREE.Object3D) {
  object.updateMatrixWorld(true);
  object.traverse((child) => {
    child.matrixAutoUpdate = false;
  });
}

function addBox(scene: THREE.Scene, material: THREE.Material, center: THREE.Vector3, size: THREE.Vector3) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(center);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  scene.add(mesh);
  freeze(mesh);
}

/**
 * Faux "rayon de lumière" sous un lampadaire : un cône transparent qui s'estompe vers le bas.
 * Beaucoup moins coûteux qu'un vrai brouillard volumétrique.
 */
function makeLightBeam(color: number, height: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 4;
  canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const gradient = ctx.createLinearGradient(0, 0, 0, 128);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4, 128);
  const texture = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.ConeGeometry(2.6, height, 24, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      map: texture,
      transparent: true,
      opacity: BEAM_OPACITY,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    }),
  );
  // Le cône de Three.js a sa pointe en haut : c'est ce qu'on veut (lumière qui descend).
  mesh.renderOrder = 10;
  return mesh;
}

/**
 * Panneau néon dessiné dans un <canvas> : pas besoin d'image externe.
 * `deadLetter` = indice d'une lettre grillée (plus sombre), pour le côté glauque.
 */
function makeNeonSign(text: string, color: string, deadLetter?: number): THREE.Mesh {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.font = "900 150px 'Arial Black', Impact, sans-serif";
  ctx.textBaseline = "middle";
  ctx.lineJoin = "round";

  const letters = [...text];
  const widths = letters.map((l) => ctx.measureText(l).width + 8);
  let x = (canvas.width - widths.reduce((a, b) => a + b, 0)) / 2;
  letters.forEach((letter, i) => {
    const dead = i === deadLetter;
    ctx.globalAlpha = dead ? 0.18 : 1;
    // Halo coloré, puis tube clair au centre : l'effet "néon".
    ctx.shadowColor = color;
    ctx.shadowBlur = dead ? 0 : 30;
    ctx.strokeStyle = color;
    ctx.lineWidth = 14;
    ctx.strokeText(letter, x, canvas.height / 2);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = dead ? color : "#ffffff";
    ctx.lineWidth = 4;
    ctx.strokeText(letter, x, canvas.height / 2);
    x += widths[i];
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    // Couleur > 1 : plus lumineux que le blanc, pour que le "bloom" fasse baver le néon.
    color: new THREE.Color(2.4, 2.4, 2.4),
    fog: false,
  });
  const width = Math.min(7, 1.5 * letters.length);
  return new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), material);
}

/**
 * Grésillement : la plupart du temps allumé, parfois des coupures rapides en rafale.
 * `update` renvoie un niveau entre 0 (éteint) et 1 (allumé).
 */
class Flicker {
  private timer = 0;
  private burst = 0;
  private on = true;

  constructor(private readonly nervousness = 0.35) {}

  update(dt: number): number {
    this.timer -= dt;
    if (this.timer <= 0) {
      if (this.burst > 0) {
        // Pendant une crise : on alterne très vite.
        this.on = !this.on;
        this.burst--;
        this.timer = 0.03 + Math.random() * 0.09;
      } else if (Math.random() < this.nervousness) {
        this.burst = 2 + Math.floor(Math.random() * 7);
        this.timer = 0;
      } else {
        this.on = true;
        this.timer = 0.6 + Math.random() * 2.5;
      }
    }
    return this.on ? 0.92 + Math.random() * 0.08 : 0.04;
  }
}

function seededRandom(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
