(function () {
  var STUB = true;
  var ENDPOINT = "/_preview/mockups/api/lead.php";

  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var started = Date.now();
    var status = form.querySelector("[data-lead-status]");
    var submit = form.querySelector("[type=submit]");

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (status) {
        status.hidden = false;
        status.textContent = "Отправляем…";
        status.className = "lead-status";
      }

      var data = new FormData(form);
      var elapsed = (Date.now() - started) / 1000;
      data.set("_elapsed", String(elapsed));

      function showSuccess(opts) {
        var track = !(opts && opts.track === false);
        if (track && typeof ym === "function") {
          ym(113335579, "reachGoal", "form_submit");
        }
        form.reset();
        started = Date.now();
        if (status) {
          status.textContent = "Заявка отправлена. Отвечу в ближайшее время.";
          status.className = "lead-status is-ok";
        }
      }

      function showError() {
        if (status) {
          status.innerHTML =
            'Не удалось отправить форму. Напишите напрямую: <a href="mailto:a50petro@yandex.ru">a50petro@yandex.ru</a>';
          status.className = "lead-status is-err";
        }
      }

      if (STUB || form.dataset.stub === "1") {
        if (elapsed < 3) {
          showError();
          if (status) {
            status.textContent = "Подождите пару секунд и отправьте ещё раз.";
          }
          return;
        }
        if (data.get("website")) {
          showSuccess({ track: false });
          return;
        }
        if (!data.get("name") || !data.get("contact") || !data.get("task") || !data.get("consent")) {
          showError();
          if (status) status.textContent = "Заполните обязательные поля и согласие.";
          return;
        }
        showSuccess();
        return;
      }

      if (submit) submit.disabled = true;
      fetch(ENDPOINT, {
        method: "POST",
        body: data,
        headers: { Accept: "application/json" },
      })
        .then(function (response) {
          return response.json().then(function (json) {
            return { ok: response.ok && json && json.ok, json: json };
          });
        })
        .then(function (result) {
          if (result.ok) showSuccess();
          else showError();
        })
        .catch(showError)
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  });
})();
