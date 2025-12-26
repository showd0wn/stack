import styles from "./game-ui.css?inline";

class GameUI extends HTMLElement {
  /**
   * @type {{
   *   titleContainer: Element,
   *   score: Element,
   *   gameEnd: Element,
   *   newRecord: Element,
   *   highScore: Element,
   *   highScoreValue: Element
   * }}
   */
  #dom;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.#render();
    this.#cacheElements();
  }

  /**
   * 缓存 DOM 元素引用
   */
  #cacheElements() {
    const $ = (selector) => this.shadowRoot.querySelector(selector);
    this.#dom = {
      titleContainer: $(".title-container"),
      score: $(".game-score"),
      gameEnd: $(".game-end"),
      newRecord: $(".new-record"),
      highScore: $(".high-score"),
      highScoreValue: $(".high-score .value"),
    };
  }

  /**
   * 游戏初始化状态
   */
  toInitState() {
    this.#dom.titleContainer.classList.remove("opacity-0");
    this.#dom.score.classList.add("opacity-0");
    this.#dom.gameEnd.classList.add("opacity-0");
  }

  /**
   * 游戏进行状态
   */
  toPlayingState() {
    this.#dom.titleContainer.classList.add("opacity-0");
    this.#dom.score.classList.remove("opacity-0");
  }

  /**
   * 更新分数显示
   * @param {number} score
   */
  updateScore(score) {
    this.#dom.score.textContent = score.toString();
  }

  /**
   * 游戏结束状态
   * @param {number} score
   */
  toGameOverState(score) {
    const highScore = parseInt(localStorage.getItem("highScore") || "0");

    if (score > highScore) {
      localStorage.setItem("highScore", score.toString());
      this.#dom.newRecord.classList.remove("display-none");
      this.#dom.highScore.classList.add("display-none");
    } else {
      this.#dom.newRecord.classList.add("display-none");
      this.#dom.highScore.classList.remove("display-none");
      this.#dom.highScoreValue.textContent = highScore.toString();
    }

    this.#dom.gameEnd.classList.remove("opacity-0");
  }

  /**
   * 渲染组件内容
   */
  #render() {
    this.shadowRoot.innerHTML = `
    <style>${styles}</style>

    <div class="title-container">
      <div class="title">STACK</div>
      <div class="subtitle">Tap to Play</div>
    </div>

    <div class="game-score opacity-0">0</div>

    <div class="game-end opacity-0">
      <div class="high-score display-none">
        <svg class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg">
          <path d="M872 402.8l-182.2 94.4c-7.7 4-17.1 1.4-21.6-6L525.9 261.1c-0.6-0.9-1.5-1.3-2.1-2 24.6-5.4 43-27.3 43-53.5 0-30.3-24.6-54.9-54.9-54.9-30.3 0-54.9 24.6-54.9 54.9 0 26.2 18.4 48.1 43 53.5-0.7 0.7-1.6 1.1-2.1 2L355.6 491.2c-4.5 7.3-14 9.9-21.6 6l-182.2-94.4c-12.2-6.3-26.4 4.2-23.8 17.8l62 321c1.5 7.8 8.3 13.4 16.2 13.4h611.5c7.9 0 14.7-5.6 16.2-13.4l61.9-321.1c2.6-13.5-11.5-24.1-23.8-17.7zM815.3 800.4H208.5c-8.8 0-16 7.1-16 16v38.5c0 8.8 7.1 16 16 16h606.8c8.8 0 16-7.1 16-16v-38.5c0-8.9-7.2-16-16-16z"></path>
        </svg>
        <span class="value">0</span>
      </div>
      <div class="new-record display-none">新的记录</div>
    </div>
    `;
  }
}

customElements.define("game-ui", GameUI);
export default GameUI;
