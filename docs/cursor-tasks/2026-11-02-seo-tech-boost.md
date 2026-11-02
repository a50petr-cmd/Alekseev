# SEO tech boost (2026-11-02)

## Сделано в коде

- Главная: `WebSite` + усиленный Person/Service JSON-LD, twitter meta, `yandex-verification`
- `/operations-director.html`: BreadcrumbList + twitter + verification
- Кейсы: Article schema + twitter + verification
- Блог (`index.php`, `render.php`, статичные статьи, шаблон): twitter + verification; Blog schema на индексе
- `robots.txt`: ASCII-комментарий (без кракозябр на проде)
- `sitemap.xml`: lastmod ключевых URL → 2026-11-02
- Deploy IndexNow: Yandex + Bing + api.indexnow.org (без privacy/consent)
- `tools/indexnow-ping.ps1` для ручного пинга

## Руками у Петра (не код)

1. Яндекс.Вебмастер → «Включить обход» по Метрике
2. Добавить sitemap в UI Вебмастера
3. GSC: проверить покрытие после деплоя
