<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib/store.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=60');

$posts = bj_load_all_posts();
foreach ($posts as &$p) {
    unset($p['bodyHtml']);
}
unset($p);

echo json_encode($posts, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
