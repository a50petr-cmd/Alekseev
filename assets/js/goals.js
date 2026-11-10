(function () {
  "use strict";

  var METRIKA_ID = 113335579;
  var PHONE_DIGITS = "79269232929";
  var PERSONAL_TG = "t.me/petroalekseev";

  var GA_BY_METRIKA = {
    form_submit: "generate_lead",
    click_primary_cta: "click_primary_cta",
    click_telegram_channel: "click_telegram_channel",
    click_telegram: "click_telegram",
    click_email: "click_email",
    click_linkedin: "click_linkedin",
    view_case: "view_case",
  };

  function analyticsAllowed() {
    try {
      if (localStorage.getItem("pa_analytics_consent_v1") === "denied") return false;
      if (localStorage.getItem("pa_no_metrika") === "1") return false;
    } catch (_) {}
    return true;
  }

  function reachMetrika(goal) {
    if (!goal || !analyticsAllowed()) return;
    try {
      if (typeof ym === "function") {
        ym(METRIKA_ID, "reachGoal", goal);
      }
    } catch (_) {}
  }

  function reachGa4(eventName, params) {
    if (!eventName || !analyticsAllowed()) return;
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

  function telDigits(href) {
    return String(href || "")
      .replace(/^tel:/i, "")
      .replace(/\D/g, "");
  }

  function isTargetPhone(href) {
    var digits = telDigits(href);
    return digits === PHONE_DIGITS || digits === "89269232929";
  }

  function isPersonalTelegram(href) {
    return href.indexOf(PERSONAL_TG) !== -1;
  }

  function isTelegramChannelHref(href) {
    return href.indexOf("t.me/alekseev_petr_consult") !== -1 || href.indexOf("t.me/+") !== -1;
  }

  function isCaseHref(href) {
    return /\/case-[a-z0-9-]+\.html(?:[#?]|$)/i.test(href) || /^case-[a-z0-9-]+\.html(?:[#?]|$)/i.test(href);
  }

  function linkLocation(el) {
    var node = el;
    while (node && node !== document.body) {
      if (node.id) return node.id;
      var tag = node.tagName;
      if (tag === "HEADER") return "header";
      if (tag === "FOOTER") return "footer";
      if (tag === "NAV") return "nav";
      node = node.parentElement;
    }
    return "page";
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

      if (/^tel:/.test(href) && isTargetPhone(href)) {
        reachGa4("click_phone", { link_url: href, link_location: linkLocation(link) });
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
        } else if (isPersonalTelegram(href)) {
          reachMetrika("click_telegram");
          reachGa4("click_telegram_personal", {
            link_url: href,
            link_location: linkLocation(link),
          });
        }
        return;
      }
      if (isCaseHref(href) || link.classList.contains("case-card__cta")) {
        track("view_case", "view_case", { link_url: href });
      }
    },
    true
  );

  document.addEventListener("petr:form_submit", function (event) {
    var detail = (event && event.detail) || {};
    var formLocation = detail.form_location;
    if (!formLocation) {
      var path = (location.pathname || "").toLowerCase();
      formLocation = path.indexOf("operations-director") !== -1 ? "operations_director" : path.indexOf("audit-biznes-processov") !== -1 ? "audit" : "home";
    }
    track("form_submit", "generate_lead", { form_location: formLocation });
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
