<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
admin_require_login();
?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Новая статья — админка</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/publish/admin.css">
</head>
<body class="admin-body">
  <header class="admin-top">
    <strong>Админка блога</strong>
    <nav>
      <a href="/blog/" target="_blank" rel="noopener">Блог</a>
      <a href="/publish/logout.php">Выйти</a>
    </nav>
  </header>

  <main class="admin-simple">
    <section class="admin-form">
      <h1>Новая статья</h1>
      <p class="muted">Три поля. Сначала «Превью», если всё ок — «Опубликовать».</p>

      <label>Заголовок
        <input id="title" type="text" required placeholder="Заголовок статьи">
      </label>

      <label>Картинка
        <input id="cover" type="file" accept="image/jpeg,image/png,image/webp,image/gif">
      </label>
      <div id="coverPreview" class="cover-preview" hidden></div>

      <label>Текст статьи
        <textarea id="body" rows="20" placeholder="Пишите как обычно.&#10;&#10;Подзаголовок так:&#10;## Название раздела&#10;&#10;Список:&#10;- пункт&#10;- пункт"></textarea>
      </label>

      <div class="actions">
        <button type="button" class="btn btn-ghost" id="btnPreview">Превью</button>
        <button type="button" class="btn" id="btnPublish">Опубликовать</button>
      </div>
      <p id="status" class="status" role="status"></p>
      <p id="previewLink" class="preview-link" hidden></p>

      <h2 class="published-title">Уже опубликованы</h2>
      <ul id="dynList" class="dyn-list"><li class="muted">Загрузка…</li></ul>
    </section>
  </main>

  <script src="/publish/admin.js"></script>
</body>
</html>
