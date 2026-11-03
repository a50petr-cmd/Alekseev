# RESULTS · 2026-11-03-about-team-image

## Задача
`2026-11-03-about-team-image.md` — картинка блока «О нас» под заголовок «Один ответственный — не один исполнитель».

## Сделано
Сгенерирована editorial-иллюстрация: один человек со спины в центре, нити и карточки задач с отдельных столов сходятся к нему, силуэты команды по краям. Лица и портрет Петра не рисовались, текста и логотипов на кадре нет.

Кадр 3:4 (864×1152) обрезан по центру до 4:5 и сохранён как `assets/images/about-team.png` 640×800 (PIL). Старый файл не удалялся отдельно: остаётся в истории git (коммит 7680f87).

В `index.html` к `src` добавлен `?v=20261103a`. Alt без изменений.

`_preview/home-conversion/index.html` поправлен так же локально. Папки нет в `main`, в pull request она не входит.

## Промпт
`one calm anonymous professional seen from behind at the center of a clean editorial workspace, no face visible, loose threads and scattered task cards from several small separate desks converging neatly into one person's hands, a few anonymous team silhouettes at the edges each working on their own part with faces not shown, visual imbalance between the chaos of many separate scattered pieces and one ordered focal point, editorial illustration, calm business atmosphere, soft natural light, muted palette, no text, no letters, no numbers, no logos, no watermarks, clean composition, single focal point`

## Проверка
Локально `http://127.0.0.1:8765/#about`:
- 1440 px: картинка 464×580 (4:5), фокус (человек в центре) в кадре, текст блока читается, горизонтального скролла нет (`scrollWidth` = `clientWidth`).
- 390 px: картинка 364×455, заголовок и текст читаются, горизонтального скролла нет.
- Файл отдаётся 640×800, в `src` есть `?v=20261103a`.

## Файлы в PR
- `assets/images/about-team.png`
- `index.html`
- `docs/cursor-tasks/RESULTS-2026-11-03-about-team-image.md`

Ветка `fix/about-team-image`. В `main` не пушил и не мёржил.
