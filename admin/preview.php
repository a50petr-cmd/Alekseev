<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_once dirname(__DIR__) . '/blog/_lib/render.php';

admin_require_login();

$id = (string)($_GET['id'] ?? '');
if (!preg_match('/^[a-f0-9]{16}$/', $id)) {
    http_response_code(400);
    echo 'Bad id';
    exit;
}

$path = bj_drafts_dir() . DIRECTORY_SEPARATOR . $id . '.json';
if (!is_file($path)) {
    http_response_code(404);
    echo 'Draft not found';
    exit;
}

$draft = json_decode((string)file_get_contents($path), true);
if (!is_array($draft)) {
    http_response_code(500);
    echo 'Bad draft';
    exit;
}

$coverUrl = '';
if (!empty($draft['coverDataUrl'])) {
    $coverUrl = (string)$draft['coverDataUrl'];
}

$post = [
    'slug' => (string)($draft['slug'] ?: 'preview'),
    'title' => (string)$draft['title'],
    'description' => (string)$draft['description'],
    'date' => (string)$draft['date'],
    'dateLabel' => (string)($draft['dateLabel'] ?: bj_date_label((string)$draft['date'])),
    'category' => (string)$draft['category'],
    'readTime' => (string)($draft['readTime'] ?: bj_estimate_read_time((string)$draft['bodyMd'])),
    'imageAlt' => (string)($draft['imageAlt'] ?: $draft['title']),
    'bodyHtml' => bj_markdown_to_html((string)$draft['bodyMd']),
];

header('Content-Type: text/html; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');
echo bj_render_article_page($post, [
    'preview' => true,
    'coverUrl' => $coverUrl,
]);
