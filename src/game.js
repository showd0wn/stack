import gsap from "gsap";
import * as THREE from "three";
import { getRandomInt, isMobileDevice } from "./utils/common.js";
import { createCube, stackCube, cubeFall } from "./utils/cube.js";
import { setupCanvas, createSquareRippleEffect, addVerticalAlphaFade } from "./utils/webgl.js";

/**
 * @typedef GameCallbacks
 * @property {() => void} [onGameInit]
 * @property {() => void} [onGameStart]
 * @property {(score: number) => void} [onGameOver]
 * @property {(score: number) => void} [onScoreChange]
 */

class Game {
  /**
   * 摄像机视野尺寸
   * @readonly
   */
  #cameraSize = 2;
  /**
   * 方块移动范围
   * @readonly
   */
  #moveRange = 1.6;
  /**
   * 方块移动速度
   * @readonly
   */
  #moveSpeed = 2.4;
  /**
   * 方块层高
   * @readonly
   */
  #layerHeight = 0.2;
  /**
   * 方块每层颜色渐变步长
   * @readonly
   */
  #hueStep = 6;
  /**
   * 初始方块层高 1
   * @readonly
   */
  #baseLayers1 = 12;
  /**
   * 初始方块层高 2
   * @readonly
   */
  #baseLayers2 = 3;
  /**
   * 预览缩放系数
   * @readonly
   */
  #previewZoomFactor = 10;
  /**
   * 预览层数
   * @readonly
   */
  #previewLayer = 15;
  /**
   * 视角上升层数
   * @readonly
   */
  #raiseLayer = 3;

  /************ 音频 ************/
  /** @type {THREE.AudioListener} */
  #audioListener;
  /** @type {THREE.Audio} */
  #soundStart;
  /** @type {THREE.Audio} */
  #soundEnd;
  /** @type {THREE.Audio} */
  #soundCombo;
  /** @type {THREE.Audio} */
  #soundCut;

  /************ 渲染 ************/
  /** @type {HTMLCanvasElement} */
  #canvas;
  /** @type {THREE.WebGLRenderer} */
  #renderer;
  /** @type {THREE.OrthographicCamera} */
  #camera;
  /** @type {THREE.DirectionalLight} */
  #shadowLight;
  /** @type {THREE.HemisphereLight} */
  #hemisphereLight;
  /** @type {THREE.Scene} */
  #scene;

  /************ 游戏状态 ************/
  /** @type {boolean} */
  #isGameStart;
  /** @type {boolean} */
  #isGameOver;
  /** @type {boolean} */
  #allowReset;

  /************ 方块 ************/
  /** @type {THREE.Mesh} */
  #curr;
  /** @type {THREE.Mesh} */
  #prev;
  /** @type {"x" | "z"} */
  #moveAxis;
  /** @type {1 | -1} */
  #moveAxisDirection;
  /** @type {number} */
  #hueOffset;
  /** @type {1 | -1} */
  #hueStepDirection;
  /** @type {number} */
  #layer;
  /** @type {number} */
  #combo;

  /************ 回调函数 ************/
  /** @type {() => void} */
  #onGameInitCallback;
  /** @type {() => void} */
  #onGameStartCallback;
  /** @type {(score: number) => void} */
  #onGameOverCallback;
  /** @type {(score: number) => void} */
  #onScoreChangeCallback;

  /**
   * @constructor
   * @param {HTMLCanvasElement} canvas
   * @param {GameCallbacks} callbacks
   */
  constructor(canvas, callbacks) {
    setupCanvas(canvas);
    this.#canvas = canvas;
    this.#onGameInitCallback = callbacks.onGameInit;
    this.#onGameStartCallback = callbacks.onGameStart;
    this.#onGameOverCallback = callbacks.onGameOver;
    this.#onScoreChangeCallback = callbacks.onScoreChange;

    // 音频
    this.#audioListener = new THREE.AudioListener();
    this.#soundStart = new THREE.Audio(this.#audioListener);
    this.#soundEnd = new THREE.Audio(this.#audioListener);
    this.#soundCombo = new THREE.Audio(this.#audioListener);
    this.#soundCut = new THREE.Audio(this.#audioListener);
    const audioLoader = new THREE.AudioLoader();
    this.#loadSound(audioLoader, this.#soundStart, "sounds/game_start.wav", 0.4);
    this.#loadSound(audioLoader, this.#soundEnd, "sounds/game_end.wav", 0.4);
    this.#loadSound(audioLoader, this.#soundCut, "sounds/stack_cut.wav", 0.4);
    this.#loadSound(audioLoader, this.#soundCombo, "sounds/stack_combo.wav", 0.6);

    // 渲染器
    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.VSMShadowMap;
    this.#renderer = renderer;

    // 摄像机
    const cameraSize = this.#cameraSize;
    const aspect = canvas.width / canvas.height;
    const left = -aspect * cameraSize;
    const right = aspect * cameraSize;
    const top = cameraSize;
    const bottom = -cameraSize;
    const [near, far] = [0.1, 100];
    const camera = new THREE.OrthographicCamera(left, right, top, bottom, near, far);
    this.#camera = camera;
    this.#camera.add(this.#audioListener);

    // 创建场景
    this.#scene = new THREE.Scene();

    // 阴影光
    const shadowLight = new THREE.DirectionalLight(0xffffff, 1.0);
    shadowLight.castShadow = true;
    shadowLight.shadow.mapSize.width = isMobileDevice ? 512 : 2048;
    shadowLight.shadow.mapSize.height = isMobileDevice ? 512 : 2048;
    shadowLight.shadow.camera.top = isMobileDevice ? 2 : 8;
    shadowLight.shadow.camera.right = isMobileDevice ? 2 : 8;
    shadowLight.shadow.camera.left = isMobileDevice ? -2 : -8;
    shadowLight.shadow.camera.bottom = isMobileDevice ? -2 : -8;
    shadowLight.shadow.intensity = 0.6;
    this.#shadowLight = shadowLight;
    // 半球光
    this.#hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x444444, 2.4);

    // 初始化游戏场景
    this.#init();
  }

  /**
   * 加载音效
   * @param {THREE.AudioLoader} audioLoader
   * @param {THREE.Audio} sound
   * @param {string} path
   * @param {number} volume
   */
  #loadSound(audioLoader, sound, path, volume = 0.5) {
    audioLoader.loadAsync(path).then((buffer) => {
      sound.setBuffer(buffer);
      sound.setVolume(volume);
    });
  }

  /**
   * 播放音效
   * @param {THREE.Audio} sound
   * @param {number} pitch
   */
  #playSound(sound, pitch = 1.0) {
    if (sound.buffer) {
      if (sound.isPlaying) sound.stop();
      sound.setPlaybackRate(pitch);
      sound.play();
    }
  }

  /**
   * 初始化游戏场景
   */
  #init() {
    this.#scene.clear();

    // 设置摄像机
    this.#camera.position.set(10, 10, 10);
    this.#camera.lookAt(0, 0, 0);
    this.#camera.zoom = 1.0;
    this.#camera.updateProjectionMatrix();

    // 设置阴影光
    this.#shadowLight.position.set(1, 2, -1);
    this.#shadowLight.target.position.set(0, 0, 0);
    this.#scene.add(this.#shadowLight, this.#shadowLight.target);

    // 设置半球光
    this.#hemisphereLight.position.set(0, 4, 0);
    this.#scene.add(this.#hemisphereLight);

    // 游戏状态
    this.#isGameStart = false;
    this.#isGameOver = false;

    // 方块颜色偏移量
    this.#hueOffset = getRandomInt(0, 360);
    // 方块颜色变化方向
    this.#hueStepDirection = Math.random() > 0.5 ? 1 : -1;

    // 方块当前层数（初始有两层方块，且顶面刚好对齐 xOz 平面）
    this.#layer = -(this.#baseLayers1 + this.#baseLayers2);
    this.#prev = this.#createGameCube(this.#baseLayers1);
    this.#layer += this.#baseLayers1;
    this.#curr = this.#createGameCube(this.#baseLayers2);
    this.#layer += this.#baseLayers2;
    this.#scene.add(this.#prev, this.#curr);

    // 方块移动状态
    this.#moveAxis = "x";
    this.#moveAxisDirection = 1;

    // 游戏初始化回调
    this.#onGameInitCallback?.();
  }

  /**
   * 创建游戏方块
   * @param {number} layer
   * @returns {THREE.Mesh}
   */
  #createGameCube(layer = 1) {
    // 计算方块尺寸
    const height = layer * this.#layerHeight;
    const scale = new THREE.Vector3(1, height, 1);
    if (this.#isGameStart) {
      scale.x = this.#curr.scale.x;
      scale.z = this.#curr.scale.z;
    }

    // 计算方块位置
    const positionY = this.#layer * this.#layerHeight + height / 2;
    const position = new THREE.Vector3(0, positionY, 0);
    if (this.#isGameStart) {
      position.x = this.#moveAxis === "x" ? -this.#moveRange : this.#curr.position.x;
      position.z = this.#moveAxis === "z" ? -this.#moveRange : this.#curr.position.z;
    }

    // 计算方块颜色
    const index = this.#layer + layer;
    const hueStep = this.#hueStep * this.#hueStepDirection;
    const hue = ((index * hueStep + this.#hueOffset + 360) % 360) / 360;
    const color = new THREE.Color().setHSL(hue, 0.5, 0.5);

    // 创建材质
    let material;
    if (index > 0) {
      material = new THREE.MeshToonMaterial({ color });
    } else {
      material = new THREE.MeshToonMaterial({ color, transparent: true });
      material.onBeforeCompile = addVerticalAlphaFade(-1.2, -2.4);
    }

    // 创建方块
    const cube = createCube(material, position, scale);
    return cube;
  }

  /**
   * 堆叠游戏方块
   */
  #stackGameCube() {
    const debris = stackCube(this.#curr, this.#prev, this.#moveAxis);

    // 完全未堆叠
    if (debris === this.#curr) {
      cubeFall(debris);
      this.#endGame();
      return;
    }

    // 完美堆叠
    if (debris === null) {
      const meshes = createSquareRippleEffect(this.#curr.position, this.#curr.scale, this.#combo);
      this.#playSound(this.#soundCombo, Math.min(1.0 + this.#combo * 0.1, 2.0));
      this.#combo++;
      this.#scene.add(...meshes);
      return;
    }

    // 部分堆叠
    cubeFall(debris);
    this.#scene.add(debris);
    this.#playSound(this.#soundCut, 1.0 + (Math.random() > 0.5 ? 1 : 0) * 0.5);
    this.#combo = 0;
  }

  /**
   * 更新游戏状态
   * @param {number} dt
   */
  update(dt) {
    if (this.#isGameStart && !this.#isGameOver) {
      // 沿当前方向移动
      this.#curr.position[this.#moveAxis] += this.#moveSpeed * this.#moveAxisDirection * dt;

      // 边界反弹
      if (this.#curr.position[this.#moveAxis] > this.#moveRange) {
        this.#curr.position[this.#moveAxis] = this.#moveRange;
        this.#moveAxisDirection *= -1;
      } else if (this.#curr.position[this.#moveAxis] < -this.#moveRange) {
        this.#curr.position[this.#moveAxis] = -this.#moveRange;
        this.#moveAxisDirection *= -1;
      }
    }
  }

  /**
   * 绘制游戏场景
   */
  draw() {
    this.#renderer.render(this.#scene, this.#camera);
  }

  /**
   * 开始游戏
   */
  #startGame() {
    this.#isGameStart = true;
    this.#combo = 0;
    this.#playSound(this.#soundStart);
    this.#onGameStartCallback?.();
  }

  /**
   * 结束游戏
   */
  #endGame() {
    this.#isGameOver = true;
    this.#playSound(this.#soundEnd);
    this.#onGameOverCallback?.(this.#layer);

    // 摄像机拉远
    if (this.#layer >= this.#previewLayer) {
      gsap.to(this.#camera, {
        ease: "Power1.easeOut",
        zoom: this.#previewZoomFactor / this.#layer,
        duration: 0.8,
        onUpdate: () => {
          this.#camera.updateProjectionMatrix();
        },
      });
    }

    // 等待一段时间后允许重置场景，为了 GSAP 动画和 UI 过渡效果完成
    this.#allowReset = false;
    setTimeout(() => (this.#allowReset = true), 1000);
  }

  /**
   * 处理点击事件
   */
  onTouch() {
    if (this.#isGameOver && !this.#allowReset) {
      return;
    }

    if (this.#isGameOver) {
      this.#dispose();
      this.#init();
      return;
    }

    if (this.#isGameStart) {
      this.#stackGameCube();
    } else {
      this.#startGame();
    }

    if (this.#isGameOver) {
      return;
    }

    // 创建新方块
    this.#moveAxis = this.#moveAxis === "x" ? "z" : "x";
    this.#prev = this.#curr;
    this.#curr = this.#createGameCube();
    this.#layer += 1;
    this.#scene.add(this.#curr);
    this.#onScoreChangeCallback?.(this.#layer);

    // 超过一定高度，同步上移摄像机和光源
    if (this.#layer > this.#raiseLayer) {
      gsap.to(this.#camera.position, {
        y: this.#camera.position.y + this.#layerHeight,
        duration: 0.5,
      });

      gsap.to(
        [
          this.#shadowLight.position,
          this.#shadowLight.target.position,
          this.#hemisphereLight.position,
        ],
        {
          y: "+=" + this.#layerHeight,
          duration: 0.5,
        },
      );
    }
  }

  /**
   * 处理窗口尺寸变化
   */
  onResize() {
    setupCanvas(this.#canvas);
    // 更新渲染器
    this.#renderer.setSize(this.#canvas.width, this.#canvas.height, false);
    // 更新摄像机
    const aspect = this.#canvas.width / this.#canvas.height;
    this.#camera.left = -aspect * this.#cameraSize;
    this.#camera.right = aspect * this.#cameraSize;
    this.#camera.updateProjectionMatrix();
  }

  /**
   * 释放资源
   */
  #dispose() {
    this.#scene.traverse((/** @type {any} */ object) => {
      if (object.isMesh) {
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach((m) => m.dispose());
          } else {
            object.material.dispose();
          }
        }
      }
    });
  }
}

export default Game;
