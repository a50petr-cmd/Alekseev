/* Yandex.Metrika — стандартный код счётчика встроен в HTML страниц (script + noscript).
 * Этот файл оставлен для совместимости; init вызывается из разметки страницы. */
window.initYandexMetrika = function initYandexMetrika() {
  if (window.__metrikaInitialized) {
    return;
  }
  window.__metrikaInitialized = true;
  document.dispatchEvent(new CustomEvent("metrika:ready"));
};
