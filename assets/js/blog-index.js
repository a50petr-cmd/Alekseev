(function () {
  var list = document.getElementById("blog-list");
  if (!list) return;

  fetch("posts.json", { cache: "no-cache" })
    .then(function (res) {
      if (!res.ok) throw new Error("posts.json");
      return res.json();
    })
    .then(function (posts) {
      posts.sort(function (a, b) {
        return (b.date || "").localeCompare(a.date || "");
      });
      list.innerHTML = posts
        .map(function (post) {
          var slug = post.slug || "";
          var href = slug.endsWith(".html") ? slug : slug + ".html";
          return (
            '<a class="blog-card" href="' +
            href +
            '"><span class="tag">' +
            escapeHtml(post.tag || "Статья") +
            "</span><h2>" +
            escapeHtml(post.title || "") +
            "</h2><p>" +
            escapeHtml(post.description || "") +
            '</p><span class="meta">' +
            escapeHtml(post.readTime || "") +
            "</span></a>"
          );
        })
        .join("");
    })
    .catch(function () {
      list.innerHTML =
        '<p class="muted">Не удалось загрузить список статей. Обновите страницу.</p>';
    });

  function escapeHtml(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
