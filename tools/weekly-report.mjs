import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GA4_PROPERTY = "562175495";
const GSC_SITES = ["https://petr-alekseev.ru/", "sc-domain:petr-alekseev.ru"];
const GSC_HOSTS = [
  "https://www.googleapis.com/webmasters/v3/sites",
  "https://searchconsole.googleapis.com/webmasters/v3/sites",
];
const COPY_DIR = path.resolve(ROOT, "..", "Аналитические отчеты", "weekly");
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const report = {
  period: null,
  google: null,
  ga4: null,
  metrika: null,
  yandex_business: null,
  article_views: null,
  social: { telegram: null, tenchat: null, dzen: null },
  errors: [],
};

function arg(name) {
  const i = process.argv.indexOf(name);
  if (i === -1) return null;
  const value = process.argv[i + 1];
  if (!value || value.startsWith("--")) return null;
  return value;
}

function parseDate(iso) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  if (!match) throw new Error(`Дата должна быть YYYY-MM-DD, получено: ${iso || "(пусто)"}`);
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (formatDate(date) !== iso) throw new Error(`Несуществующая дата: ${iso}`);
  return date;
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function inclusiveDays(from, to) {
  return Math.round((parseDate(to) - parseDate(from)) / 86400000) + 1;
}

function daysBetween(fromIso, toIso) {
  return Math.round((parseDate(toIso) - parseDate(fromIso)) / 86400000);
}

function localToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function round(value, digits) {
  if (value == null || Number.isNaN(value)) return null;
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

function safeError(error) {
  let message = error && error.message ? error.message : String(error);
  message = message.replace(/-----BEGIN[\s\S]*?-----END[^-]*-----/g, "[redacted]");
  message = message.replace(/ya29\.[A-Za-z0-9_\-]+/g, "[token]");
  message = message.replace(/y0__[A-Za-z0-9_\-]+/g, "[token]");
  message = message.replace(/Bearer\s+\S+/gi, "Bearer [token]");
  message = message.replace(/private_key\\?":\s*\\?"[^"]+/gi, "private_key:[redacted]");
  if (message.length > 400) message = message.slice(0, 400);
  return message;
}

function note(section, error) {
  const message = `${section}: ${safeError(error)}`;
  report.errors.push(message);
  return message;
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const name = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[name]) process.env[name] = value;
  }
}

function b64url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeHtml(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeHtml(html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
}

function parseCompactNumber(raw) {
  if (raw == null) return null;
  const cleaned = String(raw).trim().replace(/\s/g, "").replace(",", ".");
  if (!cleaned) return null;
  const match = /^(\d+(?:\.\d+)?)([kкmм])?$/i.exec(cleaned);
  if (!match) return null;
  let value = Number(match[1]);
  const suffix = (match[2] || "").toLowerCase();
  if (suffix === "k" || suffix === "к") value *= 1000;
  if (suffix === "m" || suffix === "м") value *= 1000000;
  return Math.round(value);
}

function sumKnown(values) {
  const known = values.filter((value) => typeof value === "number");
  if (!known.length) return null;
  return known.reduce((sum, value) => sum + value, 0);
}

function moscowDate(iso) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Moscow",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(iso));
  const pick = (type) => parts.find((part) => part.type === type).value;
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function inPeriod(date, from, to) {
  return Boolean(date) && date >= from && date <= to;
}

async function fetchText(url, extraHeaders = {}) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/json;q=0.9,*/*;q=0.8",
      "Accept-Language": "ru,en;q=0.8",
      ...extraHeaders,
    },
    redirect: "follow",
    signal: AbortSignal.timeout(30000),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} для ${new URL(url).hostname}`);
    error.status = response.status;
    error.body = text.slice(0, 240);
    throw error;
  }
  return text;
}

function loadServiceAccount() {
  const keyPath = process.env.GOOGLE_SA_KEY_PATH;
  if (!keyPath) throw new Error("В .env нет GOOGLE_SA_KEY_PATH");
  const resolved = path.resolve(keyPath);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(resolved, "utf8"));
  } catch {
    throw new Error("JSON-ключ сервисного аккаунта не читается");
  }
  if (!json.client_email || !json.private_key) {
    throw new Error("В ключе нет client_email или private_key");
  }
  return json;
}

function signJwt(account, scope) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({
      iss: account.client_email,
      scope,
      aud: account.token_uri || "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = `${header}.${payload}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  return `${unsigned}.${b64url(signer.sign(account.private_key))}`;
}

let googleTokenPromise = null;

function googleToken() {
  if (!googleTokenPromise) {
    googleTokenPromise = (async () => {
      const account = loadServiceAccount();
      const assertion = signJwt(
        account,
        [
          "https://www.googleapis.com/auth/webmasters.readonly",
          "https://www.googleapis.com/auth/analytics.readonly",
        ].join(" "),
      );
      const response = await fetch(account.token_uri || "https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion,
        }),
        signal: AbortSignal.timeout(30000),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.access_token) {
        throw new Error(`Google OAuth ${response.status}: ${body.error || "нет access_token"}`);
      }
      return body.access_token;
    })();
  }
  return googleTokenPromise;
}

function gscMetrics(row) {
  if (!row) {
    return { clicks: 0, impressions: 0, ctr_percent: null, position: null };
  }
  return {
    clicks: Math.round(row.clicks || 0),
    impressions: Math.round(row.impressions || 0),
    ctr_percent: round((row.ctr || 0) * 100, 2),
    position: row.impressions ? round(row.position || 0, 2) : null,
  };
}

async function gscQuery(token, host, site, body) {
  const url = `${host}/${encodeURIComponent(site)}/searchAnalytics/query`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ type: "web", rowLimit: 250, ...body }),
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  if (!response.ok) {
    const error = new Error(`Search Console ${response.status}`);
    error.status = response.status;
    error.body = text.slice(0, 240);
    throw error;
  }
  return JSON.parse(text);
}

async function gscBundle(token, host, site, from, to) {
  const [totals, days, pages, queries] = await Promise.all([
    gscQuery(token, host, site, { startDate: from, endDate: to }),
    gscQuery(token, host, site, { startDate: from, endDate: to, dimensions: ["date"] }),
    gscQuery(token, host, site, { startDate: from, endDate: to, dimensions: ["page"] }),
    gscQuery(token, host, site, { startDate: from, endDate: to, dimensions: ["query"] }),
  ]);
  const withKey = (rows, key) =>
    (rows || [])
      .map((row) => ({ [key]: row.keys?.[0] ?? null, ...gscMetrics(row) }))
      .sort((a, b) => (key === "date" ? String(a.date).localeCompare(String(b.date)) : b.clicks - a.clicks));
  return {
    week: gscMetrics(totals.rows?.[0]),
    days: withKey(days.rows, "date"),
    pages: withKey(pages.rows, "page"),
    queries: withKey(queries.rows, "query"),
  };
}

async function runGoogle(period) {
  try {
    const token = await googleToken();
    let lastError = null;
    for (const site of GSC_SITES) {
      for (const host of GSC_HOSTS) {
        try {
          const current = await gscBundle(token, host, site, period.from, period.to);
          const previous = await gscBundle(token, host, site, period.previous_from, period.previous_to);
          report.google = {
            site,
            week: { current: current.week, previous: previous.week },
            days: { current: current.days, previous: previous.days },
            pages: { current: current.pages, previous: previous.pages },
            queries: { current: current.queries, previous: previous.queries },
          };
          return;
        } catch (error) {
          lastError = error;
          if (error.status !== 403 && error.status !== 404) throw error;
        }
      }
    }
    throw lastError || new Error("Search Console не ответил");
  } catch (error) {
    report.google = { error: note("Search Console", error) };
  }
}

function metricMap(row, headers) {
  const values = {};
  headers.forEach((header, index) => {
    values[header] = Number(row?.metricValues?.[index]?.value ?? 0);
  });
  return values;
}

async function ga4Report(token, body) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runReport`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  if (!response.ok) {
    let detail = text.slice(0, 240);
    if (response.status === 403 || /permission|forbidden/i.test(text)) {
      detail = "нет роли «Читатель» у сервисного аккаунта";
    }
    const error = new Error(`GA4 property ${GA4_PROPERTY}: ${detail}`);
    error.status = response.status;
    throw error;
  }
  return JSON.parse(text);
}

function ga4Total(response) {
  const headers = (response.metricHeaders || []).map((header) => header.name);
  const values = metricMap(response.rows?.[0], headers);
  const users = values.activeUsers || 0;
  const duration = values.userEngagementDuration;
  return {
    active_users: users,
    views: values.screenPageViews || 0,
    average_engagement_time_seconds:
      users > 0 && duration != null ? round(duration / users, 1) : null,
    key_events: values.keyEvents ?? values.conversions ?? null,
  };
}

async function ga4Slice(token, from, to) {
  const range = { startDate: from, endDate: to };
  const metrics = [
    { name: "activeUsers" },
    { name: "screenPageViews" },
    { name: "userEngagementDuration" },
    { name: "keyEvents" },
  ];
  let totalResponse;
  try {
    totalResponse = await ga4Report(token, { dateRanges: [range], metrics });
  } catch (error) {
    if (!/keyEvents|not a valid metric/i.test(error.message)) throw error;
    totalResponse = await ga4Report(token, {
      dateRanges: [range],
      metrics: metrics.filter((metric) => metric.name !== "keyEvents").concat([{ name: "conversions" }]),
    });
  }
  const pagesResponse = await ga4Report(token, {
    dateRanges: [range],
    dimensions: [{ name: "pagePath" }],
    metrics: [{ name: "screenPageViews" }, { name: "activeUsers" }],
    orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
    limit: 15,
  });
  const channelsResponse = await ga4Report(token, {
    dateRanges: [range],
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }, { name: "engagedSessions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
  });
  const pageHeaders = pagesResponse.metricHeaders.map((header) => header.name);
  const channelHeaders = channelsResponse.metricHeaders.map((header) => header.name);
  return {
    total: ga4Total(totalResponse),
    pages: (pagesResponse.rows || []).map((row) => {
      const values = metricMap(row, pageHeaders);
      return {
        page: row.dimensionValues?.[0]?.value ?? null,
        views: values.screenPageViews || 0,
        active_users: values.activeUsers || 0,
      };
    }),
    channels: (channelsResponse.rows || []).map((row) => {
      const values = metricMap(row, channelHeaders);
      return {
        channel: row.dimensionValues?.[0]?.value ?? null,
        sessions: values.sessions || 0,
        engaged_sessions: values.engagedSessions || 0,
      };
    }),
  };
}

async function runGa4(period) {
  try {
    const token = await googleToken();
    const current = await ga4Slice(token, period.from, period.to);
    const previous = await ga4Slice(token, period.previous_from, period.previous_to);
    report.ga4 = {
      property_id: GA4_PROPERTY,
      total: { current: current.total, previous: previous.total },
      pages: { current: current.pages, previous: previous.pages },
      channels: { current: current.channels, previous: previous.channels },
    };
  } catch (error) {
    report.ga4 = { error: note("GA4", error) };
  }
}

async function metrikaData(counterId, token, from, to, dimensions) {
  const params = new URLSearchParams({
    ids: counterId,
    metrics: "ym:s:visits,ym:s:users",
    date1: from,
    date2: to,
    accuracy: "full",
    limit: "100",
  });
  if (dimensions) params.set("dimensions", dimensions);
  const response = await fetch(`https://api-metrika.yandex.net/stat/v1/data?${params}`, {
    headers: { Authorization: `OAuth ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  if (!response.ok) {
    const message = body.message || body.errors?.[0]?.message || `HTTP ${response.status}`;
    throw new Error(String(message));
  }
  return body;
}

function metrikaSlice(totalsBody, sourcesBody) {
  const totals = totalsBody.totals || [0, 0];
  return {
    visits: Math.round(totals[0] || 0),
    users: Math.round(totals[1] || 0),
    sources: (sourcesBody.data || []).map((row) => ({
      source: row.dimensions?.[0]?.name || row.dimensions?.[0]?.id || null,
      visits: Math.round(row.metrics?.[0] || 0),
      users: Math.round(row.metrics?.[1] || 0),
    })),
  };
}

async function runMetrika(period) {
  try {
    const token = process.env.YANDEX_OAUTH_TOKEN;
    const counterId = process.env.YANDEX_METRIKA_COUNTER_ID;
    if (!token) throw new Error("В .env нет YANDEX_OAUTH_TOKEN");
    if (!counterId) throw new Error("В .env нет YANDEX_METRIKA_COUNTER_ID");
    const [currentTotals, currentSources, previousTotals, previousSources] = await Promise.all([
      metrikaData(counterId, token, period.from, period.to),
      metrikaData(counterId, token, period.from, period.to, "ym:s:lastTrafficSource"),
      metrikaData(counterId, token, period.previous_from, period.previous_to),
      metrikaData(counterId, token, period.previous_from, period.previous_to, "ym:s:lastTrafficSource"),
    ]);
    const current = metrikaSlice(currentTotals, currentSources);
    report.metrika = {
      ...current,
      previous: metrikaSlice(previousTotals, previousSources),
    };
  } catch (error) {
    report.metrika = { error: note("Метрика", error) };
  }
}

async function metrikaGet(url, token) {
  const response = await fetch(url, {
    headers: { Authorization: `OAuth ${token}`, Accept: "application/json" },
    signal: AbortSignal.timeout(45000),
  });
  const text = await response.text();
  let body = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = {};
  }
  if (!response.ok) {
    throw new Error(String(body.message || body.errors?.[0]?.message || `HTTP ${response.status}`));
  }
  return body;
}

// Карточка организации на Яндекс Картах (Яндекс Бизнес): отдельный счётчик Метрики «онлайн-организация».
// Показы карточки в поиске и на карте API не отдаёт, они только в кабинете yandex.ru/sprav.
async function businessSlice(counterId, token, goals, from, to) {
  const base = { ids: counterId, date1: from, date2: to, accuracy: "full" };
  const totals = await metrikaGet(
    `https://api-metrika.yandex.net/stat/v1/data?${new URLSearchParams({ ...base, metrics: "ym:s:visits,ym:s:users" })}`,
    token,
  );
  const pages = await metrikaGet(
    `https://api-metrika.yandex.net/stat/v1/data?${new URLSearchParams({ ...base, metrics: "ym:s:visits", dimensions: "ym:s:startURL", limit: "20" })}`,
    token,
  );
  const reaches = new Map();
  for (let i = 0; i < goals.length; i += 20) {
    const chunk = goals.slice(i, i + 20);
    const body = await metrikaGet(
      `https://api-metrika.yandex.net/stat/v1/data?${new URLSearchParams({
        ...base,
        metrics: chunk.map((goal) => `ym:s:goal${goal.id}reaches`).join(","),
      })}`,
      token,
    );
    chunk.forEach((goal, index) => reaches.set(goal.id, Math.round(body.totals?.[index] || 0)));
  }
  return {
    visits: Math.round(totals.totals?.[0] || 0),
    users: Math.round(totals.totals?.[1] || 0),
    pages: (pages.data || []).map((row) => ({
      url: row.dimensions?.[0]?.name || null,
      visits: Math.round(row.metrics?.[0] || 0),
    })),
    reaches,
  };
}

async function runYandexBusiness(period) {
  try {
    const token = process.env.YANDEX_OAUTH_TOKEN;
    const counterId = process.env.YANDEX_BUSINESS_COUNTER_ID || "114017689";
    if (!token) throw new Error("В .env нет YANDEX_OAUTH_TOKEN");
    const goalsBody = await metrikaGet(
      `https://api-metrika.yandex.net/management/v1/counter/${counterId}/goals`,
      token,
    );
    const goals = (goalsBody.goals || []).map((goal) => ({ id: goal.id, name: goal.name }));
    const [current, previous] = await Promise.all([
      businessSlice(counterId, token, goals, period.from, period.to),
      businessSlice(counterId, token, goals, period.previous_from, period.previous_to),
    ]);
    const actions = goals
      .map((goal) => ({
        action: goal.name,
        current: current.reaches.get(goal.id) || 0,
        previous: previous.reaches.get(goal.id) || 0,
      }))
      .filter((row) => row.current || row.previous);
    report.yandex_business = {
      counter_id: counterId,
      card_url: "https://yandex.ru/maps/org/alekseyev_petr/148881429593/",
      current: { visits: current.visits, users: current.users, pages: current.pages },
      previous: { visits: previous.visits, users: previous.users, pages: previous.pages },
      actions,
      actions_tracked: goals.length,
      note: "Визиты и действия по карточке из Метрики. Показы в поиске и на карте API не отдаёт: смотреть в кабинете yandex.ru/sprav.",
    };
  } catch (error) {
    report.yandex_business = { error: note("Яндекс Бизнес", error) };
  }
}

function articleSlugs() {
  const blogDir = path.join(ROOT, "blog");
  const posts = JSON.parse(fs.readFileSync(path.join(blogDir, "posts.json"), "utf8"));
  const titles = new Map();
  const ordered = [];
  for (const post of posts) {
    if (!post.slug || ordered.includes(post.slug)) continue;
    ordered.push(post.slug);
    titles.set(post.slug, post.title || null);
  }
  const skip = new Set(["index.html", "_article-template.html"]);
  for (const name of fs.readdirSync(blogDir).sort()) {
    if (!name.endsWith(".html") || skip.has(name)) continue;
    const slug = name.slice(0, -5);
    if (!ordered.includes(slug)) ordered.push(slug);
    const html = fs.readFileSync(path.join(blogDir, name), "utf8");
    if (/http-equiv=["']refresh["']|location\.replace/i.test(html)) {
      const at = ordered.indexOf(slug);
      if (at >= 0) ordered.splice(at, 1);
      continue; // страница-заглушка «Статья переехала»
    }
    const title = html.match(/<title>([^<]*)<\/title>/i);
    if (title) titles.set(slug, decodeHtml(title[1].trim()).replace(/\s+[—–|-]\s+Пётр Алексеев\s*$/, ""));
  }
  return { slugs: ordered, titles };
}

async function runArticles() {
  try {
    const { slugs, titles } = articleSlugs();
    const url = `https://petr-alekseev.ru/api/views.php?slugs=${encodeURIComponent(slugs.join(","))}`;
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(30000),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body || body.ok === false) {
      throw new Error(body?.error || `Счётчик статей HTTP ${response.status}`);
    }
    const views = body.views || {};
    const articles = slugs.map((slug) => ({
      slug,
      title: titles.get(slug) ?? null,
      views: Object.prototype.hasOwnProperty.call(views, slug) ? Number(views[slug]) : null,
    }));
    report.article_views = {
      total: sumKnown(articles.map((article) => article.views)),
      articles,
    };
  } catch (error) {
    report.article_views = { error: note("Счётчик статей", error) };
  }
}

function parseTelegram(html, period) {
  const posts = [];
  const seen = new Set();
  for (const chunk of html.split("tgme_widget_message_wrap").slice(1)) {
    if (/service_message|tgme_widget_message_service/.test(chunk)) continue;
    const id = chunk.match(/data-post="([^"]+)"/)?.[1] || null;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const datetime = chunk.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] || null;
    const viewsRaw = chunk.match(/tgme_widget_message_views">([^<]*)</)?.[1] ?? null;
    const reactionMatches = [
      ...chunk.matchAll(/<span class="tgme_reaction[^"]*">[\s\S]*?<\/i>\s*([\d.,KkКк]+)\s*<\/span>/g),
    ];
    const hasReactionBlock = /tgme_widget_message_reactions/.test(chunk);
    posts.push({
      id,
      url: `https://t.me/${id}`,
      date: datetime ? moscowDate(datetime) : null,
      views: viewsRaw == null ? null : parseCompactNumber(viewsRaw),
      reactions: hasReactionBlock ? sumKnown(reactionMatches.map((match) => parseCompactNumber(match[1]))) ?? 0 : 0,
    });
  }
  let subscribers = null;
  for (const match of html.matchAll(/counter_value">([^<]*)<\/span>\s*<span class="counter_type">([^<]*)</g)) {
    if (/subscriber|member|подписчик/i.test(match[2])) {
      subscribers = parseCompactNumber(match[1]);
    }
  }
  const periodPosts = posts.filter((post) => inPeriod(post.date, period.from, period.to));
  // Охват на пост по неделям назад от конца периода: видно падение, а не только «эта неделя к прошлой».
  const weekly = [];
  for (let i = 0; i < 6; i++) {
    const to = formatDate(addDays(parseDate(period.to), -7 * i));
    const from = formatDate(addDays(parseDate(to), -6));
    const bucket = posts.filter((post) => inPeriod(post.date, from, to) && post.views != null);
    weekly.push({
      from,
      to,
      posts: bucket.length,
      avg_views_per_post: bucket.length ? round(sumKnown(bucket.map((post) => post.views)) / bucket.length, 1) : null,
    });
  }
  const mature = periodPosts.filter((post) => post.views != null && daysBetween(post.date, formatDate(localToday())) >= 3);
  return {
    url: "https://t.me/s/Alekseev_Petr_consult",
    subscribers,
    posts: posts.map((post) => ({ ...post, age_days: post.date ? daysBetween(post.date, formatDate(localToday())) : null })),
    period: {
      posts: periodPosts.length,
      views: sumKnown(periodPosts.map((post) => post.views)),
      reactions: sumKnown(periodPosts.map((post) => post.reactions)),
      avg_views_per_post: periodPosts.length ? round(sumKnown(periodPosts.map((post) => post.views)) / periodPosts.length, 1) : null,
      // посты старше 3 суток: их просмотры уже почти не растут, сравнивать недели честнее по ним
      avg_views_mature_posts: mature.length ? round(sumKnown(mature.map((post) => post.views)) / mature.length, 1) : null,
      mature_posts: mature.length,
    },
    weekly_avg_views: weekly,
  };
}

function scriptJson(html) {
  const found = [];
  for (const match of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
    const body = match[2].trim();
    if (!body.startsWith("{") && !body.startsWith("[")) continue;
    try {
      found.push(JSON.parse(body));
    } catch {
      /* страница может содержать не-JSON */
    }
  }
  return found;
}

function findKeyedNumber(node, keys, depth = 0, best = { depth: 99, value: null }) {
  if (!node || typeof node !== "object" || depth > 7) return best;
  if (!Array.isArray(node)) {
    for (const key of keys) {
      if (node[key] == null || depth >= best.depth) continue;
      const value = parseCompactNumber(node[key]);
      if (value != null) best = { depth, value };
    }
  }
  for (const child of Array.isArray(node) ? node : Object.values(node)) {
    if (child && typeof child === "object") best = findKeyedNumber(child, keys, depth + 1, best);
  }
  return best;
}

function collectPosts(node, acc, depth = 0) {
  if (!node || typeof node !== "object" || depth > 8 || acc.length > 40) return;
  if (Array.isArray(node)) {
    for (const item of node) collectPosts(item, acc, depth + 1);
    return;
  }
  const title = node.title || node.name || node.header || node.textTitle;
  const views =
    node.views ?? node.viewsCount ?? node.viewCount ?? node.views_count ?? node.reads ?? node.readCount ?? null;
  const reactions =
    node.reactions ?? node.likes ?? node.likesCount ?? node.likeCount ?? node.commentsCount ?? null;
  const age =
    node.publishedAt ||
    node.publishTime ||
    node.publicationDate ||
    node.date ||
    node.timeAgo ||
    node.pubDate ||
    node.age ||
    null;
  if (typeof title === "string" && title.length > 8 && title.length < 240 && (views != null || age != null)) {
    acc.push({
      title: stripTags(title),
      age: typeof age === "string" || typeof age === "number" ? String(age) : null,
      views: parseCompactNumber(views),
      reactions: reactions == null ? null : parseCompactNumber(reactions),
    });
  }
  for (const child of Object.values(node)) {
    if (child && typeof child === "object") collectPosts(child, acc, depth + 1);
  }
}

function dateFromAge(age, today) {
  if (!age) return null;
  const iso = String(age).match(/\d{4}-\d{2}-\d{2}/);
  if (iso) return iso[0];
  const stamp = Number(age);
  if (Number.isFinite(stamp) && stamp > 1000000000) {
    const millis = stamp > 100000000000 ? stamp : stamp * 1000;
    return moscowDate(new Date(millis).toISOString());
  }
  const text = String(age).toLowerCase();
  const hours = text.match(/(\d+)\s*час/);
  if (hours) return moscowDate(new Date(Date.now() - Number(hours[1]) * 3600000).toISOString());
  if (/(^|\s)час\s+назад/.test(text)) return moscowDate(new Date(Date.now() - 3600000).toISOString());
  if (/сегодня|минут/.test(text)) return formatDate(today);
  if (text.includes("вчера")) return formatDate(addDays(today, -1));
  const days = text.match(/(\d+)\s*(день|дня|дней)/);
  if (days) return formatDate(addDays(today, -Number(days[1])));
  // «N недель назад» слишком грубо для границы периода: дату не угадываем
  if (/недел/.test(text)) return null;
  return null;
}

function parseOpenChannel(html, url, period) {
  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim() || null;
  const blobs = scriptJson(html);
  const subscriberKeys = [
    "subscribers",
    "subscribersCount",
    "subscriberCount",
    "followers",
    "followersCount",
    "followerCount",
  ];
  let subscribers = null;
  for (const key of subscriberKeys) {
    const match = html.match(new RegExp(`"${key}"\\s*:\\s*"?(\\d[\\d\\s]*)"?`));
    if (match) {
      subscribers = parseCompactNumber(match[1]);
      break;
    }
  }
  if (subscribers == null) {
    let best = { depth: 99, value: null };
    for (const blob of blobs) best = findKeyedNumber(blob, subscriberKeys, 0, best);
    subscribers = best.value;
  }
  if (subscribers == null) {
    const textMatch = html.match(/([\d\s\u00a0]+)\s*подписчик/i);
    if (textMatch) subscribers = parseCompactNumber(textMatch[1].replace(/\u00a0/g, ""));
  }
  const rawPosts = [];
  for (const blob of blobs) collectPosts(blob, rawPosts);
  const seen = new Set();
  const today = localToday();
  const posts = [];
  for (const post of rawPosts) {
    const key = post.title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const date = dateFromAge(post.age, today);
    posts.push({ ...post, date });
    if (posts.length >= 30) break;
  }
  const dated = posts.filter((post) => post.date);
  const periodPosts = dated.filter((post) => inPeriod(post.date, period.from, period.to));
  return {
    url,
    title,
    subscribers,
    posts: posts.length ? posts : null,
    period: dated.length
      ? {
          posts: periodPosts.length,
          views: sumKnown(periodPosts.map((post) => post.views)),
          reactions: sumKnown(periodPosts.map((post) => post.reactions)),
        }
      : null,
  };
}

function parseTenchat(html, period) {
  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim() || null;
  let subscribers = null;
  const subscriberCandidates = [];
  {
    const flat = html.replace(/<[^>]+>/g, "|").replace(/\s+/g, " ");
    for (const m of flat.matchAll(/(\d+)\s*\|*\s*подписчик/gi)) subscriberCandidates.push(Number(m[1]));
    if (subscriberCandidates.length) subscribers = subscriberCandidates[0];
  }
  const today = localToday();
  const posts = [];
  const seen = new Set();
  for (const chunk of html.split('data-cy="post-wrapper"').slice(1)) {
    const text = (fragment) => stripTags(fragment || "").replace(/\s+/g, " ").trim();
    const postTitle = text(chunk.match(/data-cy="title"[^>]*>([\s\S]{0,600}?)<\/(?:h\d|div|a|span|p)>/i)?.[1]);
    const age = text(chunk.match(/data-cy="date"[^>]*>([\s\S]{0,300}?)<\/(?:div|span|a|p|time)>/i)?.[1]);
    if (!postTitle || seen.has(postTitle)) continue;
    seen.add(postTitle);
    let at = chunk.indexOf('data-cy="post-full-card-reactions"');
    at = at < 0 ? -1 : chunk.indexOf(">", at) + 1;
    const run = [];
    if (at > 0) {
      for (const part of chunk.slice(at, at + 8000).replace(/<[^>]+>/g, "|").split("|")) {
        const value = part.trim();
        if (!value) continue;
        if (!/^\d+$/.test(value)) break;
        run.push(Number(value));
      }
    }
    // после блока реакций идут числа: [лайки, если есть], комментарии, репосты, просмотры
    const views = run.length >= 3 ? run[run.length - 1] : null;
    const likes = run.length >= 4 ? run[0] : 0;
    posts.push({
      title: postTitle,
      age,
      date: dateFromAge(age, today),
      views,
      reactions: likes,
    });
  }
  const dated = posts.filter((post) => post.date);
  const periodPosts = dated.filter((post) => inPeriod(post.date, period.from, period.to));
  return {
    url: "https://tenchat.ru/5317936",
    title,
    subscribers,
    subscribers_candidates: subscriberCandidates,
    posts: posts.length ? posts : null,
    period: dated.length
      ? {
          posts: periodPosts.length,
          views: sumKnown(periodPosts.map((post) => post.views)),
          reactions: sumKnown(periodPosts.map((post) => post.reactions)),
        }
      : null,
  };
}

function parseDzen(html, period) {
  const title = decodeHtml(html.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim() || null;
  let subscribers = null;
  const num = html.match(/"subscribers"\s*:\s*(\d+)/);
  if (num) subscribers = Number(num[1]);
  else if (/нет подписчиков/i.test(html)) subscribers = 0;
  const today = localToday();
  const ages = [...html.matchAll(/channel--card-header__publishedAt[^>]*>([^<]+)</g)].map((m) => m[1].trim());
  const posts = ages.map((age) => ({ title: null, age, date: dateFromAge(age, today), views: null, reactions: null }));
  const dated = posts.filter((post) => post.date);
  return {
    url: "https://dzen.ru/petr_alekseev",
    title,
    subscribers,
    posts: posts.length ? posts : null,
    period: dated.length
      ? {
          posts: dated.filter((post) => inPeriod(post.date, period.from, period.to)).length,
          views: null,
          reactions: null,
        }
      : null,
    note: "Просмотры и реакции Дзена в публичной странице не отдаются; считаем только публикации по относительным датам.",
  };
}

function checkChannel(key, data) {
  const warnings = [];
  if (data.subscribers == null) warnings.push("подписчики не найдены");
  if (!data.posts || !data.posts.length) warnings.push("посты не разобраны (разметка страницы могла измениться или страница не отдалась)");
  if (!data.title && key !== "telegram") warnings.push("у страницы нет заголовка: возможно, получена заглушка или капча");
  const distinct = new Set(data.subscribers_candidates || []);
  if (distinct.size > 1) {
    warnings.push(`несколько кандидатов на число подписчиков: ${[...distinct].join(", ")}; взято первое (${data.subscribers}), проверить вручную`);
  }
  return warnings;
}

async function runChannel(key, url, period, parser) {
  try {
    const html = await fetchText(url);
    report.social[key] = parser(html, period);
    const warnings = checkChannel(key, report.social[key]);
    if (warnings.length) {
      report.social[key].warnings = warnings.map((text) => note(key, new Error(text)));
    }
  } catch (error) {
    report.social[key] = {
      url,
      title: null,
      subscribers: null,
      posts: null,
      period: null,
      error: note(key, error),
    };
  }
}

async function runSocial(period) {
  await Promise.all([
    runChannel("telegram", "https://t.me/s/Alekseev_Petr_consult", period, (html) => parseTelegram(html, period)),
    runChannel("tenchat", "https://tenchat.ru/5317936", period, (html) =>
      parseTenchat(html, period),
    ),
    runChannel("dzen", "https://dzen.ru/petr_alekseev", period, (html) =>
      parseDzen(html, period),
    ),
  ]);
}

function buildPeriod() {
  const today = localToday();
  const to = arg("--to") || formatDate(addDays(today, -1));
  const from = arg("--from") || formatDate(addDays(parseDate(to), -6));
  parseDate(from);
  parseDate(to);
  if (from > to) throw new Error("--from позже, чем --to");
  const length = inclusiveDays(from, to);
  const previousTo = addDays(parseDate(from), -1);
  const previousFrom = addDays(previousTo, -(length - 1));
  return {
    from,
    to,
    previous_from: formatDate(previousFrom),
    previous_to: formatDate(previousTo),
    generated_at: new Date().toISOString(),
  };
}

function writeReports(period) {
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const localDir = path.join(ROOT, ".seo-reports", "weekly");
  fs.mkdirSync(localDir, { recursive: true });
  fs.mkdirSync(COPY_DIR, { recursive: true });
  const name = `${period.to}.json`;
  const localPath = path.join(localDir, name);
  const copyPath = path.join(COPY_DIR, name);
  fs.writeFileSync(localPath, json, "utf8");
  fs.writeFileSync(copyPath, json, "utf8");
  return { localPath, copyPath };
}

function printSummary(paths) {
  const google = report.google?.week?.current;
  const ga4 = report.ga4?.total?.current;
  const articles = report.article_views;
  const telegram = report.social.telegram?.period;
  console.log(`Период ${report.period.from} — ${report.period.to}`);
  console.log(
    google
      ? `Search Console: ${google.clicks} кликов, ${google.impressions} показов, позиция ${google.position}`
      : `Search Console: ${report.google?.error || "нет данных"}`,
  );
  console.log(
    ga4
      ? `GA4: ${ga4.active_users} пользователей, ${ga4.views} просмотров`
      : `GA4: ${report.ga4?.error || "нет данных"}`,
  );
  console.log(
    report.metrika?.error
      ? `Метрика: ${report.metrika.error}`
      : `Метрика: ${report.metrika?.visits ?? "нет"} визитов, ${report.metrika?.users ?? "нет"} посетителей`,
  );
  console.log(
    report.yandex_business?.error
      ? `Яндекс Бизнес: ${report.yandex_business.error}`
      : `Яндекс Бизнес (карточка): ${report.yandex_business?.current?.visits ?? "нет"} визитов, действий: ${(report.yandex_business?.actions || []).reduce((sum, row) => sum + row.current, 0)}`,
  );
  console.log(
    articles?.articles
      ? `Статьи: ${articles.total} просмотров, ${articles.articles.length} страниц`
      : `Статьи: ${articles?.error || "нет данных"}`,
  );
  console.log(
    telegram
      ? `Telegram за период: ${telegram.posts} постов`
      : `Telegram: ${report.social.telegram?.error || "нет данных"}`,
  );
  console.log(`Ошибок и предупреждений: ${report.errors.length}`);
  for (const line of report.errors) console.log(`  - ${line}`);
  console.log(paths.localPath);
  console.log(paths.copyPath);
}

async function main() {
  loadDotEnv(path.join(ROOT, ".env"));
  report.period = buildPeriod();
  await Promise.all([
    runGoogle(report.period),
    runGa4(report.period),
    runMetrika(report.period),
    runYandexBusiness(report.period),
    runArticles(),
    runSocial(report.period),
  ]);
  const paths = writeReports(report.period);
  printSummary(paths);
}

main().catch((error) => {
  console.error(safeError(error));
  process.exitCode = 1;
});
