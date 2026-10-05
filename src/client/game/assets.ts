import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MTLLoader } from "three/addons/loaders/MTLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

// Chargement des modèles 3D (dossier assets/models, servi à la racine du site).
// Chaque modèle n'est téléchargé qu'une fois ; on en fait ensuite des copies légères
// (les copies partagent la même géométrie et les mêmes matériaux en mémoire).

/** Tous les modèles utilisés par la rue. Clé = nom court utilisé dans le code. */
const MODELS = {
  // Kenney — City Kit (Commercial)
  buildingA: "kenney-city-commercial/building-a.glb",
  buildingB: "kenney-city-commercial/building-b.glb",
  buildingC: "kenney-city-commercial/building-c.glb",
  buildingD: "kenney-city-commercial/building-d.glb",
  buildingE: "kenney-city-commercial/building-e.glb",
  buildingF: "kenney-city-commercial/building-f.glb",
  buildingG: "kenney-city-commercial/building-g.glb",
  buildingH: "kenney-city-commercial/building-h.glb",
  buildingI: "kenney-city-commercial/building-i.glb",
  buildingJ: "kenney-city-commercial/building-j.glb",
  buildingK: "kenney-city-commercial/building-k.glb",
  buildingL: "kenney-city-commercial/building-l.glb",
  buildingM: "kenney-city-commercial/building-m.glb",
  buildingN: "kenney-city-commercial/building-n.glb",
  skyscraperA: "kenney-city-commercial/building-skyscraper-a.glb",
  skyscraperB: "kenney-city-commercial/building-skyscraper-b.glb",
  // Kenney — City Kit (Roads)
  road: "kenney-city-roads/road-straight.glb",
  roadCrossing: "kenney-city-roads/road-crossing.glb",
  dumpster: "kenney-city-roads/dumpster.glb",
  cone: "kenney-city-roads/construction-cone.glb",
  barrier: "kenney-city-roads/construction-barrier.glb",
  // Kenney — Car Kit
  sedan: "kenney-cars/sedan.glb",
  taxi: "kenney-cars/taxi.glb",
  van: "kenney-cars/van.glb",
  police: "kenney-cars/police.glb",
  hatchback: "kenney-cars/hatchback-sports.glb",
  tire: "kenney-cars/debris-tire.glb",
  carDoor: "kenney-cars/debris-door.glb",
  // Kenney — Food Kit
  pizzaBox: "kenney-food/pizza-box.glb",
  // Quaternius — Modular Streets (format OBJ + MTL)
  streetlight: "quaternius-streets/Streetlight_Single.obj",
  streetlightDouble: "quaternius-streets/Streetlight_Double.obj",
  signStop: "quaternius-streets/Sign_Stop.obj",
  signNoParking: "quaternius-streets/Sign_NoParking.obj",
  trafficLight: "quaternius-streets/TrafficLight.obj",
} as const;

export type ModelName = keyof typeof MODELS;
export type ModelLibrary = Record<ModelName, THREE.Object3D>;

const BASE_URL = "/models/";

/** Télécharge tous les modèles. `onProgress` reçoit (chargés, total). */
export async function loadModels(onProgress: (loaded: number, total: number) => void): Promise<ModelLibrary> {
  const gltfLoader = new GLTFLoader();
  const entries = Object.entries(MODELS) as [ModelName, string][];
  let loaded = 0;
  onProgress(0, entries.length);

  const results = await Promise.all(
    entries.map(async ([name, path]) => {
      const object = path.endsWith(".obj") ? await loadObj(path) : (await gltfLoader.loadAsync(BASE_URL + path)).scene;
      prepare(object);
      onProgress(++loaded, entries.length);
      return [name, object] as const;
    }),
  );
  return Object.fromEntries(results) as ModelLibrary;
}

async function loadObj(path: string): Promise<THREE.Object3D> {
  const slash = path.lastIndexOf("/");
  const folder = BASE_URL + path.slice(0, slash + 1);
  const file = path.slice(slash + 1);
  const materials = await new MTLLoader().setPath(folder).loadAsync(file.replace(/\.obj$/, ".mtl"));
  materials.preload();
  return new OBJLoader().setMaterials(materials).setPath(folder).loadAsync(file);
}

/** Réglages communs : ombres et aspect un peu mat, façon "jouet en plastique". */
function prepare(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    for (const m of materials) {
      if (m instanceof THREE.MeshStandardMaterial) {
        m.roughness = Math.max(m.roughness, 0.65);
        m.metalness = Math.min(m.metalness, 0.2);
      }
      if (m.map) m.map.anisotropy = 4;
    }
  });
}

/** Copie légère d'un modèle (géométrie et matériaux partagés). */
export function instance(template: THREE.Object3D): THREE.Object3D {
  return template.clone(true);
}
