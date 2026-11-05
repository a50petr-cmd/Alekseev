(function () {
  "use strict";

  var METRIKA_ID = 113335579;

  var GA_BY_METRIKA = {
    form_submit: "generate_lead",
    click_primary_cta: "click_primary_cta",
    click_telegram_channel: "click_telegram_channel",
    click_telegram: "click_telegram",
    click_email: "click_email",
    click_linkedin: "click_linkedin",
    view_case: "view_case",
  };

  function reachMetrika(goal) {
    if (!goal) return;
    try {
      if (typeof ym === "function") {
        ym(METRIKA_ID, "reachGoal", goal);
      }
    } catch (_) {}
  }

  function reachGa4(eventName, params) {
    if (!eventName) return;
    try {
      if (typeof gtag === "function") {
        gtag("event", eventName, params || {});
      }
    } catch (_) {}
  }

  function track(metrikaGoal, gaEventName, gaParams) {
    reachMetrika(metrikaGoal);
    var ga = gaEventName || GA_BY_METRIKA[metrikaGoal] || metrikaGoal;
    reachGa4(ga, gaParams);
  }

  window.petrTrackConversion = track;

  function hrefLower(el) {
    if (!el || !el.getAttribute) return "";
    return String(el.getAttribute("href") || "").trim().toLowerCase();
  }

  function isTelegramChannelHref(href) {
    return href.indexOf("t.me/alekseev_petr_consult") !== -1 || href.indexOf("t.me/+") !== -1;
  }

  function isCaseHref(href) {
    return /\/case-[a-z0-9-]+\.html(?:[#?]|$)/i.test(href) || /^case-[a-z0-9-]+\.html(?:[#?]|$)/i.test(href);
  }

  function trackCasePageView() {
    var path = location.pathname || "";
    if (!/\/case-[a-z0-9-]+\.html$/i.test(path)) return;
    track("view_case", "view_case", { page_path: path });
  }

  document.addEventListener(
    "click",
    function (event) {
      var goalEl = event.target.closest("[data-goal]");
      if (goalEl) {
        var goal = goalEl.getAttribute("data-goal");
        if (goal) {
          var gaFromGoal = goal === "form_submit" ? "generate_lead" : GA_BY_METRIKA[goal] || goal;
          track(goal, gaFromGoal);
          return;
        }
      }

      var link = event.target.closest("a[href]");
      if (!link) return;

      var href = hrefLower(link);

      if (/^tel:/.test(href)) {
        reachGa4("click_phone", { link_url: href });
        return;
      }
      if (/^mailto:/.test(href)) {
        track("click_email", "click_email");
        return;
      }
      if (href.indexOf("linkedin.com") !== -1) {
        track("click_linkedin", "click_linkedin");
        return;
      }
      if (href.indexOf("t.me/") !== -1) {
        if (isTelegramChannelHref(href)) {
          track("click_telegram_channel", "click_telegram_channel");
        } else {
          track("click_telegram", "click_telegram");
        }
        return;
      }
      if (isCaseHref(href) || link.classList.contains("case-card__cta")) {
        track("view_case", "view_case", { link_url: href });
      }
    },
    true
  );

  document.addEventListener("petr:form_submit", function () {
    track("form_submit", "generate_lead");
  });

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn);
    } else {
      fn();
    }
  }

  onReady(trackCasePageView);
})();
