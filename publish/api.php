<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';
require_once dirname(__DIR__) . '/blog/_lib/store.php';

admin_boot_session();
if (!admin_logged_in()) {
    admin_json(['ok' => false, 'error' => 'auth'], 401);
}

$action = (string)($_POST['action'] ?? $_GET['action'] ?? '');

if ($action === 'list') {
    admin_json(['ok' => true, 'posts' => bj_load_dynamic_posts()]);
}

if ($action === 'preview_save') {
    $payload = json_decode((string)($_POST['payload'] ?? ''), true);
    if (!is_array($payload)) {
        admin_json(['ok' => false, 'error' => 'payload'], 400);
    }
    $id = bin2hex(random_bytes(8));
    $draft = [
        'id' => $id,
        'slug' => (string)($payload['slug'] ?? ''),
        'title' => (string)($payload['title'] ?? ''),
        'description' => (string)($payload['description'] ?? ''),
        'date' => (string)($payload['date'] ?? date('Y-m-d')),
        'dateLabel' => (string)($payload['dateLabel'] ?? ''),
        'category' => (string)($payload['category'] ?? 'Практика'),
        'readTime' => (string)($payload['readTime'] ?? ''),
        'figure' => (string)($payload['figure'] ?? '·'),
        'figureCaption' => (string)($payload['figureCaption'] ?? ''),
        'imageAlt' => (string)($payload['imageAlt'] ?? ''),
        'bodyMd' => (string)($payload['bodyMd'] ?? ''),
        'coverDataUrl' => (string)($payload['coverDataUrl'] ?? ''),
        'created' => time(),
    ];
    if ($draft['dateLabel'] === '' && $draft['date'] !== '') {
        $draft['dateLabel'] = bj_date_label($draft['date']);
    }
    if ($draft['readTime'] === '') {
        $draft['readTime'] = bj_estimate_read_time($draft['bodyMd']);
    }
    $path = bj_drafts_dir() . DIRECTORY_SEPARATOR . $id . '.json';
    if (file_put_contents($path, json_encode($draft, JSON_UNESCAPED_UNICODE) . "\n") === false) {
        admin_json(['ok' => false, 'error' => 'write'], 500);
    }
    admin_json(['ok' => true, 'id' => $id, 'url' => '/publish/preview.php?id=' . rawurlencode($id)]);
}

if ($action === 'publish') {
    $payload = json_decode((string)($_POST['payload'] ?? ''), true);
    if (!is_array($payload)) {
        admin_json(['ok' => false, 'error' => 'payload'], 400);
    }

    $title = trim((string)($payload['title'] ?? ''));
    $bodyMd = (string)($payload['bodyMd'] ?? '');
    $slug = trim((string)($payload['slug'] ?? ''));
    if ($slug === '') {
        $slug = bj_slugify($title);
    }
    if ($title === '' || $bodyMd === '' || !bj_is_slug($slug)) {
        admin_json(['ok' => false, 'error' => 'fields'], 400);
    }

    // Не перекрывать статические статьи из Git
    $staticFile = dirname(__DIR__) . '/blog/' . $slug . '.html';
    if (is_file($staticFile) && !bj_dynamic_exists($slug)) {
        admin_json(['ok' => false, 'error' => 'slug_static', 'message' => 'Этот slug занят статьёй из репозитория. Смените slug.'], 409);
    }

    $date = (string)($payload['date'] ?? date('Y-m-d'));
    $meta = [
        'slug' => $slug,
        'title' => $title,
        'description' => trim((string)($payload['description'] ?? '')),
        'date' => $date,
        'dateLabel' => (string)($payload['dateLabel'] ?? bj_date_label($date)),
        'category' => (string)($payload['category'] ?? 'Практика'),
        'readTime' => (string)($payload['readTime'] ?? bj_estimate_read_time($bodyMd)),
        'figure' => (string)($payload['figure'] ?? '·'),
        'figureCaption' => (string)($payload['figureCaption'] ?? ''),
        'imageAlt' => (string)($payload['imageAlt'] ?? $title),
    ];
    if ($meta['description'] === '') {
        $plain = trim(preg_replace('/\s+/', ' ', strip_tags(bj_markdown_to_html($bodyMd))) ?? '');
        $meta['description'] = mb_substr($plain, 0, 160, 'UTF-8');
    }

    $coverTmp = null;
    $coverExt = null;
    if (!empty($_FILES['cover']['tmp_name']) && is_uploaded_file($_FILES['cover']['tmp_name'])) {
        $coverTmp = $_FILES['cover']['tmp_name'];
        $coverExt = strtolower(pathinfo((string)$_FILES['cover']['name'], PATHINFO_EXTENSION));
    } elseif (!empty($payload['coverDataUrl']) && preg_match('#^data:image/(png|jpe?g|webp|gif);base64,#i', (string)$payload['coverDataUrl'], $m)) {
        $bin = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', (string)$payload['coverDataUrl']) ?: '', true);
        if ($bin !== false) {
            $coverExt = strtolower($m[1]);
            if ($coverExt === 'jpeg') {
                $coverExt = 'jpg';
            }
            $coverTmp = tempnam(sys_get_temp_dir(), 'bjcover');
            file_put_contents($coverTmp, $bin);
        }
    }

    $bodyHtml = bj_markdown_to_html($bodyMd);
    $result = bj_publish_post($meta, $bodyHtml, $coverTmp, $coverExt);
    if (empty($result['ok'])) {
        admin_json(['ok' => false, 'error' => $result['error'] ?? 'publish'], 500);
    }
    admin_json(['ok' => true, 'slug' => $slug, 'url' => $result['url']]);
}

admin_json(['ok' => false, 'error' => 'action'], 400);
