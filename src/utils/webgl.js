import gsap from "gsap";
import * as THREE from "three";

/**
 * 设置 canvas 的绘图缓冲区的尺寸
 * @param {HTMLCanvasElement} canvas
 * @param {boolean} [useDevicePixelRatio=true]
 * @returns {{ pixelRatio: number; width: number; height: number }}
 */
function setupCanvas(canvas, useDevicePixelRatio = true) {
  const pixelRatio = useDevicePixelRatio ? window.devicePixelRatio : 1;
  const width = Math.floor(canvas.clientWidth * pixelRatio);
  const height = Math.floor(canvas.clientHeight * pixelRatio);

  canvas.width = width;
  canvas.height = height;

  return { pixelRatio, width, height };
}

/**
 * 创建方形波纹效果
 * @param {THREE.Vector3} position
 * @param {THREE.Vector3} scale
 * @param {number} combo
 * @returns {THREE.Mesh[]}
 */
function createSquareRippleEffect(position, scale, combo) {
  const halfWidth = scale.x / 2;
  const halfHeight = scale.z / 2;

  // 波纹数组
  const ripples = [];
  // 波纹层数：根据 combo 决定层数
  const count = combo < 2 ? 1 : Math.min(combo, 5);

  for (let i = 0; i < count; i++) {
    const shape = new THREE.Shape();
    const thickness = 0.06 * Math.pow(0.6, i);

    // 外圈
    const outerHalfWidth = halfWidth + thickness;
    const outerHalfHeight = halfHeight + thickness;
    shape.moveTo(-outerHalfWidth, -outerHalfHeight);
    shape.lineTo(outerHalfWidth, -outerHalfHeight);
    shape.lineTo(outerHalfWidth, outerHalfHeight);
    shape.lineTo(-outerHalfWidth, outerHalfHeight);
    shape.lineTo(-outerHalfWidth, -outerHalfHeight);

    // 内圈
    const hole = new THREE.Path();
    hole.moveTo(-halfWidth, -halfHeight);
    hole.lineTo(-halfWidth, halfHeight);
    hole.lineTo(halfWidth, halfHeight);
    hole.lineTo(halfWidth, -halfHeight);
    hole.lineTo(-halfWidth, -halfHeight);
    shape.holes.push(hole);

    const geometry = new THREE.ShapeGeometry(shape);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      depthWrite: false,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });

    // 波纹
    const ripple = new THREE.Mesh(geometry, material);
    ripple.rotation.x = -Math.PI / 2;
    ripple.position.copy(position);

    // 波纹动画
    const rippleDistance = i > 0 ? 0.4 - i * 0.05 : 0;
    const scaleX = (halfWidth + rippleDistance) / halfWidth;
    const scaleY = (halfHeight + rippleDistance) / halfHeight;
    gsap
      .timeline({ delay: i * 0.1 })
      .to(ripple.scale, { x: scaleX, y: scaleY, duration: 1.0 - i * 0.15, ease: "power1.out" })
      .to(material, { opacity: 0, duration: 1.0, ease: "power1.out" }, "<")
      .call(() => {
        ripple.removeFromParent();
        material.dispose();
        geometry.dispose();
      });

    ripples.push(ripple);
  }

  return ripples;
}

/**
 * 为材质添加垂直透明渐变效果 (底部渐隐)
 * @param {number} topY - 渐变开始的高度（在这个高度以上是不透明的）
 * @param {number} bottomY - 完全透明的高度（在这个高度以下完全不可见）
 * @returns {(shader: THREE.WebGLProgramParametersWithUniforms) => void}
 */
function addVerticalAlphaFade(topY, bottomY) {
  return (shader) => {
    // 在 Vertex Shader 中计算世界坐标高度
    shader.vertexShader = `
      varying float vY;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
        #include <begin_vertex>
        // 计算顶点在世界空间中的绝对高度
        vec4 customWorldPos = modelMatrix * vec4( position, 1.0 );
        vY = customWorldPos.y;
      `,
    );

    // 在 Fragment Shader 中修改透明度
    shader.fragmentShader = `
      varying float vY;
      ${shader.fragmentShader}
    `.replace(
      "#include <fog_fragment>", // 借用 fog 的注入点
      `
        // smoothstep 会在 bottomY 和 topY 之间平滑过渡
        // vY > topY => factor = 1.0 (不透明)
        // vY < bottomY => factor = 0.0 (全透明)
        float alphaFactor = smoothstep(${bottomY.toFixed(1)}, ${topY.toFixed(1)}, vY);
        
        // 应用透明度渐变
        gl_FragColor.a *= alphaFactor;
      `,
    );
  };
}

export { setupCanvas, createSquareRippleEffect, addVerticalAlphaFade };
