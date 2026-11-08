<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib/render.php';

$slug = (string)($_GET['slug'] ?? '');

$slugRedirects = [
    'biznes-processy-v-malom-biznese-s-chego-nachat-esli-vse-derzhitsya-na-vas' => 'biznes-processy-malogo-biznesa',
];
if (isset($slugRedirects[$slug])) {
    $target = '/blog/' . rawurlencode($slugRedirects[$slug]) . '.html';
    header('Location: ' . $target, true, 301);
    exit;
}

if (!bj_is_slug($slug)) {
    http_response_code(404);
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}

if (bj_is_hidden($slug)) {
    http_response_code(404);
    $nf = dirname(__DIR__) . DIRECTORY_SEPARATOR . '404.html';
    if (is_file($nf)) {
        header('Content-Type: text/html; charset=utf-8');
        readfile($nf);
        exit;
    }
    header('Content-Type: text/plain; charset=utf-8');
    echo 'Not found';
    exit;
}

$post = bj_load_dynamic_post($slug);
if ($post !== null) {
    header('Content-Type: text/html; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo bj_render_article_page($post, ['preview' => false]);
    exit;
}

$static = __DIR__ . DIRECTORY_SEPARATOR . $slug . '.html';
if (is_file($static)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($static);
    exit;
}

http_response_code(404);
$nf = dirname(__DIR__) . DIRECTORY_SEPARATOR . '404.html';
if (is_file($nf)) {
    header('Content-Type: text/html; charset=utf-8');
    readfile($nf);
    exit;
}
header('Content-Type: text/plain; charset=utf-8');
echo 'Not found';
