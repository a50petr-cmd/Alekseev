<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib/store.php';

$slug = (string)($_GET['slug'] ?? '');
if (!bj_is_slug($slug) || !bj_dynamic_exists($slug)) {
    http_response_code(404);
    exit;
}

$dir = bj_post_dir($slug);
$file = null;
$mime = 'image/jpeg';
foreach (
    [
        'cover.webp' => 'image/webp',
        'cover.jpg' => 'image/jpeg',
        'cover.jpeg' => 'image/jpeg',
        'cover.png' => 'image/png',
        'cover.gif' => 'image/gif',
    ] as $name => $type
) {
    $path = $dir . DIRECTORY_SEPARATOR . $name;
    if (is_file($path)) {
        $file = $path;
        $mime = $type;
        break;
    }
}

if ($file === null) {
    http_response_code(404);
    exit;
}

header('Content-Type: ' . $mime);
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=86400');
readfile($file);
