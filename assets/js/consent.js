(function () {
  /*
   * Баннер «уведомление + отказ» и исключение своих визитов (?nometrika=1).
   * Сам счётчик Яндекс Метрики подключается стандартным кодом на странице
   * (script + noscript). Здесь только: disable при отказе/владельце и баннер.
   */
  var COUNTER_ID = 113335579;
  var STORAGE_KEY = "pa_analytics_consent_v1"; // "denied" — посетитель отказался
  var NOTICE_KEY = "pa_analytics_notice_v1"; // "seen" — баннер закрыт
  var OWNER_KEY = "pa_no_metrika"; // "1" — браузер владельца сайта, не считать
  var privacyHref = "/privacy.html";

  function read(key) {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      return null;
    }
  }
  function write(key, value) {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch (error) {}
  }

  (function handleOwnerParam() {
    var match = location.search.match(/[?&]nometrika=([01])/);
    if (!match) return;
    write(OWNER_KEY, match[1] === "1" ? "1" : null);
    try {
      var url = new URL(location.href);
      url.searchParams.delete("nometrika");
      history.replaceState(null, "", url.pathname + url.search + url.hash);
    } catch (error) {}
  })();

  var isOwner = read(OWNER_KEY) === "1";
  var isDenied = read(STORAGE_KEY) === "denied";

  function stopMetrika() {
    window["disableYaCounter" + COUNTER_ID] = true;
  }

  function closeBanner() {
    document.body.classList.remove("cookie-consent-open");
    var banner = document.getElementById("cookie-consent");
    if (banner) {
      banner.hidden = true;
    }
  }

  function acknowledge() {
    write(NOTICE_KEY, "seen");
    closeBanner();
  }

  function declineAnalytics() {
    write(STORAGE_KEY, "denied");
    write(NOTICE_KEY, "seen");
    stopMetrika();
    closeBanner();
  }

  function bindResetControls() {
    document.querySelectorAll("[data-consent-reset]").forEach(function (button) {
      button.addEventListener("click", function () {
        write(STORAGE_KEY, null);
        write(NOTICE_KEY, null);
        location.reload();
      });
    });
    document.querySelectorAll("[data-analytics-off]").forEach(function (button) {
      if (read(STORAGE_KEY) === "denied") {
        button.textContent = "Аналитика отключена";
        button.disabled = true;
      }
      button.addEventListener("click", function () {
        declineAnalytics();
        button.textContent = "Аналитика отключена";
        button.disabled = true;
      });
    });
  }

  function renderBanner() {
    if (document.getElementById("cookie-consent")) {
      return;
    }
    var banner = document.createElement("aside");
    banner.id = "cookie-consent";
    banner.className = "cookie-consent";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Уведомление об использовании cookie");
    banner.innerHTML =
      '<div class="cookie-consent__inner">' +
      '<p class="cookie-consent__text">Сайт использует cookie и сервис <strong>Яндекс Метрика</strong>, чтобы считать посещения и улучшать сайт. Вы можете отказаться от аналитики. ' +
      '<a href="' +
      privacyHref +
      '">Политика конфиденциальности</a>.</p>' +
      '<div class="cookie-consent__actions">' +
      '<button type="button" class="cookie-consent__decline" id="cookie-consent-decline">Отключить аналитику</button>' +
      '<button type="button" class="btn btn-small cookie-consent__btn" id="cookie-consent-accept">Понятно</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(banner);
    document.body.classList.add("cookie-consent-open");
    banner.querySelector("#cookie-consent-accept").addEventListener("click", acknowledge);
    banner.querySelector("#cookie-consent-decline").addEventListener("click", declineAnalytics);
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(bindResetControls);

  // Важно: disable до выполнения стандартного кода счётчика на странице.
  if (isOwner || isDenied) {
    stopMetrika();
    return;
  }

  window.__analyticsConsent = true;
  document.dispatchEvent(new CustomEvent("analytics:consent"));

  if (read(NOTICE_KEY) !== "seen") {
    onReady(renderBanner);
  }
})();
