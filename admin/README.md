# Админка блога

URL на проде: `https://petr-alekseev.ru/admin/`

## Первый запуск на хостинге

1. Сгенерируйте хеш пароля (на машине с PHP):
   `php -r "echo password_hash('ВАШ_ПАРОЛЬ', PASSWORD_DEFAULT), PHP_EOL;"`
2. Создайте файл `petr-alekseev-data/admin.local.php` в корне сайта (как `config.example.php`).
3. Каталог `petr-alekseev-data/` закрыт от веба и не заливается/не чистится FTP.

Локально для проверки: `admin/config.local.php` (в `.gitignore`), пароль по умолчанию в комментарии файла.

## Поток

1. ИИ пишет черновик в `blog/inbox/{slug}/` (meta.json + article.md + cover).
2. Вы правите и в админке вставляете текст / загружаете обложку.
3. **Превью** → ссылка `/admin/preview.php?id=…` (noindex).
4. **Опубликовать** → статья в `petr-alekseev-data/blog/`, URL `/blog/{slug}.html`.

Статические статьи из Git не трогаются. Новый slug не должен совпадать с существующим `.html` в `blog/`.
