<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib/store.php';

header('Content-Type: application/xml; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: public, max-age=300');

$cached = bj_data_root() . DIRECTORY_SEPARATOR . 'sitemap-dynamic.xml';
if (!is_file($cached)) {
    bj_write_dynamic_sitemap();
}

if (is_file($cached)) {
    readfile($cached);
    exit;
}

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' . "\n";
foreach (bj_load_dynamic_posts() as $post) {
    $slug = (string)($post['slug'] ?? '');
    if ($slug === '') {
        continue;
    }
    $last = (string)($post['date'] ?? date('Y-m-d'));
    echo '  <url><loc>https://petr-alekseev.ru/blog/' . htmlspecialchars($slug, ENT_XML1) . '.html</loc>';
    echo '<lastmod>' . htmlspecialchars($last, ENT_XML1) . '</lastmod>';
    echo '<changefreq>monthly</changefreq><priority>0.6</priority></url>' . "\n";
}
echo "</urlset>\n";
