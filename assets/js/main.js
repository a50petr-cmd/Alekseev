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

  // Главная: три последние статьи из каталога блога (статика + админка)
  var homeBlogList = document.querySelector("[data-home-blog-list]");
  if (homeBlogList) {
    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }
    fetch("/blog/posts-all.php", { credentials: "same-origin" })
      .then(function (response) {
        if (!response.ok) throw new Error("blog list " + response.status);
        return response.json();
      })
      .then(function (posts) {
        if (!Array.isArray(posts) || posts.length === 0) return;
        var latest = posts.slice(0, 3);
        homeBlogList.innerHTML = latest
          .map(function (post) {
            var slug = String(post.slug || "");
            if (!slug) return "";
            var href = "/blog/" + encodeURIComponent(slug) + ".html";
            var date = escapeHtml(post.date || "");
            var dateLabel = escapeHtml(post.dateLabel || post.date || "");
            var title = escapeHtml(post.title || "");
            var description = escapeHtml(post.description || "");
            return (
              '<a class="blog-card" href="' +
              href +
              '">' +
              '<time datetime="' +
              date +
              '">' +
              dateLabel +
              "</time>" +
              "<h2>" +
              title +
              "</h2>" +
              "<p>" +
              description +
              "</p>" +
              "</a>"
            );
          })
          .join("");
      })
      .catch(function () {
        // оставляем статичный fallback из index.html
      });
  }
})();
