import * as THREE from "three";
import type { Creature, TypeColis } from "../../shared/donnees";
import { RAPIER, type DynamicProp } from "./physics";

// "Mannequins" pour le menu de debug (F1) : des formes simples qui remplacent les créatures
// et les colis tant que les vrais modèles et comportements ne sont pas faits (jalons J1 et suivants).
// Ils ne bougent pas tout seuls : les créatures se contentent de vous fixer… ce qui suffit à mettre mal à l'aise.

/** Couleurs des mannequins (purement visuel, donc pas dans /data). */
const COULEUR_CREATURE: Record<string, number> = {
  rodeur: 0x2b2f26,
  timide: 0xd8d3c4,
  essaim: 0x3a2a12,
  mimic: 0x8a6a42,
  sirene: 0x2a3a4a,
  gros: 0x3b2020,
};
const COULEUR_COLIS: Record<string, number> = {
  pizza: 0xb08a5a,
  lourd: 0xd7d7d2,
  fragile: 0xf2c6d8,
  bruyant: 0xe0c040,
  vivant: 0x6fa860,
  maudit: 0x4a1450,
};

export interface MannequinCreature {
  creature: Creature;
  object: THREE.Object3D;
  collider: RAPIER.Collider;
}

export function creerMannequinCreature(
  scene: THREE.Scene,
  world: RAPIER.World,
  creature: Creature,
  position: THREE.Vector3,
): MannequinCreature {
  // Le boss est énorme, l'essaim est petit.
  const echelle = creature.boss ? 2.6 : creature.id === "essaim" ? 0.6 : 1;
  const rayon = 0.4 * echelle;
  const demiHauteur = 0.6 * echelle;
  const group = new THREE.Group();

  const corps = new THREE.Mesh(
    new THREE.CapsuleGeometry(rayon, demiHauteur * 2, 4, 10),
    new THREE.MeshStandardMaterial({ color: COULEUR_CREATURE[creature.id] ?? 0x333333, roughness: 0.9 }),
  );
  corps.position.y = demiHauteur + rayon;
  corps.castShadow = true;
  group.add(corps);

  // Deux yeux qui brillent (le bloom les fait baver dans le noir).
  const oeil = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 0.3, 0.2) });
  for (const cote of [-1, 1]) {
    const o = new THREE.Mesh(new THREE.SphereGeometry(0.06 * echelle, 8, 6), oeil);
    o.position.set(cote * 0.14 * echelle, (demiHauteur * 2 + rayon) * 0.92, rayon * 0.85);
    group.add(o);
  }

  group.position.copy(position);
  scene.add(group);
  const collider = world.createCollider(
    RAPIER.ColliderDesc.capsule(demiHauteur, rayon).setTranslation(position.x, position.y + demiHauteur + rayon, position.z),
  );
  return { creature, object: group, collider };
}

/** Un colis "boîte" poussable, dont la taille dépend du type. */
export function creerMannequinColis(
  scene: THREE.Scene,
  world: RAPIER.World,
  type: TypeColis,
  position: THREE.Vector3,
): DynamicProp {
  // Taille approximative selon le nombre de porteurs (un frigo est plus gros qu'une pizza).
  const taille =
    type.porteursMin >= 2
      ? new THREE.Vector3(0.8, 1.7, 0.7)
      : type.id === "pizza"
        ? new THREE.Vector3(0.42, 0.1, 0.42)
        : new THREE.Vector3(0.5, 0.45, 0.5);
  const couleur = COULEUR_COLIS[type.id] ?? 0x999999;
  const materiau = new THREE.MeshStandardMaterial({
    color: couleur,
    roughness: 0.85,
    // Le colis maudit luit un peu.
    emissive: type.maudit ? new THREE.Color(0x6a00a0) : new THREE.Color(0x000000),
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(taille.x, taille.y, taille.z), materiau);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(position.x, position.y + taille.y / 2 + 0.05, position.z),
  );
  // Densité : un colis lourd ne se pousse presque pas.
  const densite = type.porteursMin >= 2 ? 400 : 60;
  world.createCollider(RAPIER.ColliderDesc.cuboid(taille.x / 2, taille.y / 2, taille.z / 2).setDensity(densite), body);
  return { object: mesh, body };
}
