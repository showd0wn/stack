import "./style.css";
// import "./pwa.js";
import "./components/GameUI.js";
import WebGL from "three/examples/jsm/capabilities/WebGL.js";
import Sky from "./background.js";
import Game from "./game.js";
import { debounce } from "./utils/common.js";

/**
 * @typedef {import('./game').GameCallbacks} GameCallbacks
 * @typedef {import('./components/GameUI').default} GameUI
 */

// 检测 WebGL2 支持
const isWebGL2Support = WebGL.isWebGL2Available();
// 上一帧时间戳（毫秒）
let lastTime = 0;

// 主程序入口
window.addEventListener("DOMContentLoaded", async () => {
  const { app, bgCanvas, gameCanvas, gameUI } = getElements();

  if (!isWebGL2Support) {
    app.appendChild(WebGL.getWebGL2ErrorMessage());
    throw new Error("WebGL2 is not supported.");
  }

  const sky = new Sky(bgCanvas);
  const game = new Game(gameCanvas, createGameCallbacks(gameUI, sky));

  // 初始化时间基准
  lastTime = performance.now();

  // 主循环
  function animate() {
    const now = performance.now();
    const dt = (now - lastTime) / 1000;
    lastTime = now;

    // 更新并绘制背景
    sky.update(dt);
    sky.draw();

    // 更新并绘制游戏
    game.update(dt);
    game.draw();

    requestAnimationFrame(animate);
  }

  // 开始循环
  animate();

  // 添加事件监听
  addEventListener(sky, game);
});

/**
 * 获取页面元素
 */
function getElements() {
  /** @type {HTMLDivElement} */
  const app = document.querySelector("#app");
  /** @type {HTMLCanvasElement} */
  const bgCanvas = document.querySelector("#bg-canvas");
  /** @type {HTMLCanvasElement} */
  const gameCanvas = document.querySelector("#game-canvas");
  /** @type {GameUI} */
  const gameUI = document.querySelector("game-ui");
  return { app, bgCanvas, gameCanvas, gameUI };
}

/**
 * 创建游戏回调配置
 * @param {GameUI} gameUI
 * @param {Sky} sky
 * @returns {GameCallbacks}
 */
function createGameCallbacks(gameUI, sky) {
  return {
    onGameInit: () => {
      gameUI.toInitState();
      sky.reset();
    },
    onGameStart: () => {
      gameUI.toPlayingState();
    },
    onGameOver: (score) => {
      gameUI.toGameOverState(score);
    },
    onScoreChange: (score) => {
      gameUI.updateScore(score);
      sky.updateScore(score);
    },
  };
}

/**
 * 添加事件监听
 * @param {Sky} sky
 * @param {Game} game
 * @returns {void}
 */
function addEventListener(sky, game) {
  const handleInput = (e) => {
    if (e.type === "touchstart") e.preventDefault();
    game.onTouch();
  };

  // 监听触摸事件
  window.addEventListener("touchstart", handleInput, { passive: false });

  // 监听点击事件
  window.addEventListener("click", handleInput);

  // 监听窗口尺寸变化
  window.addEventListener(
    "resize",
    debounce(() => {
      sky.onResize();
      game.onResize();
    }),
  );

  // 监听页面可见性变化
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      // 页面恢复，重置时间基准
      lastTime = performance.now();
    }
  });

  // 禁用右键菜单
  window.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}
