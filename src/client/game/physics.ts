import RAPIER from "@dimforge/rapier3d-compat";
import * as THREE from "three";

// Physique avec Rapier.
// Rapier ne "voit" pas les modèles 3D : on lui décrit des formes simples (boîtes, capsules…)
// qui suivent à peu près les objets. Ce sont ces formes qui se cognent, pas les modèles.

export { RAPIER };

export async function createPhysicsWorld(): Promise<RAPIER.World> {
  await RAPIER.init();
  return new RAPIER.World({ x: 0, y: -9.81, z: 0 });
}

/** Un objet 3D qui bouge selon la physique (cônes, pizza…). */
export interface DynamicProp {
  object: THREE.Object3D;
  body: RAPIER.RigidBody;
}

/** Recopie la position calculée par la physique dans l'objet 3D affiché. */
export function syncProp(prop: DynamicProp) {
  const t = prop.body.translation();
  const r = prop.body.rotation();
  prop.object.position.set(t.x, t.y, t.z);
  prop.object.quaternion.set(r.x, r.y, r.z, r.w);
}

const tmpBox = new THREE.Box3();
const tmpSize = new THREE.Vector3();
const tmpCenter = new THREE.Vector3();

/**
 * Taille d'un modèle "au repos" (sans position ni rotation), à l'échelle donnée.
 * Sert à fabriquer une boîte de collision qui tourne avec l'objet.
 */
export function localBounds(template: THREE.Object3D, scale: number) {
  const saved = { p: template.position.clone(), q: template.quaternion.clone(), s: template.scale.clone() };
  template.position.set(0, 0, 0);
  template.quaternion.identity();
  template.scale.setScalar(scale);
  template.updateMatrixWorld(true);
  tmpBox.setFromObject(template);
  template.position.copy(saved.p);
  template.quaternion.copy(saved.q);
  template.scale.copy(saved.s);
  template.updateMatrixWorld(true);
  return {
    size: tmpBox.getSize(tmpSize).clone(),
    center: tmpBox.getCenter(tmpCenter).clone(),
  };
}

/**
 * Ajoute une boîte de collision immobile qui épouse un objet posé dans la scène.
 * `shrink` réduit un peu la boîte (utile pour les voitures aux formes arrondies).
 */
export function addStaticBoxFor(
  world: RAPIER.World,
  object: THREE.Object3D,
  template: THREE.Object3D,
  scale: number,
  shrink = 1,
) {
  const { size, center } = localBounds(template, scale);
  const offset = center.clone().applyQuaternion(object.quaternion).add(object.position);
  const q = object.quaternion;
  world.createCollider(
    RAPIER.ColliderDesc.cuboid((size.x / 2) * shrink, size.y / 2, (size.z / 2) * shrink)
      .setTranslation(offset.x, offset.y, offset.z)
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }),
  );
}

/** Ajoute une boîte immobile à partir d'un centre et d'une taille. */
export function addStaticBox(world: RAPIER.World, center: THREE.Vector3, size: THREE.Vector3) {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(size.x / 2, size.y / 2, size.z / 2).setTranslation(center.x, center.y, center.z),
  );
}
