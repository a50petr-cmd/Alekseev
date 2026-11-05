<?php
declare(strict_types=1);

require_once __DIR__ . '/_lib/render.php';

$posts = bj_load_all_posts();
$cards = bj_render_index_cards($posts);
?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Блог — Пётр Алексеев</title>
  <meta name="description" content="Статьи об операционном управлении, ритейле, быстрой доставке и дарксторах — практика Петра Алексеева.">
  <link rel="canonical" href="https://petr-alekseev.ru/blog/">
  <meta name="robots" content="index,follow">
  <meta property="og:title" content="Блог — Пётр Алексеев">
  <meta property="og:description" content="Статьи об операционном управлении, ритейле, быстрой доставке и дарксторах — практика Петра Алексеева.">
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://petr-alekseev.ru/blog/">
  <meta property="og:locale" content="ru_RU">
  <meta property="og:site_name" content="Пётр Алексеев">
  <meta property="og:image" content="https://petr-alekseev.ru/assets/images/og-image.jpg">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Блог — Пётр Алексеев">
  <meta name="twitter:description" content="Статьи об операционном управлении, ритейле, быстрой доставке и дарксторах — практика Петра Алексеева.">
  <meta name="twitter:image" content="https://petr-alekseev.ru/assets/images/og-image.jpg">
  <meta name="yandex-verification" content="36d2c01f5201e09b">
  <meta name="theme-color" content="#0f1411">
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
  <link rel="icon" href="/assets/favicon.png" type="image/png" sizes="32x32">
  <link rel="icon" href="/assets/favicon-48.png" type="image/png" sizes="48x48">
  <link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
  <link rel="stylesheet" href="/assets/css/style.css?v=20261027b">
  <link rel="stylesheet" href="/assets/css/site.css?v=20261103a">
  <link rel="stylesheet" href="/assets/css/blog.css?v=20261102a">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Главная", "item": "https://petr-alekseev.ru/" },
          { "@type": "ListItem", "position": 2, "name": "Блог", "item": "https://petr-alekseev.ru/blog/" }
        ]
      },
      {
        "@type": "Blog",
        "name": "Блог — Пётр Алексеев",
        "url": "https://petr-alekseev.ru/blog/",
        "description": "Статьи об операционном управлении, ритейле, быстрой доставке и дарксторах — практика Петра Алексеева.",
        "inLanguage": "ru-RU",
        "author": { "@type": "Person", "name": "Пётр Алексеев", "url": "https://petr-alekseev.ru/" }
      }
    ]
  }
  </script>
</head>
<body class="theme-site" data-page="blog">
  <a class="skip" href="#main">К содержанию</a>
  <header class="site-header">
    <div class="wrap site-header-inner">
      <a class="logo" href="/"><span class="logo-mark" aria-hidden="true"></span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Операции · ритейл · доставка</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Открыть меню"><span></span></button>
      <nav id="nav" class="nav">
        <a href="/#offers">Услуги</a>
        <a href="/#method">Как мы работаем</a>
        <a href="/#cases">Кейсы</a>
        <a href="/blog/" aria-current="page">Блог</a>
        <a href="/#about">О нас</a>
        <a class="btn btn-primary btn-small nav-cta" href="/#contact" data-goal="click_primary_cta">Связаться</a>
      </nav>
    </div>
  </header>
  <main id="main">
    <div class="bj-wrap">
      <header class="b-head">
        <h1>Блог</h1>
        <p>Практика операционного управления: ритейл, доставка, дарксторы. Кейсы, разборы и мнение о новостях рынка.</p>
      </header>

      <?php echo $cards; ?>

      <div class="b-foot">
        <p>Узнали свою ситуацию? Разберём её за 30 минут — бесплатно.</p>
        <a class="bj-btn" href="/operations-director.html#contact" data-goal="click_primary_cta">Обсудить задачу</a>
      </div>
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
          <li><a href="/case-euroopt.html">Кейс Евроопт</a></li>
          <li><a href="/case-fasol.html">Кейс «Фасоль»</a></li>
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
  gtag('js', new Date());

  gtag('config', 'G-14HYCZP7RD');
</script>
  <script src="/assets/js/main.js"></script>
  <script src="/assets/js/goals.js"></script>
  <script src="/assets/js/views.js" defer></script>
</body>
</html>
