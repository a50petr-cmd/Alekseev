<?php
declare(strict_types=1);

require_once __DIR__ . '/store.php';

/**
 * @param array<string,mixed> $post
 * @param array{preview?:bool,coverUrl?:string,related?:?array{title:string,url:string}} $opts
 */
function bj_render_article_page(array $post, array $opts = []): string
{
    $preview = !empty($opts['preview']);
    $slug = (string)($post['slug'] ?? 'draft');
    $title = (string)($post['title'] ?? '');
    $description = (string)($post['description'] ?? '');
    $category = (string)($post['category'] ?? 'Практика');
    $readTime = (string)($post['readTime'] ?? '5 минут');
    $date = (string)($post['date'] ?? date('Y-m-d'));
    $dateLabel = (string)($post['dateLabel'] ?? bj_date_label($date));
    $imageAlt = (string)($post['imageAlt'] ?? $title);
    $bodyHtml = (string)($post['bodyHtml'] ?? '');
    $coverUrl = (string)($opts['coverUrl'] ?? '');
    if ($coverUrl === '' && !empty($post['coverFile'])) {
        $coverUrl = '/blog/cover.php?slug=' . rawurlencode($slug);
    }

    $related = $opts['related'] ?? bj_pick_related($slug, $category);
    $robots = $preview ? 'noindex, nofollow' : 'index,follow';
    $canonical = 'https://petr-alekseev.ru/blog/' . rawurlencode($slug) . '.html';
    $ogImage = $coverUrl !== '' && strpos($coverUrl, 'http') === 0
        ? $coverUrl
        : ($coverUrl !== '' ? 'https://petr-alekseev.ru' . $coverUrl : 'https://petr-alekseev.ru/assets/images/og-image.jpg');

    $e = static fn(string $s): string => bj_escape($s);

    $coverBlock = '';
    if ($coverUrl !== '') {
        $coverBlock = '<figure class="fx-fig" style="margin:0 0 28px">'
            . '<img src="' . $e($coverUrl) . '" alt="' . $e($imageAlt) . '" width="1200" height="630">'
            . '</figure>';
    }

    $relatedBlock = '';
    if (is_array($related) && !empty($related['title']) && !empty($related['url'])) {
        $relatedBlock = '<div class="related">Читайте также<a href="' . $e((string)$related['url']) . '">'
            . $e((string)$related['title']) . '</a></div>';
    }

    $previewBanner = $preview
        ? '<div style="background:#fff3cd;color:#664d03;padding:10px 16px;text-align:center;font:14px/1.4 system-ui,sans-serif">Черновик — не опубликовано · noindex</div>'
        : '';

    return '<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>' . $e($title) . ' — Пётр Алексеев</title>
  <meta name="description" content="' . $e($description) . '">
  <link rel="canonical" href="' . $e($canonical) . '">
  <meta name="robots" content="' . $robots . '">
  <meta property="og:title" content="' . $e($title) . '">
  <meta property="og:description" content="' . $e($description) . '">
  <meta property="og:type" content="article">
  <meta property="og:url" content="' . $e($canonical) . '">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="Пётр Алексеев">
  <meta property="og:image" content="' . $e($ogImage) . '">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="' . $e($title) . '">
  <meta name="twitter:description" content="' . $e($description) . '">
  <meta name="twitter:image" content="' . $e($ogImage) . '">
  <meta name="yandex-verification" content="36d2c01f5201e09b">
  <meta name="theme-color" content="#0f1411">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/style.css?v=20261108b">
  <link rel="stylesheet" href="/assets/css/site.css?v=20261108b">
  <link rel="stylesheet" href="/assets/css/blog.css?v=20261102a">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://petr-alekseev.ru/" },
          { "@type": "ListItem", "position": 2, "name": "Блог", "item": "https://petr-alekseev.ru/blog/" },
          { "@type": "ListItem", "position": 3, "name": ' . json_encode($title, JSON_UNESCAPED_UNICODE) . ', "item": ' . json_encode($canonical, JSON_UNESCAPED_UNICODE) . ' }
        ]
      },
      {
        "@type": "Article",
        "headline": ' . json_encode($title, JSON_UNESCAPED_UNICODE) . ',
        "datePublished": ' . json_encode($date) . ',
        "dateModified": ' . json_encode($date) . ',
        "image": ' . json_encode($ogImage) . ',
        "author": { "@type": "Person", "name": "Пётр Алексеев", "url": "https://petr-alekseev.ru/" },
        "publisher": { "@type": "Person", "name": "Пётр Алексеев", "url": "https://petr-alekseev.ru/" },
        "mainEntityOfPage": { "@type": "WebPage", "@id": ' . json_encode($canonical) . ' },
        "description": ' . json_encode($description, JSON_UNESCAPED_UNICODE) . '
      }
    ]
  }
  </script>
</head>
<body class="theme-site" data-page="blog-article">
  ' . $previewBanner . '
  <a class="skip" href="#main">К содержанию</a>
  <header class="site-header">
    <div class="wrap site-header-inner">
      <a class="logo" href="/"><span class="logo-mark" aria-hidden="true"></span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Операции · ритейл · доставка</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Открыть меню"><span></span></button>
      <nav id="nav" class="nav">
        <a href="/#offers">Услуги</a>
        <a href="/#method">Как мы работаем</a>
        <a href="/#cases">Кейсы</a>
        <a href="/blog/">Блог</a>
        <a href="/#about">О нас</a>
        <a class="btn btn-primary btn-small nav-cta" href="/#contact" data-goal="click_primary_cta">Связаться</a>
      </nav>
    </div>
  </header>
  <main id="main">
    <div class="bj-wrap">
      <ul class="bj-crumbs">
        <li><a href="/">Главная</a></li>
        <li><a href="/blog/">Блог</a></li>
        <li aria-current="page">' . $e($category) . '</li>
      </ul>
      <header class="a-head">
        <div class="kicker">' . $e($category) . ' <i>· ' . $e($readTime) . ' чтения</i></div>
        <h1>' . $e($title) . '</h1>
        <p class="dek">' . $e($description) . '</p>
        <div class="byline">
          <img class="ava" src="/assets/images/petr-alekseev.jpg" width="72" height="72" alt="Пётр Алексеев">
          <div><strong>Пётр Алексеев</strong>Операционный директор на аутсорсе · ' . $e($dateLabel) . '</div>
        </div>
      </header>
      <article class="prose">
        ' . $coverBlock . '
        ' . $bodyHtml . '
      </article>
      <section class="author">
        <img class="ava" src="/assets/images/petr-alekseev.jpg" width="72" height="72" alt="Пётр Алексеев">
        <div>
          <h4>Пётр Алексеев</h4>
          <p>18 лет в операционном управлении ритейла и доставки: X5, METRO, Купер, Комус, Евроопт. Беру операционку на 3–6 месяцев и довожу изменения до результата.</p>
          <a class="bj-btn" href="/operations-director.html#contact" data-goal="click_primary_cta">Обсудить задачу</a>
          <a class="bj-btn-ghost" href="/operations-director.html#contact">Первые 30 минут бесплатно →</a>
        </div>
      </section>
      ' . $relatedBlock . '
      <div class="related">Связанные услуги<a href="/operations-director.html">Операционный директор на аутсорсе</a><a href="/audit-biznes-processov.html">Аудит бизнес-процессов розничной сети</a></div>
    </div>
  </main>
  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div>
        <a class="logo" href="/"><span class="logo-mark" aria-hidden="true"></span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Операции · ритейл</small></span></a>
        <p class="lead" style="margin-top:12px">Берём на себя операционку и доводим изменения до результата.</p>
      </div>
      <div>
        <h2>Навигация</h2>
        <ul>
          <li><a href="/#offers">Услуги</a></li>
          <li><a href="/operations-director.html">Операционный директор на аутсорсе</a></li>
          <li><a href="/audit-biznes-processov.html">Аудит бизнес-процессов</a></li>
          <li><a href="/case-euroopt.html">Кейс Евроопт</a></li>
          <li><a href="/case-fasol.html">Кейс «Фасоль»</a></li>
          <li><a href="/case-pyaterochka.html">Кейс «Пятёрочка»</a></li>
          <li><a href="/case-x5.html">Кейс X5 Import</a></li>
          <li><a href="/case-komus.html">Кейс Комус</a></li>
          <li><a href="/case-modi.html">Кейс МОДИ</a></li>
          <li><a href="/blog/">Блог</a></li>
          <li><a href="/#contact">Связаться</a></li>
        </ul>
      </div>
      <div>
        <h2>Связь</h2>
        <ul>
          <li><a href="tel:+79269232929">+7 (926) 923-29-29</a></li>
          <li><a href="https://t.me/PetroAlekseev">@PetroAlekseev</a></li>
          <li><a href="mailto:a50petro@yandex.ru">a50petro@yandex.ru</a></li>
          <li><a href="https://t.me/Alekseev_Petr_consult" data-goal="click_telegram_channel">Канал</a></li>
        </ul>
      </div>
    </div>
    <div class="wrap legal">
      <p><a href="/privacy.html">Политика конфиденциальности</a> · <a href="/consent.html">Согласие на обработку данных</a> · © <span data-year>2026</span> Пётр Алексеев</p>
      <p>Самозанятый Алексеев Пётр, ИНН 505311612168 · Москва</p>
    </div>
  </footer>
  <a class="float-chat" href="https://t.me/PetroAlekseev" target="_blank" rel="noopener" aria-label="Написать в Telegram @PetroAlekseev"></a>
  <script src="/assets/js/consent.js"></script>
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");
   ym(113335579, "init", { clickmap:true, trackLinks:true, accurateTrackBounce:true, webvisor:true });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/113335579" style="position:absolute; left:-9999px;" alt="" /></div></noscript>
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-14HYCZP7RD"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag("js", new Date());

  gtag("config", "G-14HYCZP7RD");
</script>
  <script src="/assets/js/main.js"></script>
  <script src="/assets/js/goals.js"></script>
  <script src="/assets/js/views.js" defer></script>
</body>
</html>';
}

/**
 * @param list<array<string,mixed>> $posts
 */
function bj_render_index_cards(array $posts): string
{
    if ($posts === []) {
        return '<p>Пока нет статей.</p>';
    }

    $html = [];
    foreach ($posts as $i => $post) {
        $slug = bj_escape((string)($post['slug'] ?? ''));
        $href = '/blog/' . $slug . '.html';
        $title = bj_escape((string)($post['title'] ?? ''));
        $desc = bj_escape((string)($post['description'] ?? ''));
        $dateLabel = bj_escape((string)($post['dateLabel'] ?? ''));
        $category = bj_escape((string)($post['category'] ?? ''));
        $readTime = bj_escape((string)($post['readTime'] ?? ''));
        $figure = bj_escape((string)($post['figure'] ?? '·'));
        $figureCaption = bj_escape((string)($post['figureCaption'] ?? ''));

        if ($i === 0) {
            $html[] = '<a class="feature" href="' . $href . '">'
                . '<div class="cover"><span class="tag">' . $category . '</span><div>'
                . '<div class="num">' . $figure . '</div>'
                . '<div class="cap">' . $figureCaption . ($figureCaption !== '' && $desc !== '' ? '. ' : '')
                . ($figureCaption === '' ? $desc : '') . '</div>'
                . '</div></div>'
                . '<div><div class="meta">' . $dateLabel . ' · ' . $readTime . ' чтения</div>'
                . '<h2>' . $title . '</h2><p>' . $desc . '</p>'
                . '<span class="more">Читать →</span></div></a>';
        } else {
            $html[] = '<a class="row" href="' . $href . '">'
                . '<div class="date">' . $dateLabel . '<br>' . $category . '</div>'
                . '<div><h3>' . $title . '</h3><p>' . $desc . '</p></div>'
                . '<div class="fig"><b>' . $figure . '</b><span>' . $figureCaption . '</span></div>'
                . '</a>';
        }
    }
    return implode("\n", $html);
}
