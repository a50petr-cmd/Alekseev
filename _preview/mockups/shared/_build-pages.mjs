import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const themes = {
  v1: {
    label: "V1 · эволюция текущего",
    className: "theme-v1",
    css: `:root{
  --bg:#f3efe6; --surface:#fffdf8; --surface-strong:#fff; --band:#121612; --band-ink:#f6f3ec;
  --ink:#161814; --ink-soft:#3c423c; --muted:#5f675f; --line:#e4ddd0; --line-strong:#d2c9b8;
  --accent:#c2410c; --accent-deep:#9a3412; --header-bg:#f3efe6; --header-ink:#161814;
  --radius:18px; --radius-lg:24px;
}
body.theme-v1 .mock-hero{padding-top:48px}
body.theme-v1 .mock-hero-photo{box-shadow:0 18px 40px rgba(22,24,20,.08)}
body.theme-v1 .card:hover{border-color:#c2410c33}`,
  },
  v2: {
    label: "V2 · плотный деловой",
    className: "theme-v2",
    css: `:root{
  --bg:#eef1ef; --surface:#ffffff; --surface-strong:#f7f8f7; --band:#0f1411; --band-ink:#f4f7f4;
  --ink:#101410; --ink-soft:#334038; --muted:#5a665c; --line:#d5dcd7; --line-strong:#b8c2ba;
  --accent:#0f766e; --accent-deep:#115e59; --header-bg:#0f1411; --header-ink:#f4f7f4;
  --radius:12px; --radius-lg:16px;
}
body.theme-v2{background:linear-gradient(#0f1411 0 72px, #eef1ef 72px)}
body.theme-v2 .logo-mark{background:#14b8a6}
body.theme-v2 .btn-primary{background:#0f766e}
body.theme-v2 .btn-primary:hover{background:#115e59}
body.theme-v2 .mock-hero{padding-top:40px}
body.theme-v2 .outcomes strong{font-size:clamp(1.8rem,3.2vw,2.6rem)}
body.theme-v2 .case-panel{background:#101410;color:#f4f7f4;border-color:#243028}
body.theme-v2 .case-panel .lead,body.theme-v2 .case-panel .eyebrow,body.theme-v2 .case-panel .steps p{color:#c9d2cb}
body.theme-v2 .case-panel .outcomes div,body.theme-v2 .case-panel .steps article{background:#1a211c;border-color:#2c3630}
body.theme-v2 .case-panel .outcomes span{color:#9aaba0}
body.theme-v2 .quote{background:#1a211c;border-left-color:#14b8a6}
body.theme-v2 .nav a{color:#f4f7f4}
body.theme-v2 .site-header{border-bottom-color:#243028}`,
  },
  v3: {
    label: "V3 · портрет эксперта",
    className: "theme-v3",
    css: `:root{
  --bg:#f7f1ea; --surface:#fffaf4; --surface-strong:#fff7ef; --band:#2a211c; --band-ink:#faf4ee;
  --ink:#221c18; --ink-soft:#4a4038; --muted:#6d6157; --line:#e8ddd2; --line-strong:#d4c4b4;
  --accent:#9a3412; --accent-deep:#7c2d12; --header-bg:#f7f1ea; --header-ink:#221c18;
  --radius:22px; --radius-lg:28px;
}
body.theme-v3 .mock-hero-grid{grid-template-columns:.9fr 1.1fr;align-items:center}
body.theme-v3 .mock-hero-photo{border-radius:28px;border:0;box-shadow:0 24px 50px rgba(42,33,28,.16)}
body.theme-v3 h1,body.theme-v3 h2{font-family:"Source Serif 4",Georgia,serif;font-weight:600}
body.theme-v3 .card{background:#fffaf4}`,
  },
};

function formHtml() {
  return `<form class="lead-form" data-lead-form data-stub="1" novalidate>
  <label>Имя
    <input name="name" autocomplete="name" required maxlength="120" placeholder="Как к вам обращаться">
  </label>
  <label>Как связаться
    <input name="contact" autocomplete="tel" required maxlength="200" placeholder="Телефон или Telegram">
  </label>
  <label>Коротко о задаче
    <textarea name="task" required maxlength="4000" placeholder="Что происходит в бизнесе и какой результат нужен"></textarea>
  </label>
  <label class="check">
    <input type="checkbox" name="consent" value="1" required>
    <span>Согласен на обработку персональных данных по <a href="/_preview/mockups/privacy-draft.html">политике конфиденциальности</a></span>
  </label>
  <div class="hp" aria-hidden="true">
    <label>Сайт<input type="text" name="website" tabindex="-1" autocomplete="off"></label>
  </div>
  <button class="btn btn-primary" type="submit">Отправить заявку</button>
  <p class="lead-status" data-lead-status hidden></p>
</form>`;
}

function contactsHtml() {
  return `<div class="contact-strip">
  <a href="tel:+79269232929"><span>Телефон</span><strong>+7 (926) 923-29-29</strong></a>
  <a class="contact-strip--tg" href="https://t.me/PetroAlekseev"><span>Telegram</span><strong>@PetroAlekseev</strong></a>
  <a href="mailto:a50petr@yandex.ru"><span>Почта</span><strong>a50petr@yandex.ru</strong></a>
  <a class="contact-strip--li" href="https://www.linkedin.com/in/%D0%BF%D0%B5%D1%82%D1%80-%D0%B0%D0%BB%D0%B5%D0%BA%D1%81%D0%B5%D0%B5%D0%B2-265a56225/" rel="noopener noreferrer" target="_blank"><span>LinkedIn</span><strong>Пётр Алексеев</strong></a>
</div>
<p style="margin:14px 0 0"><a href="https://t.me/Alekseev_Petr_consult" target="_blank" rel="noopener" data-goal="click_telegram_channel">Канал: t.me/Alekseev_Petr_consult</a></p>`;
}

function home(variant) {
  const t = themes[variant];
  const caseLinks =
    variant === "v1"
      ? `<p class="mock-hero-actions" style="margin-top:16px"><a class="btn btn-ghost" href="case-fasol.html">Кейс «Фасоль»</a><a class="btn btn-ghost" href="case-euroopt.html">Кейс Евроопт / ЯМИГОМ</a></p>`
      : "";
  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Макет ${t.label} — Пётр Алексеев</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="stylesheet" href="/_preview/mockups/shared/mockup.css">
  <style>${t.css}</style>
</head>
<body class="mock ${t.className}" data-page="home">
  <div class="mock-banner">Макет ${t.label}. Не прод. <a href="/_preview/mockups/README.md">Как открыть</a></div>
  <header class="site-header">
    <div class="wrap site-header-inner">
      <a class="logo" href="/_preview/mockups/${variant}/index.html"><span class="logo-mark">ПА</span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Магазины · доставка · операции</small></span></a>
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="nav" aria-label="Открыть меню"><span></span></button>
      <nav id="nav" class="nav">
        <a href="#offers">Форматы</a>
        <a href="#fasol">Фасоль</a>
        <a href="#euroopt">Евроопт</a>
        <a href="#team">Команда</a>
        <a href="#contact">Связаться</a>
      </nav>
    </div>
  </header>
  <main>
    <section class="mock-hero">
      <div class="wrap mock-hero-grid">
        <div>
          <p class="eyebrow"><span>Макет ${variant.toUpperCase()}</span> Продуктовый ритейл</p>
          <h1>Проект магазина у дома под ключ: от планировки до открытия</h1>
          <p class="lead">Планировка, зонирование под категории, оборудование и food to go. Открыл около 25 магазинов «Фасоль», ни один не закрыт.</p>
          <div class="mock-hero-actions">
            <a class="btn btn-primary" href="#contact" data-goal="click_primary_cta">Обсудить проект, 30 минут</a>
          </div>
          ${caseLinks}
        </div>
        <figure class="mock-hero-photo">
          <img src="/assets/images/petr-alekseev.jpg" width="720" height="900" alt="Пётр Алексеев">
        </figure>
      </div>
    </section>

    <section class="section" id="offers">
      <div class="wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow"><span>Форматы</span></p>
            <h2>Три входа в работу</h2>
          </div>
          <p class="lead">Выберите формат под задачу. Срок ориентировочный — уточняем на первой встрече.</p>
        </div>
        <div class="card-grid">
          <article class="card">
            <p class="tag">Формат 1</p>
            <h3>Проект магазина у дома под ключ</h3>
            <p>Планировка, зонирование, оборудование и food to go — от концепции пространства до готовности открыть.</p>
            <p class="meta">2–4 недели</p>
          </article>
          <article class="card">
            <p class="tag">Формат 2</p>
            <h3>Аудит быстрой доставки или даркстора</h3>
            <p>Разбор экономики и операций: сборка, списания, ФОТ, логистика — что менять в первую очередь.</p>
            <p class="meta">2–3 недели</p>
          </article>
          <article class="card">
            <p class="tag">Формат 3</p>
            <h3>Операционный директор на аутсорсе</h3>
            <p>Внедрение изменений вместе с вашей командой, ритм управления и ответственность за результат.</p>
            <p class="meta">3–6 месяцев</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" id="fasol" style="padding-top:0">
      <div class="wrap">
        <div class="case-panel">
          <div>
            <p class="eyebrow"><span>Кейс</span> METRO · «Фасоль»</p>
            <h2>«Фасоль»: магазины у дома по франшизе METRO</h2>
            <p class="lead"><strong>Ситуация.</strong> Магазины у дома надо сделать конкурентными с большими сетями.</p>
            <div class="outcomes">
              <div><strong>~25</strong><span>открытых магазинов</span></div>
              <div><strong>0</strong><span>закрытых из открытых</span></div>
              <div><strong>под ключ</strong><span>планировка и оборудование</span></div>
            </div>
          </div>
          <div class="steps">
            <article>
              <h3>Что сделал</h3>
              <p>Спроектировал пространство магазина, планировку, зонирование под категорийный менеджмент (касса самообслуживания, бакалея, food to go), расстановку оборудования.</p>
            </article>
            <article>
              <h3>Внедрил в магазинах</h3>
              <p>Выпечка, кофе с собой, разливное пиво, тандыр.</p>
            </article>
            <article>
              <h3>Результат</h3>
              <p>Около 25 открытых магазинов, ни один не закрыт.</p>
            </article>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="euroopt" style="padding-top:0">
      <div class="wrap">
        <div class="case-panel">
          <div>
            <p class="eyebrow"><span>Кейс</span> Евроопт · ЯМИГОМ · Минск</p>
            <div class="case-brands" aria-label="Евроопт и ЯМИГОМ">
              <div class="brand"><img src="/assets/images/logos/euroopt.png" width="120" height="38" alt="Евроопт"></div>
              <div class="brand"><img src="/assets/images/logos/yamigom.jpg" width="36" height="36" alt=""><span>ЯМИГОМ</span></div>
            </div>
            <h2>Из убыточной быстрой доставки — в управляемую модель</h2>
            <p class="lead"><strong>Ситуация.</strong> После покупки сервиса быстрой доставки у компании было четыре даркстора и экономика, которая не сходилась. Было непонятно, какие процессы создают убытки и что менять в первую очередь.</p>
            <div class="outcomes">
              <div><strong>×2</strong><span>ниже операционные затраты</span></div>
              <div><strong>2:37</strong><span>сборка вместо 5 минут</span></div>
              <div><strong>1,4%</strong><span>списания вместо 7%</span></div>
            </div>
            <p class="lead" style="margin-top:16px">Период: сентябрь 2021 – февраль 2022, около 6 месяцев.</p>
          </div>
          <div class="steps">
            <article><h3>Погрузился во всю цепочку</h3><p>Разобрал работу направления от маркетинга и ассортимента до склада, сборки, логистики и передачи заказа клиенту.</p></article>
            <article><h3>Нашёл системные потери</h3><p>Связал экономику с реальными операциями: списаниями, производительностью сборки, ФОТ, маршрутизацией, поставками и мотивацией курьеров.</p></article>
            <article><h3>Спроектировал целевую модель</h3><p>Собрал план изменений по процессам, команде, показателям и стандартам работы. Для каждого мероприятия зафиксировал ожидаемый эффект.</p></article>
            <article><h3>Внедрил изменения вместе с командой</h3><p>Перестроил сборку и логистику, внедрил стандарты планировки и мотивацию курьеров, сократил списания и операционные расходы.</p></article>
            <article><h3>Вывел направление на операционный ноль</h3><p>За шесть месяцев проектной работы убыточная модель стала управляемой системой с прозрачными показателями и устойчивыми процессами.</p></article>
            <div class="quote">
              <p>«Результаты его деятельности до сих пор приносят неоспоримую пользу нашему бизнесу».</p>
              <p>«С поставленными руководством задачами справился на отлично…»</p>
              <p class="author">Первый заместитель генерального директора ООО «Евроторг». Пётр работал консультантом по развитию сервисов доставки «ЯМИГОМ» в Минске.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="experience">
      <div class="wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow"><span>Опыт</span></p>
            <h2>Кейсы — примеры задач, а не границы экспертизы</h2>
          </div>
          <p class="lead">Ритейл, доставка, импорт и франчайзинг — сквозные процессы и кросс-функциональные команды.</p>
        </div>
        <div class="scope-list">
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/x5.svg" width="142" height="43" alt="X5 Group"></div>
            <h3>X5 Group</h3>
            <p>Операционная модель импорта: закупки, порт, склад, логистика, качество и продажи.</p>
          </article>
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/komus.svg" width="142" height="56" alt="Комус"></div>
            <h3>Комус</h3>
            <p>Запуск нового e-commerce-направления с нуля: процессы, ассортимент, партнёры и MVP.</p>
          </article>
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/kuper.png" width="44" height="44" alt="Купер"></div>
            <h3>Купер</h3>
            <p>Рост B2B-направления через гипотезы, метрики и управление кросс-функциональной командой.</p>
          </article>
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/yandex-lavka.svg" width="142" height="35" alt="Яндекс Лавка"></div>
            <h3>Яндекс Лавка</h3>
            <p>Продал франшизу Яндекс Лавки: считал экономику и окупаемость для инвестора, сделка на запуск шести дарксторов.</p>
          </article>
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/metro.svg" width="142" height="22" alt="METRO"></div>
            <h3>METRO</h3>
            <p>Стандартизация открытия магазинов, тендеры и снижение капитальных затрат партнёров.</p>
          </article>
          <article>
            <div class="scope-logo"><img src="/assets/images/logos/euroopt.png" width="142" height="45" alt="Евроопт"></div>
            <h3>Евроопт</h3>
            <p>Комплексная перестройка убыточного направления — от диагностики до внедрения.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section" id="team" style="padding-top:0">
      <div class="wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow"><span>Команда и партнёры</span></p>
            <h2>Один ответственный — не один исполнитель</h2>
          </div>
          <p class="lead">Небольшая команда единомышленников. Экспертов подключаем под задачу. ИТ-разработку при необходимости отдаём в тендер. За результат отвечает Пётр лично. Проект не зависит от одного человека.</p>
        </div>
        <div class="team-grid">
          <article class="card"><p class="tag">Управление</p><h3>Единая точка ответственности</h3><p>Клиент работает со мной по целям и результату — без самостоятельной координации нескольких подрядчиков.</p></article>
          <article class="card"><p class="tag">Бизнес</p><h3>Профильные эксперты</h3><p>Подключаем специалистов по процессам, данным, финансам и изменениям в зависимости от задачи.</p></article>
          <article class="card"><p class="tag">Технологии</p><h3>Партнёры и тендер</h3><p>Партнёры помогают с ПО, интеграциями и автоматизацией. Крупную ИТ-разработку при необходимости выносим в тендер.</p></article>
          <article class="card"><p class="tag">Устойчивость</p><h3>Знания остаются у клиента</h3><p>Фиксируем решения, роли, регламенты и метрики в общей системе. Команда клиента сохраняет контекст после проекта.</p></article>
        </div>
      </div>
    </section>

    <section class="section" style="padding-top:0" id="when">
      <div class="wrap">
        <div class="section-head">
          <div>
            <p class="eyebrow"><span>Когда обращаться</span></p>
            <h2>Когда нужен не отчёт, а изменения</h2>
          </div>
        </div>
        <ul class="problems">
          <li><b>01</b><div><strong>Нужен проект магазина у дома</strong><span>Планировка, зоны, оборудование и food to go — открытие без хаоса на стройке и в ассортименте.</span></div></li>
          <li><b>02</b><div><strong>Доставка или даркстор не сходятся</strong><span>Списания, сборка и ФОТ съедают маржу; непонятно, что менять первым.</span></div></li>
          <li><b>03</b><div><strong>Нужен операционный контур на месяцы</strong><span>Изменения есть на бумаге, но некому довести внедрение и ритм управления.</span></div></li>
          <li><b>04</b><div><strong>Компания выросла из старых правил</strong><span>Роли и системы не соответствуют масштабу, скорость решений падает.</span></div></li>
          <li><b>05</b><div><strong>Нужна автоматизация без «внедрения ради внедрения»</strong><span>Есть желание внедрить технологию, но нет ясности, какой процесс менять и как посчитать отдачу.</span></div></li>
        </ul>
      </div>
    </section>

    <section class="section" id="contact">
      <div class="wrap">
        <div class="lead-band">
          <p class="eyebrow">Заявка</p>
          <h2>Обсудить проект, 30 минут</h2>
          <p class="lead">Напишите коротко о задаче. На первой встрече разберём ситуацию и поймём, какой из трёх форматов подходит. Если задача вне компетенции — скажу прямо.</p>
          ${formHtml()}
          ${contactsHtml()}
        </div>
      </div>
    </section>
  </main>
  <footer class="site-footer">
    <div class="wrap footer-grid">
      <div>
        <a class="logo" href="/_preview/mockups/${variant}/index.html"><span class="logo-mark">ПА</span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Бизнес-процессы · ритейл</small></span></a>
        <p class="lead" style="margin-top:12px">Помогаю увидеть операции как систему и довести изменения до измеримого результата.</p>
      </div>
      <div>
        <h2>На сайте</h2>
        <ul>
          <li><a href="/services.html">Услуги</a></li>
          <li><a href="/cases.html">Кейсы</a></li>
          <li><a href="/about.html">Обо мне</a></li>
          <li><a href="/blog/index.html">Статьи</a></li>
        </ul>
      </div>
      <div>
        <h2>Связь</h2>
        <ul>
          <li><a href="tel:+79269232929">+7 (926) 923-29-29</a></li>
          <li><a href="https://t.me/PetroAlekseev">@PetroAlekseev</a></li>
          <li><a href="mailto:a50petr@yandex.ru">a50petr@yandex.ru</a></li>
          <li><a href="https://t.me/Alekseev_Petr_consult">Канал</a></li>
        </ul>
      </div>
    </div>
    <div class="wrap legal">
      <p><a href="/_preview/mockups/privacy-draft.html">Черновик политики</a> · Макет, не прод · © <span data-year>2026</span> Пётр Алексеев</p>
    </div>
  </footer>
  <script src="/assets/js/main.js"></script>
  <script src="/_preview/mockups/shared/lead-form.js"></script>
  <script>
    (function(){
      var toggle=document.querySelector(".nav-toggle");
      var nav=document.querySelector(".nav");
      if(!toggle||!nav) return;
      toggle.addEventListener("click",function(){
        var open=nav.classList.toggle("is-open");
        toggle.setAttribute("aria-expanded", open?"true":"false");
      });
    })();
  </script>
</body>
</html>`;
}

function casePage(variant, kind) {
  const t = themes[variant];
  const fasol = kind === "fasol";
  const title = fasol
    ? "Кейс «Фасоль» — проект магазина у дома"
    : "Кейс Евроопт / ЯМИГОМ — быстрая доставка";
  const body = fasol
    ? `<section>
        <p class="eyebrow"><span>Ситуация</span></p>
        <h2>Магазины у дома против больших сетей</h2>
        <p>Магазины у дома надо сделать конкурентными с большими сетями.</p>
      </section>
      <section>
        <p class="eyebrow"><span>Что сделал</span></p>
        <h2>Проект пространства и категорий</h2>
        <p>Спроектировал пространство магазина, планировку, зонирование под категорийный менеджмент (касса самообслуживания, бакалея, food to go), расстановку оборудования.</p>
        <ul>
          <li>В магазинах внедрены выпечка, кофе с собой, разливное пиво, тандыр</li>
        </ul>
      </section>
      <section>
        <p class="eyebrow"><span>Результат</span></p>
        <h2>Около 25 открытий без закрытий</h2>
        <div class="outcomes">
          <div><strong>~25</strong><span>открытых магазинов «Фасоль»</span></div>
          <div><strong>0</strong><span>закрытых из открытых</span></div>
          <div><strong>METRO</strong><span>франшиза магазинов у дома</span></div>
        </div>
      </section>`
    : `<section>
        <p class="eyebrow"><span>Ситуация</span> Минск · сентябрь 2021 – февраль 2022</p>
        <h2>Убыточная быстрая доставка</h2>
        <p>После покупки сервиса быстрой доставки у компании было четыре даркстора и экономика, которая не сходилась. Было непонятно, какие процессы создают убытки и что менять в первую очередь.</p>
      </section>
      <section>
        <p class="eyebrow"><span>Что сделал</span></p>
        <h2>От диагностики до внедрения</h2>
        <ul>
          <li>Погрузился во всю цепочку: маркетинг, ассортимент, склад, сборка, логистика, передача заказа</li>
          <li>Связал экономику с операциями: списания, сборка, ФОТ, маршрутизация, поставки, мотивация курьеров</li>
          <li>Спроектировал целевую модель с ожидаемым эффектом по мероприятиям</li>
          <li>Внедрил изменения вместе с командой: сборка, логистика, стандарты планировки, мотивация курьеров</li>
        </ul>
      </section>
      <section>
        <p class="eyebrow"><span>Результат</span> около 6 месяцев</p>
        <h2>Операционный ноль и управляемая модель</h2>
        <div class="outcomes">
          <div><strong>×2</strong><span>ниже операционные затраты</span></div>
          <div><strong>2:37</strong><span>сборка вместо 5 минут</span></div>
          <div><strong>1,4%</strong><span>списания вместо 7%</span></div>
        </div>
        <div class="quote" style="margin-top:18px">
          <p>«Результаты его деятельности до сих пор приносят неоспоримую пользу нашему бизнесу».</p>
          <p class="author">Первый заместитель генерального директора ООО «Евроторг»</p>
        </div>
      </section>`;

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title} — макет</title>
  <link rel="stylesheet" href="/assets/css/style.css">
  <link rel="stylesheet" href="/_preview/mockups/shared/mockup.css">
  <style>${t.css}</style>
</head>
<body class="mock case-page ${t.className}">
  <div class="mock-banner">Макет кейса · ${t.label}. <a href="index.html">К главной макета</a></div>
  <header class="site-header">
    <div class="wrap site-header-inner">
      <a class="logo" href="index.html"><span class="logo-mark">ПА</span><span class="logo-text"><strong>Пётр Алексеев</strong><small>Кейс</small></span></a>
      <a class="btn btn-primary" href="index.html#contact" data-goal="click_primary_cta">Обсудить проект, 30 минут</a>
    </div>
  </header>
  <main>
    <div class="page-hero">
      <div class="wrap-s">
        <p class="eyebrow"><span>Кейс</span></p>
        <h1>${title}</h1>
      </div>
    </div>
    <div class="wrap-s prose">${body}</div>
  </main>
  <footer class="site-footer">
    <div class="wrap legal"><p><a href="index.html">Назад к макету</a> · <a href="/_preview/mockups/privacy-draft.html">Черновик политики</a></p></div>
  </footer>
  <script src="/assets/js/main.js"></script>
</body>
</html>`;
}

for (const variant of Object.keys(themes)) {
  mkdirSync(join(root, variant), { recursive: true });
  writeFileSync(join(root, variant, "index.html"), home(variant), "utf8");
}
writeFileSync(join(root, "v1", "case-fasol.html"), casePage("v1", "fasol"), "utf8");
writeFileSync(join(root, "v1", "case-euroopt.html"), casePage("v1", "euroopt"), "utf8");
console.log("built");
