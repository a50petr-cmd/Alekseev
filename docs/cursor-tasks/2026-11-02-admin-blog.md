# Админка блога (inbox + публикация вне Git)

## Сделано

- Черновики: `blog/inbox/{slug}/` (пример `_example/`)
- Превью UI: `/_preview/admin-blog/`
- Прод-админка: `/admin/` (пароль в `petr-alekseev-data/admin.local.php`)
- Публикация → `petr-alekseev-data/blog/` (не в Git, FTP не затирает)
- Выдача: `blog/article.php` + rewrite; индекс `blog/index.php` мержит static+dynamic
- Sitemap: `blog/sitemap-dynamic.php` + строка в `robots.txt`

## Перед «публикуй»

1. На хостинге создать `petr-alekseev-data/admin.local.php` с `password_hash` (образец `admin/config.example.php`).
2. Локальный пароль в `admin/config.local.php` на прод не попадёт (gitignore + FTP exclude).

## Проверка сейчас

http://127.0.0.1:8765/_preview/admin-blog/
