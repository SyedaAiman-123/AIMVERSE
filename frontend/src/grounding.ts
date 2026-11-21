import * as THREE from 'three'

/** The avatar GLB's origin is at hip height, not at her feet. This measures the real bounding box so a caller can lift her
 *  until the soles sit exactly on the floor (uniform scaling keeps her proportions). */
export function measureGrounding(model: THREE.Object3D) {
  model.updateMatrixWorld(true)
  const box = new THREE.Box3().setFromObject(model)
  return { lift: -box.min.y, height: box.max.y - box.min.y }
}

/** Natural standing height used in-world (metres). */
export const AVATAR_HEIGHT = 1.68
