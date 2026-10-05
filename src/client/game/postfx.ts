import * as THREE from "three";
import {
  BloomEffect,
  ChromaticAberrationEffect,
  EffectComposer,
  EffectPass,
  NoiseEffect,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
  VignetteEffect,
  BlendFunction,
} from "postprocessing";

// Post-traitement : des "filtres" appliqués à l'image finale, comme sur une photo.
// - Bloom : les lumières vives "bavent" (néons, ampoules, lampe torche).
// - Grain : un léger bruit de pellicule, qui donne le côté caméra bon marché.
// - Vignettage : les bords de l'écran sont assombris.
// - Aberration chromatique : les couleurs se décalent un peu sur les bords, comme un vieil objectif.
//
// La bibliothèque "postprocessing" regroupe plusieurs effets en une seule passe : c'est
// beaucoup plus rapide que de les appliquer un par un.

export function createComposer(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));

  const bloom = new BloomEffect({
    intensity: 1.4,
    luminanceThreshold: 0.55,
    luminanceSmoothing: 0.3,
    mipmapBlur: true,
    radius: 0.75,
  });
  const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  composer.addPass(new EffectPass(camera, bloom, toneMapping));

  const chromaticAberration = new ChromaticAberrationEffect({
    offset: new THREE.Vector2(0.0012, 0.0008),
    radialModulation: true,
    modulationOffset: 0.3,
  });
  const vignette = new VignetteEffect({ offset: 0.28, darkness: 0.72 });
  const grain = new NoiseEffect({ blendFunction: BlendFunction.OVERLAY, premultiply: false });
  grain.blendMode.opacity.value = 0.22;
  // L'aberration chromatique doit être dans sa propre passe (contrainte de la bibliothèque),
  // on y joint le vignettage et le grain qui, eux, peuvent se combiner avec n'importe quoi.
  composer.addPass(new EffectPass(camera, chromaticAberration, vignette, grain));

  return composer;
}
