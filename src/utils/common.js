/**
 * 防抖函数
 * @template {(...args: any[]) => any} T
 * @param {T} fn
 * @param {number} [wait=200]
 * @returns {(...args: Parameters<T>) => void}
 */
function debounce(fn, wait = 200) {
  /** @type {number | undefined} */
  let timeout;

  return function (...args) {
    const context = this;

    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => fn.apply(context, args), wait);
  };
}

/**
 * 生成指定范围内的随机整数，包含 min 和 max
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function getRandomInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);

  if (min === max) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 检测是否为移动设备
 */
const isMobileDevice = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

export { debounce, getRandomInt, isMobileDevice };
