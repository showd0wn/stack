import gsap from "gsap";
import * as THREE from "three";

const SHARED_GEOMETRY = new THREE.BoxGeometry(1, 1, 1);

/**
 * 创建方块
 * @param {THREE.Material} material
 * @param {THREE.Vector3} position
 * @param {THREE.Vector3} scale
 * @returns {THREE.Mesh}
 */
function createCube(material, position, scale) {
  const mesh = new THREE.Mesh(SHARED_GEOMETRY, material);
  mesh.position.copy(position);
  mesh.scale.copy(scale);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  return mesh;
}

/**
 * 堆叠方块
 * 此函数会修改 curr 的尺寸和位置，并返回被切掉的部分（如果有）
 * @param {THREE.Mesh} curr
 * @param {THREE.Mesh} prev
 * @param {'x'|'z'} axis
 * @param {number} [epsilon]
 * @returns {THREE.Mesh|null}
 */
function stackCube(curr, prev, axis, epsilon = 0.04) {
  const distance = Math.abs(curr.position[axis] - prev.position[axis]);

  // 完美堆叠
  if (distance < epsilon) {
    curr.position[axis] = prev.position[axis];
    return null;
  }

  const size = curr.scale[axis];
  const overlap = size - distance;

  // 完全未堆叠
  if (overlap <= 0) {
    return curr;
  }

  const direction = curr.position[axis] > prev.position[axis] ? 1 : -1;

  // 部分堆叠 - 创建残骸 (掉落部分)
  const debris = curr.clone();
  debris.material = /** @type {THREE.MeshToonMaterial} */ (curr.material).clone();
  debris.scale[axis] = distance;
  debris.position[axis] += (overlap / 2) * direction;

  // 部分堆叠 - 修改当前方块 (保留部分)
  curr.scale[axis] = overlap;
  curr.position[axis] -= (distance / 2) * direction;

  return debris;
}

/**
 * 方块下落动画
 * @param {THREE.Mesh} cube
 * @param {() => void} [onComplete]
 * @returns {void}
 */
function cubeFall(cube, onComplete) {
  gsap.to(cube.rotation, {
    duration: 0.8,
    x: Math.random() * 2.5,
    z: Math.random() * 2.5,
    ease: "power1.in",
  });

  gsap.to(cube.position, {
    duration: 0.8,
    y: "-=4",
    ease: "power1.in",
    onComplete: () => {
      cube.removeFromParent();
      if (Array.isArray(cube.material)) {
        cube.material.forEach((m) => m.dispose());
      } else {
        cube.material.dispose();
      }
      onComplete?.();
    },
  });
}

export { createCube, stackCube, cubeFall };
