(function () {
  var STORAGE_KEY = "pa_analytics_consent_v1";
  var consentScript = document.currentScript;
  var assetsBase =
    consentScript && consentScript.src
      ? consentScript.src.replace(/[^/]+$/, "")
      : new URL("assets/js/", document.baseURI).href;
  var privacyHref = (function () {
    var path = location.pathname.replace(/\\/g, "/");
    if (path.indexOf("/blog/") !== -1 || path.indexOf("/checklists/") !== -1) {
      return "../privacy.html";
    }
    if (path.indexOf("/_preview/") !== -1) {
      return "../privacy.html";
    }
    return "privacy.html";
  })();

  function loadMetrika() {
    if (window.__metrikaLoadStarted) {
      return;
    }
    window.__metrikaLoadStarted = true;
    var script = document.createElement("script");
    script.src = assetsBase + "yandex-metrika.js";
    script.async = true;
    script.onload = function () {
      if (typeof window.initYandexMetrika === "function") {
        window.initYandexMetrika();
      }
    };
    document.head.appendChild(script);
  }

  function grantConsent() {
    try {
      localStorage.setItem(STORAGE_KEY, "granted");
    } catch (error) {}
    window.__analyticsConsent = true;
    document.body.classList.remove("cookie-consent-open");
    var banner = document.getElementById("cookie-consent");
    if (banner) {
      banner.hidden = true;
    }
    document.dispatchEvent(new CustomEvent("analytics:consent"));
    loadMetrika();
  }

  function declineConsent() {
    try {
      localStorage.setItem(STORAGE_KEY, "denied");
    } catch (error) {}
    document.body.classList.remove("cookie-consent-open");
    var banner = document.getElementById("cookie-consent");
    if (banner) {
      banner.hidden = true;
    }
  }

  function bindResetControls() {
    document.querySelectorAll("[data-consent-reset]").forEach(function (button) {
      button.addEventListener("click", function () {
        try {
          localStorage.removeItem(STORAGE_KEY);
        } catch (error) {}
        location.reload();
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
    banner.setAttribute("aria-label", "Согласие на использование cookie");
    banner.innerHTML =
      '<div class="cookie-consent__inner">' +
      '<p class="cookie-consent__text">Мы используем cookie и сервис <strong>Яндекс Метрика</strong> для аналитики посещений и улучшения сайта. Данные обрабатываются после вашего согласия. ' +
      '<a href="' +
      privacyHref +
      '">Политика конфиденциальности</a>.</p>' +
      '<div class="cookie-consent__actions">' +
      '<button type="button" class="cookie-consent__decline" id="cookie-consent-decline">Без аналитики</button>' +
      '<button type="button" class="btn btn-small cookie-consent__btn" id="cookie-consent-accept">Принимаю</button>' +
      "</div>" +
      "</div>";
    document.body.appendChild(banner);
    document.body.classList.add("cookie-consent-open");
    banner.querySelector("#cookie-consent-accept").addEventListener("click", grantConsent);
    banner.querySelector("#cookie-consent-decline").addEventListener("click", declineConsent);
  }

  var stored = null;
  try {
    stored = localStorage.getItem(STORAGE_KEY);
  } catch (error) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindResetControls);
  } else {
    bindResetControls();
  }

  if (stored === "granted") {
    window.__analyticsConsent = true;
    document.dispatchEvent(new CustomEvent("analytics:consent"));
    loadMetrika();
    return;
  }

  if (stored === "denied") {
    return;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderBanner);
  } else {
    renderBanner();
  }
})();
