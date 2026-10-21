(function () {
  var STUB = false;
  var ENDPOINT = "/api/lead.php";

  var MSG = {
    phoneEmpty: "Укажите телефон",
    phoneInvalid: "Введите телефон полностью: +7 (926) 923-29-29",
    emailInvalid: "Проверьте почту, например name@mail.ru",
    telegramInvalid: "Введите ник Telegram, например @username",
    nameEmpty: "Укажите имя",
    taskEmpty: "Опишите задачу коротко",
    consentEmpty: "Нужно согласие на обработку данных",
  };

  function digitsOnly(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function normalizePhoneDigits(raw) {
    var d = digitsOnly(raw);
    if (!d) return "";
    if (d.charAt(0) === "8") d = "7" + d.slice(1);
    if (d.charAt(0) !== "7") d = "7" + d;
    return d.slice(0, 11);
  }

  function formatPhoneFromDigits(d) {
    if (!d) return "";
    var rest = d.charAt(0) === "7" ? d.slice(1) : d;
    var out = "+7";
    if (!rest.length) return out;
    out += " (" + rest.slice(0, Math.min(3, rest.length));
    if (rest.length < 3) return out;
    out += ")";
    if (rest.length === 3) return out;
    out += " " + rest.slice(3, Math.min(6, rest.length));
    if (rest.length <= 6) return out;
    out += "-" + rest.slice(6, Math.min(8, rest.length));
    if (rest.length <= 8) return out;
    out += "-" + rest.slice(8, Math.min(10, rest.length));
    return out;
  }

  function formatPhoneInput(raw) {
    return formatPhoneFromDigits(normalizePhoneDigits(raw));
  }

  function isValidPhone(raw) {
    var d = normalizePhoneDigits(raw);
    if (d.length !== 11 || d.charAt(0) !== "7") return false;
    return "34589".indexOf(d.charAt(1)) !== -1;
  }

  function isValidEmail(raw) {
    var v = String(raw || "").trim();
    if (!v) return true;
    if (/\s/.test(v)) return false;
    var parts = v.split("@");
    if (parts.length !== 2) return false;
    var local = parts[0];
    var domain = parts[1];
    if (!local || !domain) return false;
    if (domain.indexOf(".") === -1) return false;
    if (domain.charAt(0) === "." || domain.charAt(domain.length - 1) === ".") return false;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function extractTelegramUsername(raw) {
    var v = String(raw || "").trim();
    if (!v) return "";
    v = v.replace(/^https?:\/\//i, "");
    v = v.replace(/^t\.me\//i, "");
    v = v.replace(/^@/, "");
    return v;
  }

  function isValidTelegram(raw) {
    var v = String(raw || "").trim();
    if (!v) return true;
    var user = extractTelegramUsername(v);
    return /^[A-Za-z0-9_]{5,32}$/.test(user);
  }

  function ensureFieldChrome(input) {
    var id = input.getAttribute("id");
    if (!id) {
      id = "lead-" + (input.getAttribute("name") || "field") + "-" + Math.random().toString(36).slice(2, 8);
      input.setAttribute("id", id);
    }
    var errId = id + "-error";
    var err = document.getElementById(errId);
    if (!err) {
      err = document.createElement("span");
      err.className = "field-error";
      err.id = errId;
      err.hidden = true;
      err.setAttribute("role", "alert");
      if (input.type === "checkbox" && input.parentElement) {
        input.parentElement.appendChild(err);
      } else {
        input.insertAdjacentElement("afterend", err);
      }
    }
    var described = input.getAttribute("aria-describedby") || "";
    if ((" " + described + " ").indexOf(" " + errId + " ") === -1) {
      input.setAttribute("aria-describedby", (described + " " + errId).trim());
    }
    return err;
  }

  function setFieldError(input, message) {
    var err = ensureFieldChrome(input);
    if (message) {
      err.textContent = message;
      err.hidden = false;
      input.setAttribute("aria-invalid", "true");
      input.classList.add("is-invalid");
    } else {
      err.textContent = "";
      err.hidden = true;
      input.setAttribute("aria-invalid", "false");
      input.classList.remove("is-invalid");
    }
  }

  function validateName(input) {
    var v = String(input.value || "").trim();
    if (!v) {
      setFieldError(input, MSG.nameEmpty);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function validatePhone(input) {
    var v = String(input.value || "").trim();
    var digits = normalizePhoneDigits(v);
    if (!v || !digits || digits === "7") {
      setFieldError(input, MSG.phoneEmpty);
      return false;
    }
    if (!isValidPhone(v)) {
      setFieldError(input, MSG.phoneInvalid);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function validateEmail(input) {
    var v = String(input.value || "").trim();
    if (!v) {
      setFieldError(input, "");
      return true;
    }
    if (!isValidEmail(v)) {
      setFieldError(input, MSG.emailInvalid);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function validateTelegram(input) {
    var v = String(input.value || "").trim();
    if (!v) {
      setFieldError(input, "");
      return true;
    }
    if (!isValidTelegram(v)) {
      setFieldError(input, MSG.telegramInvalid);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function validateTask(input) {
    var v = String(input.value || "").trim();
    if (!v) {
      setFieldError(input, MSG.taskEmpty);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function validateConsent(input) {
    if (!input.checked) {
      setFieldError(input, MSG.consentEmpty);
      return false;
    }
    setFieldError(input, "");
    return true;
  }

  function bindPhoneMask(input) {
    function applyMask() {
      var before = input.value;
      var formatted = formatPhoneInput(before);
      if (formatted === before) return;
      input.value = formatted;
      try {
        var pos = formatted.length;
        input.setSelectionRange(pos, pos);
      } catch (_) {}
    }

    function isPhonePrefix(v) {
      v = String(v || "").trim();
      return !v || v === "+7" || v === "+7 (" || v === "+7()" || v === "+7 (";
    }

    input.addEventListener("input", applyMask);
    input.addEventListener("paste", function (event) {
      event.preventDefault();
      var text = "";
      try {
        text = (event.clipboardData || window.clipboardData).getData("text") || "";
      } catch (_) {}
      input.value = formatPhoneInput(text);
      try {
        var pos = input.value.length;
        input.setSelectionRange(pos, pos);
      } catch (_) {}
    });
    input.addEventListener("focus", function () {
      if (isPhonePrefix(input.value)) {
        input.value = "+7 (";
        try {
          input.setSelectionRange(input.value.length, input.value.length);
        } catch (_) {}
      }
    });
    input.addEventListener("blur", function () {
      var v = String(input.value || "").trim();
      if (isPhonePrefix(v)) {
        input.value = "";
      } else if (v) {
        input.value = formatPhoneInput(v);
      }
      validatePhone(input);
    });
  }

  document.querySelectorAll("[data-lead-form]").forEach(function (form) {
    var started = Date.now();
    var status = form.querySelector("[data-lead-status]");
    var submit = form.querySelector("[type=submit]");
    var nameInput = form.querySelector('[name="name"]');
    var phoneInput = form.querySelector('[name="phone"]');
    var emailInput = form.querySelector('[name="email"]');
    var telegramInput = form.querySelector('[name="telegram"]');
    var taskInput = form.querySelector('[name="task"]');
    var consentInput = form.querySelector('[name="consent"]');

    [nameInput, phoneInput, emailInput, telegramInput, taskInput, consentInput].forEach(function (el) {
      if (el) ensureFieldChrome(el);
    });

    if (phoneInput) bindPhoneMask(phoneInput);

    if (nameInput) nameInput.addEventListener("blur", function () { validateName(nameInput); });
    if (emailInput) emailInput.addEventListener("blur", function () { validateEmail(emailInput); });
    if (telegramInput) telegramInput.addEventListener("blur", function () { validateTelegram(telegramInput); });
    if (taskInput) taskInput.addEventListener("blur", function () { validateTask(taskInput); });
    if (consentInput) {
      consentInput.addEventListener("change", function () { validateConsent(consentInput); });
      consentInput.addEventListener("blur", function () { validateConsent(consentInput); });
    }

    function validateAll() {
      var ok = true;
      var firstInvalid = null;
      function run(fn, el) {
        if (!el) return;
        if (!fn(el)) {
          ok = false;
          if (!firstInvalid) firstInvalid = el;
        }
      }
      run(validateName, nameInput);
      run(validatePhone, phoneInput);
      run(validateEmail, emailInput);
      run(validateTelegram, telegramInput);
      run(validateTask, taskInput);
      run(validateConsent, consentInput);
      return { ok: ok, firstInvalid: firstInvalid };
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      var honeypot = form.querySelector('[name="website"]');
      if (honeypot && String(honeypot.value || "").trim() !== "") {
        form.reset();
        started = Date.now();
        if (status) {
          status.hidden = false;
          status.textContent = "Заявка отправлена. Отвечу в ближайшее время.";
          status.className = "lead-status is-ok";
        }
        return;
      }

      var check = validateAll();
      if (!check.ok) {
        if (status) {
          status.hidden = false;
          status.textContent = "Проверьте поля формы.";
          status.className = "lead-status is-err";
        }
        if (check.firstInvalid && typeof check.firstInvalid.focus === "function") {
          check.firstInvalid.focus();
        }
        return;
      }

      if (status) {
        status.hidden = false;
        status.textContent = "Отправляем…";
        status.className = "lead-status";
      }

      var data = new FormData(form);
      var elapsed = (Date.now() - started) / 1000;
      data.set("_elapsed", String(elapsed));
      if (phoneInput) data.set("phone", formatPhoneInput(phoneInput.value));
      if (telegramInput) {
        var tg = String(telegramInput.value || "").trim();
        if (tg) {
          var user = extractTelegramUsername(tg);
          data.set("telegram", "@" + user);
        } else {
          data.set("telegram", "");
        }
      }

      function showSuccess(opts) {
        var track = !(opts && opts.track === false);
        if (track && typeof ym === "function") {
          ym(113335579, "reachGoal", "form_submit");
        }
        form.reset();
        started = Date.now();
        [nameInput, phoneInput, emailInput, telegramInput, taskInput, consentInput].forEach(function (el) {
          if (el) setFieldError(el, "");
        });
        if (status) {
          status.hidden = false;
          status.textContent = "Заявка отправлена. Отвечу в ближайшее время.";
          status.className = "lead-status is-ok";
        }
      }

      function showError(serverErrors, opts) {
        if (serverErrors && typeof serverErrors === "object") {
          if (serverErrors.phone && phoneInput) setFieldError(phoneInput, serverErrors.phone);
          if (serverErrors.email && emailInput) setFieldError(emailInput, serverErrors.email);
          if (serverErrors.telegram && telegramInput) setFieldError(telegramInput, serverErrors.telegram);
          if (serverErrors.name && nameInput) setFieldError(nameInput, serverErrors.name);
          if (serverErrors.task && taskInput) setFieldError(taskInput, serverErrors.task);
          var order = [nameInput, phoneInput, emailInput, telegramInput, taskInput, consentInput];
          for (var i = 0; i < order.length; i++) {
            if (order[i] && order[i].getAttribute("aria-invalid") === "true") {
              order[i].focus();
              break;
            }
          }
        }
        if (status) {
          status.hidden = false;
          if (opts && opts.message) {
            status.textContent = opts.message;
          } else {
            status.innerHTML =
              'Не удалось отправить форму. Напишите напрямую: <a href="mailto:a50petro@yandex.ru">a50petro@yandex.ru</a>';
          }
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
            return { ok: response.ok && json && json.ok, json: json, status: response.status };
          });
        })
        .then(function (result) {
          if (result.ok) {
            showSuccess();
            return;
          }
          if (result.status === 429 && result.json && result.json.message) {
            showError(null, { message: result.json.message });
            return;
          }
          if (result.json && result.json.error === "too_fast") {
            showError(null, { message: "Подождите пару секунд и отправьте ещё раз." });
            return;
          }
          showError(result.json && result.json.errors);
        })
        .catch(function () {
          showError();
        })
        .finally(function () {
          if (submit) submit.disabled = false;
        });
    });
  });
})();
