(function () {
  var page = document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach(function (link) {
    if (link.dataset.nav === page) link.setAttribute("aria-current", "page");
  });

  document.querySelectorAll("[data-year]").forEach(function (node) {
    node.textContent = String(new Date().getFullYear());
  });

  var toggle = document.querySelector(".nav-toggle");
  var nav = document.querySelector(".nav");
  function closeNav() {
    if (!nav || !toggle) return;
    nav.classList.remove("is-open");
    toggle.classList.remove("is-open");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Открыть меню");
    document.body.classList.remove("nav-open");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = nav.classList.toggle("is-open");
      toggle.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("nav-open", open);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", closeNav);
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") closeNav();
    });
  }

  function metrikaGoal(name) {
    if (typeof ym === "function") {
      ym(113335579, "reachGoal", name);
    }
  }

  function setupMetrikaTracking() {
    if (window.__metrikaTrackingBound) {
      return;
    }
    window.__metrikaTrackingBound = true;
    document.querySelectorAll('a[href^="tel:"]').forEach(function (link) {
      link.addEventListener("click", function () {
        metrikaGoal("click_phone");
      });
    });
    document.querySelectorAll('a[href*="t.me/"]').forEach(function (link) {
      link.addEventListener("click", function () {
        metrikaGoal("click_telegram");
      });
    });
    document.querySelectorAll('a[href^="mailto:"]').forEach(function (link) {
      link.addEventListener("click", function () {
        metrikaGoal("click_email");
      });
    });
    document.querySelectorAll('a[href*="linkedin.com/"]').forEach(function (link) {
      link.addEventListener("click", function () {
        metrikaGoal("click_linkedin");
      });
    });
    document.querySelectorAll("[data-goal]").forEach(function (element) {
      element.addEventListener("click", function () {
        metrikaGoal(element.dataset.goal);
      });
    });

    if ("IntersectionObserver" in window) {
      var observedGoals = [
        { selector: "#team", goal: "view_team" },
        { selector: "#contact", goal: "reach_contact" },
      ];
      observedGoals.forEach(function (item) {
        var element = document.querySelector(item.selector);
        if (!element) return;
        var observer = new IntersectionObserver(
          function (entries) {
            if (!entries[0].isIntersecting) return;
            metrikaGoal(item.goal);
            observer.disconnect();
          },
          { threshold: 0.35 }
        );
        observer.observe(element);
      });
    }
  }

  document.addEventListener("metrika:ready", setupMetrikaTracking, { once: true });
  if (window.__metrikaInitialized) {
    setupMetrikaTracking();
  }

  var booking = document.querySelector("#booking");
  var calendly = booking && booking.dataset.calendly ? booking.dataset.calendly.trim() : "";
  if (booking && calendly) {
    var widget = document.createElement("div");
    widget.className = "calendly-inline-widget";
    widget.dataset.url = calendly;
    widget.style.minWidth = "280px";
    widget.style.height = "720px";
    booking.querySelector(".booking-fallback").hidden = true;
    booking.appendChild(widget);
    var script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
  }
})();
