<?php
/**
 * Скопируйте на хостинг как:
 *   petr-alekseev-data/admin.local.php
 * (в корне сайта; каталог petr-alekseev-data закрыт .htaccess)
 *
 * Либо локально: publish/config.local.php (не в Git / не в FTP).
 *
 * Пароль: любой длинный; храните только хеш.
 * Сгенерировать хеш: php -r "echo password_hash('ВАШ_ПАРОЛЬ', PASSWORD_DEFAULT), PHP_EOL;"
 */
return [
    'password_hash' => '$2y$10$replaceWithPasswordHashFromPasswordHashFunctionxxxxx',
    // Опционально: секрет для cookie-сессии
    'session_name' => 'pa_blog_admin',
];
