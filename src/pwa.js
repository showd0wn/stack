/**
 * 注册 Service Worker 以启用 PWA 功能
 */

if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.error("ServiceWorker registration failed: ", err);
    });
  });
}
