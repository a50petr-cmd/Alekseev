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

  if (document.body.dataset.gated === "checklist" && sessionStorage.getItem("pa-lead") !== "1") {
    location.replace(document.body.dataset.back || "../materials.html");
    return;
  }

  var email = "alekseev.pa50@yandex.ru";

  function payload(form) {
    var data = {};
    new FormData(form).forEach(function (value, key) {
      if (key !== "_honey") data[key] = String(value);
    });
    return data;
  }

  function sendLead(data) {
    var body = new FormData();
    Object.keys(data).forEach(function (key) { body.append(key, data[key]); });
    body.append("_subject", "Заявка с сайта — Петр Алексеев");
    body.append("_template", "table");
    body.append("_captcha", "false");
    return fetch("https://formsubmit.co/ajax/" + email, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: body
    }).then(function (response) {
      if (!response.ok) throw new Error("fail");
      return response.json().catch(function () { return {}; });
    }).then(function (json) {
      if (json && json.success === false) throw new Error("rejected");
    });
  }

  function openMail(data) {
    var lines = Object.keys(data).map(function (key) { return key + ": " + data[key]; });
    window.location.href = "mailto:" + email + "?subject=" + encodeURIComponent("Заявка с сайта") + "&body=" + encodeURIComponent(lines.join("\n"));
  }

  function unlock(form) {
    if (form.dataset.unlock !== "1") return;
    sessionStorage.setItem("pa-lead", "1");
    var downloads = document.querySelector(".downloads");
    if (downloads) downloads.hidden = false;
    if (form.dataset.file) window.open(form.dataset.file, "_blank", "noopener");
  }

  document.querySelectorAll(".lead-form").forEach(function (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var honey = form.querySelector('[name="_honey"]');
      if (honey && honey.value) return;
      var button = form.querySelector('[type="submit"]');
      var error = form.querySelector(".error");
      var data = payload(form);
      var previous = button.textContent;
      button.disabled = true;
      button.textContent = "Отправляю…";
      if (error) error.hidden = true;
      sendLead(data).then(function () {
        form.hidden = true;
        var success = form.parentElement.querySelector(".form-success");
        if (success) success.hidden = false;
        unlock(form);
      }).catch(function () {
        openMail(data);
        unlock(form);
        if (error) {
          error.hidden = false;
          error.textContent = "Если почтовая программа не открылась, напишите в Telegram: t.me/PetroAlekseev";
        }
      }).finally(function () {
        button.disabled = false;
        button.textContent = previous;
      });
    });
  });

  var gate = document.querySelector("#gate");
  if (gate && sessionStorage.getItem("pa-lead") === "1") {
    var gateForm = gate.querySelector(".lead-form");
    var downloads = gate.querySelector(".downloads");
    if (gateForm) gateForm.hidden = true;
    if (downloads) downloads.hidden = false;
    var success = gate.querySelector(".form-success");
    if (success) success.hidden = false;
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
