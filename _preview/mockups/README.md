# Макеты главной (design/mockups-v1)

Папка `_preview/` не деплоится на Рег.ру и закрыта в `robots.txt`. Это только локальный просмотр.

## Запуск

Из **корня репозитория** сайта:

```powershell
cd "C:\Users\a50pe\OneDrive\Desktop\Личный_сайт"
python -m http.server 8765
```

Откройте в браузере:

| Макет | URL |
|---|---|
| V1 — эволюция текущего | http://127.0.0.1:8765/_preview/mockups/v1/index.html |
| V2 — плотный деловой | http://127.0.0.1:8765/_preview/mockups/v2/index.html |
| V3 — портрет эксперта | http://127.0.0.1:8765/_preview/mockups/v3/index.html |
| Кейс «Фасоль» | http://127.0.0.1:8765/_preview/mockups/v1/case-fasol.html |
| Кейс Евроопт / ЯМИГОМ | http://127.0.0.1:8765/_preview/mockups/v1/case-euroopt.html |
| Черновик политики | http://127.0.0.1:8765/_preview/mockups/privacy-draft.html |

Пути к ресурсам вида `/assets/...` — сервер должен стартовать из корня репозитория.

## Форма заявки

- В макетах включён режим-заглушка (`data-stub="1"` в форме + `STUB = true` в `shared/lead-form.js`): успешное состояние видно без PHP.
- PHP-обработчик: `_preview/mockups/api/lead.php` (для прод-пути `/api/lead.php` файл нужно будет вынести отдельно при публикации — сейчас только макет).
- Локально с PHP (если установлен):

```powershell
php -S 127.0.0.1:8765
```

Затем в `shared/lead-form.js` поставьте `STUB = false` и уберите `data-stub="1"` у формы, чтобы бить в `/_preview/mockups/api/lead.php`.

## Скриншоты

Папка `screenshots/`: главные v1–v3 в 1440 и 390, кейсы в 1440.

## Ветка

Работа в `design/mockups-v1`. В `main` не пушить: деплой на Рег.ру срабатывает по push в `main`.
