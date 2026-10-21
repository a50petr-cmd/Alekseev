# Релиз нового сайта (`release/new-site`)

Локальная ветка. В `main` / origin **не пушить** без слова «публикуй».

Почта везде: `a50petro@yandex.ru`.

## Страницы (5 + блог + 404)

| URL | Файл |
|---|---|
| `/` | `index.html` |
| `/operations-director.html` | услуга |
| `/case-fasol.html` | кейс Фасоль |
| `/case-euroopt.html` | кейс Евроопт |
| `/blog/` | индекс блога (v2) |
| `/blog/darkstores-russia-october-2026.html` | статья |
| `/privacy.html` | политика (из privacy-release) |
| `/consent.html` | согласие на обработку ПДн — **ТРЕБУЕТ ПРОВЕРКИ ЮРИСТОМ** |
| `/404.html` | ошибка |

Старые `blog/franchise|import|kpi|logistics.html` и старый индекс **не в релизе**. 301 → `/blog/` в `.htaccess`.

## Добавлено

- `assets/css/site.css` — стили макета v2
- `assets/js/lead-form.js` — форма, `STUB=false`, `ENDPOINT=/api/lead.php`
- `api/lead.php` — приём заявок на `a50petro@yandex.ru`
- `assets/images/petr-alekseev-portrait.jpg` — портрет для блока «О нас» (копия из draft; draft по-прежнему exclude FTP)
- `operations-director.html`, `case-fasol.html`, `case-euroopt.html`, `404.html`
- `tools/verify-release.mjs` — проверка перед публикацией
- `_preview/mockups/screenshots/release-*.png` — скриншоты 1440/390

## Изменено

- `index.html`, `privacy.html`, `sitemap.xml` (ровно 5 URL, lastmod 2026-10-21)
- `robots.txt` — без изменений по смыслу (`Disallow: /_preview/` сохранён)

## Удалено

**Страницы:** `about.html`, `cases.html`, `contacts.html`, `dark-store.html`, `franchise.html`, `materials.html`, `services.html`, `yandex_36d2c01f5201e09b.html` (файл верификации Яндекса — при публикации может понадобиться вернуть).

**Каталоги:** `blog/` (все статьи и шаблон), `checklists/`.

**Скрипты:** `assets/js/blog-index.js`.

**Логотипы (больше не ссылаются):** `assets/images/logos/*` (кроме `SOURCES.md` если остался).

## Форма и `lead.php`

- Имя и контакт **не** попадают в заголовки письма: CR/LF вычищаются, значения только в теле; `From` / `Subject` фиксированные.
- Honeypot `website`: ответ `ok`, без цели Метрики на клиенте при stub; на PHP — тихий `ok` без письма.
- Ошибка отправки → mailto на `a50petro@yandex.ru` в UI.
- **Почта не в спам:** лучше SMTP Яндекса — секреты GitHub `SMTP_USER` / `SMTP_PASS` (пароль приложения). Иначе `mail()` от `forms@petr-alekseev.ru` (ящик нужно создать в панели Reg.ru → Почта).

## Deploy FTP (`.github/workflows/deploy-ftp.yml`, не меняли)

- `api/lead.php` **попадёт** на сервер (нет exclude для `api/`).
- `_preview/**` **по-прежнему исключён**.
- `assets/images/draft/**` исключён — поэтому портрет вынесен в `assets/images/petr-alekseev-portrait.jpg`.
- `README.md` исключён из заливки.

## Проверка

```powershell
python -m http.server 8765
node tools/verify-release.mjs
```

Результат: **VERIFY OK** (запрещённые строки, битые ссылки, scrollWidth 1440/390).

**ТРЕБУЕТ ПРОВЕРКИ ЮРИСТОМ:** текст `/consent.html` и формулировка галочки согласия в форме.

## Что осталось вне релиза

- `_preview/` (макеты, черновики, скриншоты) — не деплоится
- неотслеживаемые: `.env.example`, `YANDEX-API.md`, `tools/` часть файлов, `assets/images/draft/`, `alekseev-pending.bundle` и т.п.

## Коммит

Хэш сборки: `d32bef8`. HEAD ветки: `37230e3` (хэш в этом README).
