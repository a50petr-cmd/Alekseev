<?php
declare(strict_types=1);

/**
 * Хранилище динамических статей блога (вне Git / FTP).
 * Каталог: ../petr-alekseev-data/blog/ или blog/_data/ как fallback.
 */

const BJ_DATA_DIR_NAME = 'petr-alekseev-data';

function bj_project_root(): string
{
    return dirname(__DIR__, 2);
}

function bj_data_root(): string
{
    static $cached = null;
    if ($cached !== null) {
        return $cached;
    }

    // Как api/views.php: <webroot>/petr-alekseev-data/blog (каталог закрыт .htaccess)
    $primary = bj_project_root() . DIRECTORY_SEPARATOR . BJ_DATA_DIR_NAME . DIRECTORY_SEPARATOR . 'blog';
    $primaryParent = dirname($primary);
    if (is_dir($primaryParent) || @mkdir($primaryParent, 0700, true)) {
        bj_ensure_data_htaccess($primaryParent);
        if (!is_dir($primary)) {
            @mkdir($primary, 0700, true);
        }
        if (is_dir($primary) && (is_writable($primary) || is_writable($primaryParent))) {
            $cached = $primary;
            return $cached;
        }
    }

    $fallback = bj_project_root() . DIRECTORY_SEPARATOR . 'blog' . DIRECTORY_SEPARATOR . '_data';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0700, true);
    }
    $cached = $fallback;
    return $cached;
}

function bj_ensure_data_htaccess(string $dir): void
{
    $ht = $dir . DIRECTORY_SEPARATOR . '.htaccess';
    if (is_file($ht)) {
        return;
    }
    @file_put_contents($ht, "Require all denied\n");
}

function bj_posts_index_path(): string
{
    return bj_data_root() . DIRECTORY_SEPARATOR . 'posts.json';
}

function bj_post_dir(string $slug): string
{
    return bj_data_root() . DIRECTORY_SEPARATOR . 'posts' . DIRECTORY_SEPARATOR . $slug;
}

function bj_drafts_dir(): string
{
    $dir = bj_data_root() . DIRECTORY_SEPARATOR . 'drafts';
    if (!is_dir($dir)) {
        @mkdir($dir, 0700, true);
    }
    return $dir;
}

function bj_is_slug(string $slug): bool
{
    return (bool)preg_match('/^[a-z0-9]+(?:-[a-z0-9]+)*$/', $slug);
}

/** @return list<array<string,mixed>> */
function bj_load_static_posts(): array
{
    $file = bj_project_root() . DIRECTORY_SEPARATOR . 'blog' . DIRECTORY_SEPARATOR . 'posts.json';
    if (!is_file($file)) {
        return [];
    }
    $json = json_decode((string)file_get_contents($file), true);
    return is_array($json) ? $json : [];
}

/** @return list<array<string,mixed>> */
function bj_load_dynamic_posts(): array
{
    $file = bj_posts_index_path();
    if (!is_file($file)) {
        return [];
    }
    $json = json_decode((string)file_get_contents($file), true);
    return is_array($json) ? $json : [];
}

function bj_hidden_path(): string
{
    return bj_data_root() . DIRECTORY_SEPARATOR . 'hidden.json';
}

/** @return array<string,true> */
function bj_load_hidden_slugs(): array
{
    $file = bj_hidden_path();
    if (!is_file($file)) {
        return [];
    }
    $json = json_decode((string)file_get_contents($file), true);
    if (!is_array($json)) {
        return [];
    }
    $out = [];
    foreach ($json as $slug) {
        if (is_string($slug) && bj_is_slug($slug)) {
            $out[$slug] = true;
        }
    }
    return $out;
}

function bj_is_hidden(string $slug): bool
{
    return isset(bj_load_hidden_slugs()[$slug]);
}

/** @param array<string,true> $slugs */
function bj_save_hidden_slugs(array $slugs): bool
{
    $list = array_keys($slugs);
    sort($list);
    $json = json_encode(array_values($list), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents(bj_hidden_path(), $json . "\n") !== false;
}

function bj_hide_slug(string $slug): bool
{
    if (!bj_is_slug($slug)) {
        return false;
    }
    $hidden = bj_load_hidden_slugs();
    $hidden[$slug] = true;
    return bj_save_hidden_slugs($hidden);
}

/**
 * Объединённый список: динамические + статическиe, без скрытых и дублей.
 * @return list<array<string,mixed>>
 */
function bj_load_all_posts(): array
{
    $dynamic = bj_load_dynamic_posts();
    $static = bj_load_static_posts();
    $hidden = bj_load_hidden_slugs();
    $dynamicSlugs = [];
    foreach ($dynamic as $p) {
        if (is_array($p) && !empty($p['slug'])) {
            $dynamicSlugs[(string)$p['slug']] = true;
        }
    }
    $seen = [];
    $out = [];

    foreach (array_merge($dynamic, $static) as $post) {
        if (!is_array($post)) {
            continue;
        }
        $slug = (string)($post['slug'] ?? '');
        if ($slug === '' || isset($seen[$slug]) || isset($hidden[$slug])) {
            continue;
        }
        $seen[$slug] = true;
        $post['source'] = isset($dynamicSlugs[$slug]) ? 'dynamic' : 'static';
        $post['canDelete'] = true;
        $out[] = $post;
    }

    usort($out, static function (array $a, array $b): int {
        return strcmp((string)($b['date'] ?? ''), (string)($a['date'] ?? ''));
    });

    return $out;
}

function bj_dynamic_exists(string $slug): bool
{
    if (!bj_is_slug($slug)) {
        return false;
    }
    return is_file(bj_post_dir($slug) . DIRECTORY_SEPARATOR . 'meta.json');
}

/** @return array<string,mixed>|null */
function bj_load_dynamic_post(string $slug): ?array
{
    if (!bj_dynamic_exists($slug)) {
        return null;
    }
    $dir = bj_post_dir($slug);
    $meta = json_decode((string)file_get_contents($dir . DIRECTORY_SEPARATOR . 'meta.json'), true);
    if (!is_array($meta)) {
        return null;
    }
    $bodyFile = $dir . DIRECTORY_SEPARATOR . 'body.html';
    $meta['bodyHtml'] = is_file($bodyFile) ? (string)file_get_contents($bodyFile) : '';
    $meta['source'] = 'dynamic';

    foreach (['cover.webp', 'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif'] as $name) {
        if (is_file($dir . DIRECTORY_SEPARATOR . $name)) {
            $meta['coverFile'] = $name;
            break;
        }
    }

    return $meta;
}

/** @param list<array<string,mixed>> $posts */
function bj_save_dynamic_index(array $posts): bool
{
    $dir = bj_data_root();
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        return false;
    }
    $json = json_encode(array_values($posts), JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    return file_put_contents(bj_posts_index_path(), $json . "\n") !== false;
}

/**
 * @param array<string,mixed> $meta
 */
function bj_publish_post(array $meta, string $bodyHtml, ?string $coverTmpPath = null, ?string $coverExt = null): array
{
    $slug = (string)($meta['slug'] ?? '');
    if (!bj_is_slug($slug)) {
        return ['ok' => false, 'error' => 'bad_slug'];
    }

    $dir = bj_post_dir($slug);
    if (!is_dir($dir) && !@mkdir($dir, 0700, true)) {
        return ['ok' => false, 'error' => 'mkdir'];
    }

    $bodyHtml = bj_sanitize_body_html($bodyHtml);
    if (file_put_contents($dir . DIRECTORY_SEPARATOR . 'body.html', $bodyHtml) === false) {
        return ['ok' => false, 'error' => 'body_write'];
    }

    $coverFile = null;
    if ($coverTmpPath && is_file($coverTmpPath)) {
        $ext = strtolower($coverExt ?: (pathinfo($coverTmpPath, PATHINFO_EXTENSION) ?: 'jpg'));
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp', 'gif'], true)) {
            $ext = 'jpg';
        }
        $coverFile = 'cover.' . ($ext === 'jpeg' ? 'jpg' : $ext);
        foreach (['cover.webp', 'cover.jpg', 'cover.jpeg', 'cover.png', 'cover.gif'] as $old) {
            $p = $dir . DIRECTORY_SEPARATOR . $old;
            if (is_file($p) && $old !== $coverFile) {
                @unlink($p);
            }
        }
        if (!@move_uploaded_file($coverTmpPath, $dir . DIRECTORY_SEPARATOR . $coverFile)
            && !@rename($coverTmpPath, $dir . DIRECTORY_SEPARATOR . $coverFile)
            && !@copy($coverTmpPath, $dir . DIRECTORY_SEPARATOR . $coverFile)) {
            return ['ok' => false, 'error' => 'cover_write'];
        }
        @unlink($coverTmpPath);
    }

    $indexMeta = [
        'slug' => $slug,
        'title' => (string)($meta['title'] ?? ''),
        'description' => (string)($meta['description'] ?? ''),
        'date' => (string)($meta['date'] ?? date('Y-m-d')),
        'dateLabel' => (string)($meta['dateLabel'] ?? ''),
        'category' => (string)($meta['category'] ?? 'Практика'),
        'readTime' => (string)($meta['readTime'] ?? '5 минут'),
        'figure' => (string)($meta['figure'] ?? '·'),
        'figureCaption' => (string)($meta['figureCaption'] ?? ''),
        'imageAlt' => (string)($meta['imageAlt'] ?? ''),
        'source' => 'dynamic',
    ];
    if ($coverFile) {
        $indexMeta['coverFile'] = $coverFile;
    } elseif (!empty($meta['coverFile'])) {
        $indexMeta['coverFile'] = (string)$meta['coverFile'];
    }

    if (file_put_contents(
        $dir . DIRECTORY_SEPARATOR . 'meta.json',
        json_encode($indexMeta, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT) . "\n"
    ) === false) {
        return ['ok' => false, 'error' => 'meta_write'];
    }

    $posts = bj_load_dynamic_posts();
    $posts = array_values(array_filter($posts, static fn($p) => ($p['slug'] ?? '') !== $slug));
    array_unshift($posts, $indexMeta);
    usort($posts, static fn($a, $b) => strcmp((string)($b['date'] ?? ''), (string)($a['date'] ?? '')));
    if (!bj_save_dynamic_index($posts)) {
        return ['ok' => false, 'error' => 'index_write'];
    }

    bj_write_dynamic_sitemap();

    // Если slug раньше скрывали из админки — вернуть на сайт
    $hidden = bj_load_hidden_slugs();
    if (isset($hidden[$slug])) {
        unset($hidden[$slug]);
        bj_save_hidden_slugs($hidden);
    }

    return ['ok' => true, 'slug' => $slug, 'url' => '/blog/' . $slug . '.html'];
}

function bj_delete_post(string $slug): array
{
    if (!bj_is_slug($slug)) {
        return ['ok' => false, 'error' => 'bad_slug'];
    }

    $existed = bj_dynamic_exists($slug);
    foreach (bj_load_static_posts() as $p) {
        if (($p['slug'] ?? '') === $slug) {
            $existed = true;
            break;
        }
    }
    if (!$existed && is_file(bj_project_root() . DIRECTORY_SEPARATOR . 'blog' . DIRECTORY_SEPARATOR . $slug . '.html')) {
        $existed = true;
    }
    if (!$existed) {
        return ['ok' => false, 'error' => 'not_found'];
    }

    if (bj_dynamic_exists($slug)) {
        $dir = bj_post_dir($slug);
        foreach (scandir($dir) ?: [] as $name) {
            if ($name === '.' || $name === '..') {
                continue;
            }
            $path = $dir . DIRECTORY_SEPARATOR . $name;
            if (is_file($path)) {
                @unlink($path);
            }
        }
        @rmdir($dir);

        $posts = array_values(array_filter(
            bj_load_dynamic_posts(),
            static fn($p) => ($p['slug'] ?? '') !== $slug
        ));
        if (!bj_save_dynamic_index($posts)) {
            return ['ok' => false, 'error' => 'index_write'];
        }
        bj_write_dynamic_sitemap();
    }

    // Статические из Git не трогаем файлами — прячем вне репозитория
    if (!bj_hide_slug($slug)) {
        return ['ok' => false, 'error' => 'hide_write'];
    }

    return ['ok' => true, 'slug' => $slug];
}

function bj_write_dynamic_sitemap(): void
{
    $posts = bj_load_dynamic_posts();
    $lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ];
    foreach ($posts as $post) {
        $slug = (string)($post['slug'] ?? '');
        if ($slug === '') {
            continue;
        }
        $last = (string)($post['date'] ?? date('Y-m-d'));
        $lines[] = '  <url><loc>https://petr-alekseev.ru/blog/' . htmlspecialchars($slug, ENT_XML1) . '.html</loc>'
            . '<lastmod>' . htmlspecialchars($last, ENT_XML1) . '</lastmod>'
            . '<changefreq>monthly</changefreq><priority>0.6</priority></url>';
    }
    $lines[] = '</urlset>';
    file_put_contents(bj_data_root() . DIRECTORY_SEPARATOR . 'sitemap-dynamic.xml', implode("\n", $lines) . "\n");
}

function bj_escape(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

/** Markdown-lite → HTML для .prose */
function bj_markdown_to_html(string $md): string
{
    $md = str_replace(["\r\n", "\r"], "\n", $md);
    $md = trim($md);
    if ($md === '') {
        return '';
    }

    $blocks = preg_split("/\n{2,}/", $md) ?: [];
    $html = [];

    foreach ($blocks as $block) {
        $block = trim($block);
        if ($block === '') {
            continue;
        }

        if (preg_match('/^##\s+(.+)$/u', $block, $m) && substr_count($block, "\n") === 0) {
            $html[] = '<h2>' . bj_inline(trim($m[1])) . '</h2>';
            continue;
        }

        $lines = explode("\n", $block);
        $isUl = true;
        $isOl = true;
        foreach ($lines as $line) {
            if (!preg_match('/^\s*[-*]\s+/u', $line)) {
                $isUl = false;
            }
            if (!preg_match('/^\s*\d+\.\s+/u', $line)) {
                $isOl = false;
            }
        }

        if ($isUl && count($lines) > 0) {
            $items = [];
            foreach ($lines as $line) {
                $items[] = '<li>' . bj_inline(preg_replace('/^\s*[-*]\s+/u', '', $line) ?? $line) . '</li>';
            }
            $html[] = '<ul>' . implode('', $items) . '</ul>';
            continue;
        }

        if ($isOl && count($lines) > 0) {
            $items = [];
            foreach ($lines as $line) {
                $items[] = '<li>' . bj_inline(preg_replace('/^\s*\d+\.\s+/u', '', $line) ?? $line) . '</li>';
            }
            $html[] = '<ol>' . implode('', $items) . '</ol>';
            continue;
        }

        // Несколько ## в одном блоке (строка за строкой)
        if (preg_match('/^##\s+/u', $block)) {
            foreach ($lines as $line) {
                $line = trim($line);
                if ($line === '') {
                    continue;
                }
                if (preg_match('/^##\s+(.+)$/u', $line, $m)) {
                    $html[] = '<h2>' . bj_inline(trim($m[1])) . '</h2>';
                } else {
                    $html[] = '<p>' . bj_inline($line) . '</p>';
                }
            }
            continue;
        }

        $para = bj_inline(preg_replace("/\n+/", ' ', $block) ?? $block);
        $html[] = '<p>' . $para . '</p>';
    }

    return implode("\n", $html);
}

function bj_inline(string $text): string
{
    $text = bj_escape($text);
    $text = preg_replace(
        '/\[([^\]]+)\]\((https?:\/\/[^)\s]+|\/[^)\s]*)\)/u',
        '<a href="$2">$1</a>',
        $text
    ) ?? $text;
    $text = preg_replace('/\*\*([^*]+)\*\*/u', '<strong>$1</strong>', $text) ?? $text;
    return $text;
}

function bj_sanitize_body_html(string $html): string
{
    $html = preg_replace('#<(script|iframe|object|embed|form)[^>]*>.*?</\1>#is', '', $html) ?? $html;
    $html = preg_replace('#</?(script|iframe|object|embed|form)[^>]*>#is', '', $html) ?? $html;
    $html = preg_replace('/\son\w+\s*=\s*("|\').*?\1/iu', '', $html) ?? $html;
    $html = preg_replace('/\shref\s*=\s*("|\')\s*javascript:[^\'"]*\1/iu', ' href="#"', $html) ?? $html;
    return $html;
}

function bj_estimate_read_time(string $text): string
{
    $words = preg_split('/\s+/u', trim(strip_tags($text))) ?: [];
    $n = max(1, (int)ceil(count(array_filter($words)) / 180));
    $mod = $n % 10;
    $mod100 = $n % 100;
    if ($mod === 1 && $mod100 !== 11) {
        $word = 'минута';
    } elseif ($mod >= 2 && $mod <= 4 && ($mod100 < 12 || $mod100 > 14)) {
        $word = 'минуты';
    } else {
        $word = 'минут';
    }
    return $n . ' ' . $word;
}

function bj_date_label(string $iso): string
{
    $months = [
        1 => 'января', 2 => 'февраля', 3 => 'марта', 4 => 'апреля',
        5 => 'мая', 6 => 'июня', 7 => 'июля', 8 => 'августа',
        9 => 'сентября', 10 => 'октября', 11 => 'ноября', 12 => 'декабря',
    ];
    $t = strtotime($iso);
    if ($t === false) {
        return $iso;
    }
    $d = (int)date('j', $t);
    $m = (int)date('n', $t);
    $y = date('Y', $t);
    return $d . ' ' . ($months[$m] ?? '') . ' ' . $y;
}

function bj_slugify(string $title): string
{
    $map = [
        'а'=>'a','б'=>'b','в'=>'v','г'=>'g','д'=>'d','е'=>'e','ё'=>'e','ж'=>'zh','з'=>'z','и'=>'i','й'=>'j',
        'к'=>'k','л'=>'l','м'=>'m','н'=>'n','о'=>'o','п'=>'p','р'=>'r','с'=>'s','т'=>'t','у'=>'u','ф'=>'f',
        'х'=>'h','ц'=>'c','ч'=>'ch','ш'=>'sh','щ'=>'sch','ъ'=>'','ы'=>'y','ь'=>'','э'=>'e','ю'=>'yu','я'=>'ya',
    ];
    $s = mb_strtolower(trim($title), 'UTF-8');
    $out = '';
    $len = mb_strlen($s, 'UTF-8');
    for ($i = 0; $i < $len; $i++) {
        $ch = mb_substr($s, $i, 1, 'UTF-8');
        if (isset($map[$ch])) {
            $out .= $map[$ch];
        } elseif (preg_match('/[a-z0-9]/', $ch)) {
            $out .= $ch;
        } else {
            $out .= '-';
        }
    }
    $out = preg_replace('/-+/', '-', $out) ?? $out;
    return trim($out, '-') ?: 'statya';
}

/** @return array{title:string,url:string}|null */
function bj_pick_related(string $currentSlug, string $category = ''): ?array
{
    foreach (bj_load_all_posts() as $post) {
        $slug = (string)($post['slug'] ?? '');
        if ($slug === '' || $slug === $currentSlug) {
            continue;
        }
        if ($category !== '' && (string)($post['category'] ?? '') === $category) {
            return ['title' => (string)$post['title'], 'url' => '/blog/' . $slug . '.html'];
        }
    }
    foreach (bj_load_all_posts() as $post) {
        $slug = (string)($post['slug'] ?? '');
        if ($slug === '' || $slug === $currentSlug) {
            continue;
        }
        return ['title' => (string)$post['title'], 'url' => '/blog/' . $slug . '.html'];
    }
    return null;
}
