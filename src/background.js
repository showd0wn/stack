import { setupCanvas } from "./utils/webgl.js";
import { getRandomInt } from "./utils/common.js";

class Sky {
  /**
   * 色相变化步长
   * @readonly
   */
  #hueStep = 4;
  /**
   * 底部颜色色相偏移
   * @readonly
   */
  #hueBottomOffset = 24;
  /**
   * 分数过渡动画速度
   * @readonly
   */
  #scoreEaseSpeed = 3.0;

  #canvas;
  #ctx;
  #stars;

  /** @type {number} */
  #hueOffset;
  /** @type {1 | -1} */
  #hueStepDirection;

  /** @type {number} */
  #score;
  /** @type {number} */
  #currentScore;

  /**
   * @constructor
   * @param {HTMLCanvasElement} canvas
   * @param {number} [count]
   */
  constructor(canvas, count = 12) {
    const { pixelRatio } = setupCanvas(canvas);
    this.#canvas = canvas;
    this.#ctx = canvas.getContext("2d");
    this.#ctx.scale(pixelRatio, pixelRatio);
    this.reset();

    this.#stars = [];
    for (let i = 0; i < count; i++) {
      this.#stars.push(new Star(this.#canvas, this.#ctx));
    }
  }

  /**
   * 重置背景颜色
   */
  reset() {
    this.#hueOffset = getRandomInt(0, 360);
    this.#hueStepDirection = Math.random() > 0.5 ? 1 : -1;
    this.#score = 0;
    this.#currentScore = 0;
  }

  /**
   * 更新分数以改变背景颜色
   * @param {number} score
   */
  updateScore(score) {
    this.#score = score;
  }

  /**
   * 更新背景状态
   * @param {number} dt
   */
  update(dt) {
    // 缓动当前分数以实现平滑颜色过渡
    const diff = this.#score - this.#currentScore;
    if (Math.abs(diff) > 0.001) {
      this.#currentScore += diff * this.#scoreEaseSpeed * dt;
    }

    this.#stars.forEach((star) => star.update(dt));
  }

  /**
   * 绘制背景
   */
  draw() {
    this.#drawBackground();
    this.#stars.forEach((star) => star.draw());
  }

  /**
   * 绘制背景颜色
   */
  #drawBackground() {
    const width = this.#canvas.clientWidth;
    const height = this.#canvas.clientHeight;

    // 创建线性渐变
    const gradient = this.#ctx.createLinearGradient(0, 0, 0, height);

    // 计算色相
    const hueStep = this.#hueStep * this.#hueStepDirection;
    const hueTop = (hueStep * this.#currentScore + this.#hueOffset + 360) % 360;
    const hueBottom = (hueTop + this.#hueBottomOffset) % 360;

    gradient.addColorStop(0, `hsl(${hueTop}, 50%, 40%)`);
    gradient.addColorStop(1, `hsl(${hueBottom}, 50%, 85%)`);

    this.#ctx.clearRect(0, 0, width, height);
    this.#ctx.fillStyle = gradient;
    this.#ctx.fillRect(0, 0, width, height);
  }

  /**
   * 处理窗口尺寸变化
   */
  onResize() {
    const { pixelRatio } = setupCanvas(this.#canvas);
    this.#ctx.scale(pixelRatio, pixelRatio);
  }
}

class Star {
  #canvas;
  #ctx;

  /** @type {number} */ #size;
  /** @type {number} */ #x;
  /** @type {number} */ #y;
  /** @type {number} */ #vx;
  /** @type {number} */ #vy;
  /** @type {number} */ #alpha;
  /** @type {1 | -1} */ #phase;
  /** @type {number} */ #fadeSpeed;

  /**
   * @constructor
   * @param {HTMLCanvasElement} canvas
   * @param {CanvasRenderingContext2D} context
   */
  constructor(canvas, context) {
    this.#canvas = canvas;
    this.#ctx = context;
    this.#init();
  }

  /**
   * 初始化星星属性
   * @param {boolean} [isFirstTime=true]
   */
  #init(isFirstTime = true) {
    this.#size = Math.random() * 3 + 2;
    this.#x = Math.random() * this.#canvas.clientWidth;
    this.#y = Math.random() * this.#canvas.clientHeight * 0.5;
    this.#vx = (Math.random() - 0.5) * 12;
    this.#vy = (Math.random() - 0.5) * 12;
    this.#alpha = isFirstTime ? Math.random() : 0;
    this.#phase = isFirstTime ? (Math.random() > 0.5 ? 1 : -1) : 1;
    this.#fadeSpeed = Math.random() * 0.3 + 1.2;
  }

  /**
   * 更新星星状态
   * @param {number} dt
   */
  update(dt) {
    this.#x += this.#vx * dt;
    this.#y += this.#vy * dt;

    if (this.#phase === 1) {
      // 变明
      this.#alpha += this.#fadeSpeed * dt;
      if (this.#alpha >= 1) {
        this.#alpha = 1;
        this.#phase = -1;
      }
    } else {
      // 变暗
      this.#alpha -= this.#fadeSpeed * dt;
      if (this.#alpha <= 0) {
        this.#init(false);
      }
    }
  }

  /**
   * 绘制星星
   */
  draw() {
    this.#ctx.save();
    this.#ctx.translate(this.#x, this.#y);
    this.#ctx.globalAlpha = this.#alpha;
    this.#ctx.fillStyle = "white";

    // 绘制菱形路径
    this.#ctx.beginPath();
    this.#ctx.moveTo(0, -this.#size);
    this.#ctx.lineTo(this.#size * 0.7, 0);
    this.#ctx.lineTo(0, this.#size);
    this.#ctx.lineTo(-this.#size * 0.7, 0);
    this.#ctx.closePath();

    // 添加外发光效果
    this.#ctx.shadowBlur = this.#size * 2;
    this.#ctx.shadowColor = "white";

    this.#ctx.fill();
    this.#ctx.restore();
  }
}

export default Sky;
