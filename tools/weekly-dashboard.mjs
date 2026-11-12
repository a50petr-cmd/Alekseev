// Дашборд недели из weekly/ГГГГ-ММ-ДД.json: один самодостаточный .html в «Аналитические отчеты».
// Запуск: node tools/weekly-dashboard.mjs [--json путь] [--out путь]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = path.resolve(ROOT, "..", "Аналитические отчеты");
const WEEKLY = path.join(OUT_DIR, "weekly");
const CSS = `:root{--bg:#faf9f6;--fg:#1f1e1b;--mu:#6b6a64;--pn:#fff;--bd:#e4e2da;--ac:#c4623a;--ac2:#e9b9a3}
@media (prefers-color-scheme:dark){:root{--bg:#1b1a18;--fg:#ece9e1;--mu:#a09e95;--pn:#262522;--bd:#3a3834;--ac:#e08a63;--ac2:#6a3e2b}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif}
.wk{max-width:960px;margin:0 auto;padding:24px 16px 48px;display:flex;flex-direction:column;gap:24px}
h1{font:400 28px Georgia,serif;margin:0}h2{font-size:17px;margin:0 0 8px}p{margin:0}.lead{color:var(--mu)}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.card{overflow-x:auto}.tile,.card{background:var(--pn);border:1px solid var(--bd);border-radius:12px;padding:14px}
.tile{display:flex;flex-direction:column;gap:4px}.tile b{font:400 32px Georgia,serif;line-height:1.1}.lab{font-size:13px;color:var(--mu)}.sub{font-size:12px;color:var(--mu)}
.grid2{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}
.bar{display:grid;grid-template-columns:130px 1fr 28px;gap:8px;align-items:center;margin:6px 0;font-size:13px}
.bt{position:relative;height:14px;background:var(--bd);border-radius:7px;overflow:hidden}.bt i{position:absolute;left:0;top:0;bottom:0;background:var(--ac2)}.bt i.dk{background:var(--ac)}.bn{text-align:right}
.days{display:flex;gap:8px;align-items:flex-end;height:150px}.col{flex:1;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;height:100%;font-size:11px;color:var(--mu)}
.cb{width:100%;background:var(--ac2);border-radius:4px 4px 0 0;position:relative;min-height:2px}.cb s{position:absolute;bottom:3px;left:50%;margin-left:-4px;width:8px;height:8px;border-radius:50%;background:var(--ac)}.col em{font-style:normal;color:var(--fg)}
table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid var(--bd)}.n{text-align:right}th{color:var(--mu);font-weight:500}
ul{margin:10px 0 0;padding-left:18px;color:var(--mu);font-size:14px}li{margin:4px 0}.card{overflow-x:auto}`;

function arg(name) {
  const i = process.argv.indexOf(name);
  return i === -1 ? null : process.argv[i + 1] || null;
}
const esc = (v) => String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const num = (v) => (v == null ? "—" : Number(v).toLocaleString("ru-RU").replace(/ /g, " "));
const dec = (v, d = 1) => (v == null ? "—" : String(Math.round(v * 10 ** d) / 10 ** d).replace(".", ","));
const MONTHS = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
const dm = (iso) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
function periodLabel(from, to) {
  const a = new Date(from + "T00:00:00Z");
  const b = new Date(to + "T00:00:00Z");
  return a.getUTCMonth() === b.getUTCMonth()
    ? `${a.getUTCDate()}–${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`
    : `${a.getUTCDate()} ${MONTHS[a.getUTCMonth()]} – ${b.getUTCDate()} ${MONTHS[b.getUTCMonth()]}`;
}
const inRange = (d, from, to) => d && d >= from && d <= to;
const sum = (a) => a.reduce((s, v) => s + (v || 0), 0);

const jsonPath =
  arg("--json") ||
  path.join(WEEKLY, fs.readdirSync(WEEKLY).filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().pop());
const r = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
const P = r.period;
const manual = r.manual || {};
const articles = r.article_views?.articles || [];
const titleBySlug = new Map(articles.map((a) => [a.slug, String(a.title || "").replace(/\s+—\s+Пётр Алексеев$/, "")]));
const STATIC = {
  "/": "Главная", "/blog/": "Список статей", "/case-x5.html": "Кейс X5", "/case-modi.html": "Кейс МОДИ",
  "/case-komus.html": "Кейс Комус", "/case-euroopt.html": "Кейс Евроопт", "/case-fasol.html": "Кейс «Фасоль»",
  "/operations-director.html": "Страница «Операционный директор»", "/audit-biznes-processov.html": "Страница «Аудит бизнес-процессов»",
  "/privacy.html": "Политика конфиденциальности", "/blog/biznes-processy-v-malom-biznese-s-chego-nachat-esli-vse-derzhitsya-na-vas.html": "Старый адрес статьи про бизнес-процессы (редирект)", "/about.html": "/about.html (редирект на главную)", "/services.html": "/services.html (редирект на главную)",
};
function pageLabel(url) {
  let p = String(url || "");
  p = p.replace(/^https?:\/\/[^/]+/, "");
  if (STATIC[p]) return STATIC[p];
  const slug = p.match(/^\/blog\/([a-z0-9-]+)\.html$/)?.[1];
  if (slug && titleBySlug.get(slug)) return `Статья «${titleBySlug.get(slug).replace(/:.*$/, "")}»`;
  return p;
}
const CHANNELS = { Direct: "Прямые заходы", "Organic Search": "Поиск", "AI Assistant": "ИИ-ассистенты", "Organic Social": "Соцсети", Referral: "Переходы с сайтов", Unassigned: "Не определён", Email: "Почта", "Paid Search": "Платный поиск", Display: "Баннеры" };

const tile = (lab, val, sub) => `<div class="tile"><span class="lab">${esc(lab)}</span><b>${val}</b><span class="sub">${esc(sub)}</span></div>`;
const table = (heads, rows) =>
  `<table><thead><tr>${heads.map((h, i) => `<th class="${i ? "n" : ""}">${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows
    .map((row) => `<tr>${row.map((c, i) => `<td class="${i ? "n" : ""}">${i ? c : esc(c)}</td>`).join("")}</tr>`)
    .join("")}</tbody></table>`;
const card = (title, body) => `<div class="card"><h2>${esc(title)}</h2>${body}</div>`;
const note = (t) => `<p class="lead" style="font-size:13px">${t}</p>`;
const bullets = (items) => (items.length ? `<ul>${items.map((t) => `<li>${t}</li>`).join("")}</ul>` : "");
const bar = (label, pct, value, dark) => `<div class="bar"><span class="bl">${esc(label)}</span><span class="bt">${dark == null ? "" : `<i style="width:${pct}%"></i><i class="dk" style="width:${dark}%"></i>`}${dark == null ? `<i class="dk" style="width:${pct}%"></i>` : ""}</span><span class="bn">${esc(value)}</span></div>`;

const g = r.google?.week;
const ga = r.ga4?.total;
const tg = r.social?.telegram;
const tc = r.social?.tenchat;
const dz = r.social?.dzen;
const prevGa = ga?.previous && (ga.previous.active_users || ga.previous.views);

// посты за прошлый период из списка постов
const prevPosts = (list) => (list || []).filter((p) => inRange(p.date, P.previous_from, P.previous_to));
const curPosts = (list) => (list || []).filter((p) => inRange(p.date, P.from, P.to));
const tgPrev = prevPosts(tg?.posts);
const tcPrev = prevPosts(tc?.posts);
const tgPrevViews = sum(tgPrev.map((p) => p.views));
const tgPrevReactions = sum(tgPrev.map((p) => p.reactions));

const parts = [];
parts.push(`<div><h1>Сайт и соцсети за неделю ${periodLabel(P.from, P.to)}</h1><p class="lead">petr-alekseev.ru, Яндекс Бизнес, Telegram, TenChat, Дзен. Сравнение с ${dm(P.previous_from)}–${dm(P.previous_to)}. Собрано ${esc(P.generated_at.slice(0, 10).split("-").reverse().join("."))} (Search Console, GA4, Метрика, счётчик статей, публичные страницы). Исходные цифры: weekly\\${esc(P.to)}.json.</p></div>`);

parts.push(
  `<div class="tiles">${[
    g ? tile("Клики из Google", num(g.current.clicks), `${num(g.previous.clicks)} неделей раньше`) : "",
    g ? tile("Показы в Google", num(g.current.impressions), `${num(g.previous.impressions)} неделей раньше`) : "",
    g ? tile("Позиция в Google", dec(g.current.position), `${dec(g.previous.position)} неделей раньше${g.current.impressions < 30 ? "; по такому числу показов тренд не читается" : ""}`) : "",
    ga ? tile("Пользователи сайта", num(ga.current.active_users), prevGa ? `${num(ga.previous.active_users)} неделей раньше` : "GA4, прошлой недели нет") : "",
    ga ? tile("Просмотры страниц", num(ga.current.views), prevGa ? `${num(ga.previous.views)} неделей раньше` : "GA4, прошлой недели нет") : "",
    tg?.period ? tile("Просмотры в Telegram", num(tg.period.views), `${num(tgPrevViews)} неделей раньше, свежие посты ещё набирают`) : "",
  ].join("")}</div>`,
);

// каналы и Google по дням
const channels = r.ga4?.channels?.current || [];
const maxCh = Math.max(1, ...channels.map((c) => c.sessions));
const totalSessions = sum(channels.map((c) => c.sessions));
const directShare = channels.find((c) => c.channel === "Direct");
const chCard = channels.length
  ? card("Откуда пришли на сайт", channels.map((c) => bar(CHANNELS[c.channel] || c.channel, Math.round((c.sessions / maxCh) * 100), c.sessions, Math.round((c.engaged_sessions / maxCh) * 100))).join("") +
      note(`Сеансы за неделю, GA4. Тёмная часть — сеансы с взаимодействием.${directShare ? ` Прямые заходы (${directShare.sessions} из ${totalSessions}) включают ссылки из постов без меток и, возможно, ваши собственные визиты: ссылки в постах стоит помечать UTM.` : ""}`))
  : "";
const days = r.google?.days?.current || [];
const maxImp = Math.max(1, ...days.map((d) => d.impressions));
const dayCard = days.length
  ? card("Google по дням", `<div class="days">${days.map((d) => `<div class="col"><div class="cb" style="height:${Math.round((d.impressions / maxImp) * 100)}%">${d.clicks ? "<s></s>" : ""}</div><span>${dm(d.date)}</span><em>${d.impressions}</em></div>`).join("")}</div>${note("Показы по дням, Search Console. Точка — день с кликом.")}`)
  : "";
parts.push(`<div class="grid2">${chCard}${dayCard}</div>`);

// страницы
const gaPages = (r.ga4?.pages?.current || []).slice(0, 8);
const gscPages = (r.google?.pages?.current || []).slice(0, 8);
parts.push(
  `<div class="grid2">${gaPages.length ? card("Что смотрели на сайте", table(["Страница", "Просмотры", "Люди"], gaPages.map((p) => [pageLabel(p.page), num(p.views), num(p.active_users)]))) : ""}${
    gscPages.length ? card("Что показывал Google", table(["Страница", "Клики", "Показы"], gscPages.map((p) => [pageLabel(p.page), num(p.clicks), num(p.impressions)]))) : ""
  }</div>`,
);

// соцсети
const socRows = [];
if (tg?.period) {
  socRows.push(["Telegram", `${dm(P.previous_from)}–${dm(P.previous_to)}`, num(tgPrev.length), num(tgPrevViews), num(tgPrevReactions)]);
  socRows.push(["Telegram", `${dm(P.from)}–${dm(P.to)}`, num(tg.period.posts), num(tg.period.views), num(tg.period.reactions)]);
}
if (tc?.period) {
  socRows.push(["TenChat", `${dm(P.previous_from)}–${dm(P.previous_to)}`, num(tcPrev.length), num(sum(tcPrev.map((p) => p.views))), num(sum(tcPrev.map((p) => p.reactions)))]);
  socRows.push(["TenChat", `${dm(P.from)}–${dm(P.to)}`, num(tc.period.posts), num(tc.period.views), num(tc.period.reactions)]);
}
if (dz?.period) socRows.push(["Дзен", `${dm(P.from)}–${dm(P.to)}`, num(dz.period.posts), "—", "—"]);
const socBul = [];
if (tg?.subscribers != null) socBul.push(`Telegram: ${num(tg.subscribers)} подписчиков; в среднем ${dec(tg.period?.avg_views_per_post)} просмотра на пост за неделю.`);
if (tc?.subscribers != null) socBul.push(`TenChat: ${num(tc.subscribers)} подписчиков.`);
if (dz?.error) socBul.push("Дзен: скрипт страницу не собрал (адрес sso.passport.yandex.ru не открыт); просмотры Дзена публично не видны, они только в кабинете автора.");
else if (dz) socBul.push("Дзен: просмотры и реакции публично не видны, они только в кабинете автора.");
parts.push(card("Telegram, TenChat, Дзен", (socRows.length ? table(["Площадка", "Неделя", "Постов", "Просмотры", "Реакции"], socRows) : "") + bullets(socBul)));

// Яндекс Бизнес
const yb = r.yandex_business;
const cab = manual.yandex_business_cabinet;
if (yb && !yb.error) {
  const act = (yb.actions || []);
  const actCur = sum(act.map((a) => a.current));
  const actPrev = sum(act.map((a) => a.previous));
  const rows = [];
  if (cab) {
    rows.push(["Просмотры профиля (кабинет)", num(cab.profile_views), num(cab.previous_week ?? 0)]);
    for (const [svc, v] of Object.entries(cab.by_service || {})) rows.push([`из сервиса: ${svc.replace(/: веб версия/, "")}`, num(v), "—"]);
  }
  rows.push(["Визиты по счётчику карточки (Метрика)", num(yb.current.visits), num(yb.previous.visits)]);
  rows.push(["Действия: звонок, сайт, маршрут и др. (Метрика)", num(actCur), num(actPrev)]);
  for (const a of act.filter((x) => x.current || x.previous)) rows.push([`  ${a.action}`, num(a.current), num(a.previous)]);
  parts.push(card("Яндекс Бизнес: карточка на Картах", table(["Показатель", `${dm(P.from)}–${dm(P.to)}`, "Неделей раньше"], rows) +
    bullets([cab ? `Просмотры профиля из кабинета внесены вручную (${esc(cab.source || "кабинет yandex.ru/sprav")}); в API их нет.` : "Просмотры профиля берутся из кабинета yandex.ru/sprav вручную; в API их нет.", "Визиты и действия идут из Метрики автоматически (счётчик " + esc(yb.counter_id) + "). Часть заходов может быть вашей."])));
} else if (yb?.error) {
  parts.push(card("Яндекс Бизнес: карточка на Картах", note(`Не удалось собрать из Метрики: ${esc(yb.error)}`)));
}

// воронка
const goals = manual.goals_november;
const fun = manual.funnel;
if (goals && fun) {
  const fact = (v) => (v == null ? "—" : num(v));
  const rows = [
    ["Первая оплата, этап 1", `${num(goals.payment_stage1_rub)} ₽`, `${num(fun.payments_rub ?? 0)} ₽`],
    ["Новые заявки", `${goals.new_inquiries}+`, fact(fun.new_inquiries)],
    ["Новые знакомства", num(goals.new_acquaintances), fact(fun.new_acquaintances ?? fun.intro_calls)],
    ["Ключевые события GA4 (форма, клики в Telegram и по телефону)", "настроить", num(ga?.current?.key_events ?? 0)],
  ];
  const bl = [];
  if (fun.bonzo) bl.push(`Бонзо: ${esc(fun.bonzo)}.`);
  if (fun.how_found) bl.push(`Как нашли (по ответам): ${esc(fun.how_found)}.`);
  bl.push("«—» значит, что данных нет: заявки, знакомства и ответ на вопрос «как вы меня нашли?» вносит Пётр вручную в файл weekly\\manual\\" + esc(P.to) + ".json (блок funnel).");
  parts.push(card("Цели ноября", table(["Цель", "План", "Факт"], rows) + bullets(bl)));
}

// охват Telegram по неделям
const wk = (tg?.weekly_avg_views || []).filter((w) => w.posts && w.avg_views_per_post != null).reverse();
if (wk.length > 1) {
  const mx = Math.max(...wk.map((w) => w.avg_views_per_post));
  parts.push(card("Охват поста в Telegram по неделям", wk.map((w) => bar(`${dm(w.from)}–${dm(w.to)}`, Math.round((w.avg_views_per_post / mx) * 100), dec(w.avg_views_per_post), null)).join("") +
    note(`Среднее число просмотров на пост по неделям выхода${tg.subscribers != null ? `, подписчиков ${num(tg.subscribers)}` : ""}. Посты последней недели ещё набирают просмотры.`)));
}

// статьи
if (articles.length) {
  const sorted = [...articles].filter((a) => a.views != null).sort((a, b) => b.views - a.views);
  parts.push(card("Счётчик просмотров статей", note(`Счётчик на сайте показывает число под статьёй только от 30 просмотров, поэтому у большинства статей его не видно. Всего по ${sorted.length} статьям: ${num(r.article_views.total)} просмотров за всё время.`) +
    table(["Статья", "Просмотры"], sorted.map((a) => [String(a.title || a.slug).replace(/\s+—\s+Пётр Алексеев$/, ""), num(a.views)]))));
}

// Метрика и сбор
const mt = r.metrika;
const mtBody = [];
if (mt?.error) mtBody.push(`Метрика сайта: ошибка сбора (${esc(mt.error)}).`);
else {
  mtBody.push(`Метрика сайта: ${num(mt?.visits)} визитов, ${num(mt?.users)} посетителей за неделю.`);
  if ((mt?.visits || 0) === 0 && totalSessions > 0) mtBody.push(`В GA4 за ту же неделю ${num(totalSessions)} сеансов, а Метрика по API вернула 0 без ошибок: счётчик или сбор данных у Яндекса не работает. Проверить живым просмотром с телефона из мобильной сети.`);
}
mtBody.push("Яндекс Вебмастер и индексация: данные зависят от сбоя на стороне Яндекса; основной поисковый канал сейчас Google.");
parts.push(card("Яндекс и Метрика", bullets(mtBody)));

const comm = manual.commentary || [];
if (comm.length) parts.push(card("Выводы недели", bullets(comm.map(esc))));
if ((r.errors || []).length) parts.push(card("Предупреждения сбора", bullets(r.errors.map(esc))));

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Сайт и соцсети: неделя ${periodLabel(P.from, P.to)} ${P.to.slice(0, 4)}</title><style>${CSS}</style></head><body><div class="wk">
${parts.join("\n")}
</div></body></html>
`;
const out = arg("--out") || path.join(OUT_DIR, `${P.to} Дашборд — сайт и соцсети.html`);
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html, "utf8");
console.log(out);
