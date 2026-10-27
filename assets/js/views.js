/**
 * Счётчик просмотров статей блога.
 *
 * На странице статьи: отправляет POST один раз (кэширует в localStorage на 24 часа).
 * На странице блога (/blog/): получает числа для всех статей одним запросом.
 *
 * Минимальное число просмотров для показа: 30.
 * Ошибки сети игнорируются.
 */

(function() {
  'use strict';

  const ENDPOINT = '/api/views.php';
  const MIN_VIEWS_TO_SHOW = 30;
  const STORAGE_TTL_HOURS = 24;

  /**
   * Склонение слова "просмотр"
   */
  function pluralize(count) {
    const n = count % 100;
    const n1 = count % 10;
    if (n > 10 && n < 20) {
      return 'просмотров';
    }
    if (n1 === 1) {
      return 'просмотр';
    }
    if (n1 > 1 && n1 < 5) {
      return 'просмотра';
    }
    return 'просмотров';
  }

  /**
   * Форматирование числа просмотров с корректным склонением
   */
  function formatViews(count) {
    if (count < MIN_VIEWS_TO_SHOW) {
      return null; // Не показываем маленькие числа
    }
    return `${count} ${pluralize(count)}`;
  }

  /**
   * Получение slug статьи из URL (имя файла)
   */
  function getArticleSlug() {
    const href = window.location.pathname;
    const match = href.match(/\/blog\/([^\/]+)\.html$/);
    return match ? match[1] : null;
  }

  /**
   * Проверка, прошло ли 24 часа с последней записи
   */
  function wasViewRecordedRecently(slug) {
    try {
      const key = `views:recorded:${slug}`;
      const stored = localStorage.getItem(key);
      if (!stored) {
        return false;
      }
      const timestamp = parseInt(stored, 10);
      const now = Date.now();
      const age = now - timestamp;
      return age < STORAGE_TTL_HOURS * 3600 * 1000;
    } catch (e) {
      return false;
    }
  }

  /**
   * Запись о том, что просмотр был зафиксирован
   */
  function recordViewSent(slug) {
    try {
      const key = `views:recorded:${slug}`;
      localStorage.setItem(key, Date.now().toString());
    } catch (e) {
      // Игнорируем ошибки localStorage
    }
  }

  /**
   * Отправка POST для инкрементации счётчика (на странице статьи)
   */
  function sendViewCount(slug) {
    if (wasViewRecordedRecently(slug)) {
      // Уже было в течение 24 часов, делаем GET чтобы получить текущее значение
      fetchAndDisplayViews([slug]);
      return;
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && typeof data.views === 'number') {
          recordViewSent(slug);
          displayViewsOnArticle(data.views);
        }
      })
      .catch(() => {
        // Ошибка сети — игнорируем
      });
  }

  /**
   * Отображение числа просмотров на странице статьи
   */
  function displayViewsOnArticle(count) {
    const byline = document.querySelector('.byline');
    if (!byline) {
      return;
    }

    const formatted = formatViews(count);
    if (!formatted) {
      return; // Меньше порога показа
    }

    const div = byline.querySelector('div');
    if (!div) {
      return;
    }

    // Проверяем, не добавили ли уже
    if (div.querySelector('[data-views]')) {
      return;
    }

    // Добавляем число просмотров в конец
    const span = document.createElement('span');
    span.setAttribute('data-views', 'true');
    span.textContent = ` · 👁 ${formatted}`;
    div.appendChild(span);
  }

  /**
   * Получение слагов со страницы блога
   */
  function getSlugsFromBlogPage() {
    const slugs = new Set();

    // a.feature
    document.querySelectorAll('a.feature').forEach(el => {
      const href = el.getAttribute('href');
      const match = href?.match(/\/blog\/([^\/]+)\.html$/);
      if (match) {
        slugs.add(match[1]);
      }
    });

    // a.row
    document.querySelectorAll('a.row').forEach(el => {
      const href = el.getAttribute('href');
      const match = href?.match(/\/blog\/([^\/]+)\.html$/);
      if (match) {
        slugs.add(match[1]);
      }
    });

    return Array.from(slugs);
  }

  /**
   * Получение слагов из ссылок и загрузка счётчиков
   */
  function fetchAndDisplayViews(slugs) {
    if (!slugs || slugs.length === 0) {
      return;
    }

    const query = slugs.join(',');
    fetch(`${ENDPOINT}?slugs=${encodeURIComponent(query)}`, {
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.json())
      .then(data => {
        if (data.ok && typeof data.views === 'object') {
          displayViewsOnBlogPage(data.views);
        }
      })
      .catch(() => {
        // Ошибка сети — игнорируем
      });
  }

  /**
   * Отображение числа просмотров на странице блога
   */
  function displayViewsOnBlogPage(viewsMap) {
    // a.feature
    document.querySelectorAll('a.feature').forEach(link => {
      const href = link.getAttribute('href');
      const match = href?.match(/\/blog\/([^\/]+)\.html$/);
      if (!match) {
        return;
      }

      const slug = match[1];
      const count = viewsMap[slug];
      if (typeof count === 'undefined' || count === null) {
        return;
      }

      const formatted = formatViews(count);
      if (!formatted) {
        return; // Меньше порога показа
      }

      const meta = link.querySelector('.meta');
      if (!meta || meta.querySelector('[data-views]')) {
        return; // Нет .meta или уже добавлено
      }

      const span = document.createElement('span');
      span.setAttribute('data-views', 'true');
      span.textContent = ` · 👁 ${formatted}`;
      meta.appendChild(span);
    });

    // a.row
    document.querySelectorAll('a.row').forEach(link => {
      const href = link.getAttribute('href');
      const match = href?.match(/\/blog\/([^\/]+)\.html$/);
      if (!match) {
        return;
      }

      const slug = match[1];
      const count = viewsMap[slug];
      if (typeof count === 'undefined' || count === null) {
        return;
      }

      const formatted = formatViews(count);
      if (!formatted) {
        return; // Меньше порога показа
      }

      const dateDiv = link.querySelector('.date');
      if (!dateDiv || dateDiv.querySelector('[data-views]')) {
        return; // Нет .date или уже добавлено
      }

      const span = document.createElement('span');
      span.setAttribute('data-views', 'true');
      span.textContent = ` · 👁 ${formatted}`;
      dateDiv.appendChild(span);
    });
  }

  /**
   * Инициализация
   */
  function init() {
    // Если нет параметра data-page, всё выключено
    const pageAttr = document.body.getAttribute('data-page');
    if (!pageAttr) {
      return;
    }

    if (pageAttr === 'blog-article') {
      // Страница статьи
      const slug = getArticleSlug();
      if (slug) {
        sendViewCount(slug);
      }
    } else if (pageAttr === 'blog') {
      // Страница индекса блога
      const slugs = getSlugsFromBlogPage();
      if (slugs.length > 0) {
        fetchAndDisplayViews(slugs);
      }
    }
  }

  // Ждём загрузки DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
