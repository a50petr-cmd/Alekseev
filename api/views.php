<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

// Директория для хранения данных (вне корня сайта)
const DATA_DIR = 'petr-alekseev-data';
const MIN_VIEWS = 30;

/**
 * Путь к директории данных: уровнем выше веб-корня либо api/data/
 */
function get_data_dir(): string
{
    $parent = dirname(__DIR__) . DIRECTORY_SEPARATOR . DATA_DIR;

    // Сначала пробуем родительскую директорию
    if (is_dir($parent) || @mkdir($parent, 0700, true)) {
        return $parent;
    }
    if (is_writable($parent)) {
        return $parent;
    }

    // Запасной вариант: api/data/ (если есть .htaccess)
    $fallback = __DIR__ . DIRECTORY_SEPARATOR . 'data';
    if (!is_dir($fallback)) {
        @mkdir($fallback, 0700, true);
    }
    if (is_writable($fallback)) {
        return $fallback;
    }

    // Если ничего не сработало, используем временную директорию (для локального режима)
    $temp = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'petr-alekseev-views';
    if (!is_dir($temp)) {
        @mkdir($temp, 0700, true);
    }
    return is_writable($temp) ? $temp : '';
}

function client_ip(): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return $ip !== '' ? $ip : '0.0.0.0';
}

function is_bot_ua(string $ua): bool
{
    if ($ua === '') {
        return true; // Пустой User-Agent считаем ботом
    }

    $ua_lower = strtolower($ua);
    $patterns = ['bot', 'crawl', 'spider', 'slurp', 'yandex', 'google', 'bing', 'headless', 'lighthouse', 'preview'];

    foreach ($patterns as $pattern) {
        if (strpos($ua_lower, $pattern) !== false) {
            return true;
        }
    }

    return false;
}

function load_valid_slugs(): array
{
    $file = __DIR__ . '/../blog/posts.json';
    if (!is_file($file)) {
        return [];
    }

    $json = json_decode(file_get_contents($file), true);
    if (!is_array($json)) {
        return [];
    }

    $slugs = [];
    foreach ($json as $item) {
        if (isset($item['slug']) && is_string($item['slug'])) {
            $slugs[$item['slug']] = true;
        }
    }

    return $slugs;
}

/**
 * Инициализация БД (SQLite или JSON)
 */
function init_db(string $data_dir): PDO|null
{
    if ($data_dir === '') {
        return null;
    }

    $db_file = $data_dir . DIRECTORY_SEPARATOR . 'views.db';

    // Пробуем использовать SQLite
    try {
        $pdo = new PDO('sqlite:' . $db_file, null, null, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);

        // Создаём таблицы если их нет
        $pdo->exec('
            CREATE TABLE IF NOT EXISTS views (
                slug TEXT PRIMARY KEY,
                count INTEGER NOT NULL DEFAULT 0
            )
        ');

        $pdo->exec('
            CREATE TABLE IF NOT EXISTS hits (
                hash TEXT PRIMARY KEY,
                created_at INTEGER
            )
        ');

        return $pdo;
    } catch (PDOException $e) {
        // SQLite недоступна, вернём null для JSON-fallback
        return null;
    }
}

/**
 * JSON-based storage fallback
 */
class JsonStorage
{
    private string $file;
    private string $hits_file;

    public function __construct(string $data_dir)
    {
        $this->file = $data_dir . DIRECTORY_SEPARATOR . 'views.json';
        $this->hits_file = $data_dir . DIRECTORY_SEPARATOR . 'hits.json';
    }

    public function read_count(string $slug): int
    {
        $data = $this->read_file($this->file);
        return (int)($data[$slug] ?? 0);
    }

    public function read_counts(array $slugs): array
    {
        $data = $this->read_file($this->file);
        $result = [];
        foreach ($slugs as $slug) {
            $result[$slug] = (int)($data[$slug] ?? 0);
        }
        return $result;
    }

    public function increment_count(string $slug): int
    {
        $data = $this->read_file($this->file);
        if (!isset($data[$slug])) {
            $data[$slug] = 0;
        }
        $data[$slug]++;
        $this->write_file($this->file, $data);
        return (int)$data[$slug];
    }

    public function check_and_record_hit(string $hash): bool
    {
        $hits = $this->read_file($this->hits_file);
        if (isset($hits[$hash])) {
            return false; // Уже был просмотр
        }

        $hits[$hash] = time();
        $this->cleanup_old_hits($hits);
        $this->write_file($this->hits_file, $hits);

        return true;
    }

    private function cleanup_old_hits(array &$hits): void
    {
        $now = time();
        $ttl = 48 * 3600; // 2 дня
        foreach ($hits as $hash => $timestamp) {
            if (($now - $timestamp) > $ttl) {
                unset($hits[$hash]);
            }
        }
    }

    private function read_file(string $file): array
    {
        if (!is_file($file)) {
            return [];
        }

        $fp = @fopen($file, 'r');
        if ($fp === false) {
            return [];
        }

        try {
            if (!flock($fp, LOCK_SH)) {
                return [];
            }
            $content = stream_get_contents($fp);
            $data = json_decode(is_string($content) ? $content : '', true);
            flock($fp, LOCK_UN);
            return is_array($data) ? $data : [];
        } finally {
            if (is_resource($fp)) {
                fclose($fp);
            }
        }
    }

    private function write_file(string $file, array $data): void
    {
        $tmp = $file . '.' . uniqid('tmp_', false);
        $fp = @fopen($tmp, 'w');
        if ($fp === false) {
            return;
        }

        try {
            if (!flock($fp, LOCK_EX)) {
                @unlink($tmp);
                return;
            }
            fwrite($fp, json_encode($data));
            fflush($fp);
            flock($fp, LOCK_UN);
            @rename($tmp, $file);
        } finally {
            if (is_resource($fp)) {
                fclose($fp);
            }
            @unlink($tmp);
        }
    }
}

// Основная логика
$method = $_SERVER['REQUEST_METHOD'];
$valid_slugs = load_valid_slugs();

if ($method === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);

    if (!is_array($input) || !isset($input['slug'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_request']);
        exit;
    }

    $slug = $input['slug'];

    // Проверка slug
    if (!isset($valid_slugs[$slug])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_slug']);
        exit;
    }

    // Проверка ботов
    $ua = (string)($_SERVER['HTTP_USER_AGENT'] ?? '');
    $is_bot = is_bot_ua($ua);

    // Генерируем хеш просмотра для защиты от накрутки
    $ip = client_ip();
    $salt = 'petr-alekseev-views'; // Можно вынести в константу
    $date = date('Y-m-d');
    $hit_hash = hash('sha256', $ip . $slug . $date . $salt);

    $data_dir = get_data_dir();
    $pdo = $data_dir !== '' ? init_db($data_dir) : null;

    // Текущее число просмотров
    $current_count = 0;

    if ($pdo !== null) {
        // SQLite
        try {
            $stmt = $pdo->prepare('SELECT count FROM views WHERE slug = ?');
            $stmt->execute([$slug]);
            $row = $stmt->fetch(PDO::FETCH_ASSOC);
            $current_count = $row ? (int)$row['count'] : 0;

            // Проверка защиты от накрутки
            if (!$is_bot) {
                $hit_stmt = $pdo->prepare('SELECT 1 FROM hits WHERE hash = ?');
                $hit_stmt->execute([$hit_hash]);

                if (!$hit_stmt->fetch()) {
                    // Первый просмотр за сегодня с этого IP для этой статьи
                    $current_count++;

                    // Обновляем счётчик
                    $upsert = $pdo->prepare('
                        INSERT INTO views (slug, count) VALUES (?, ?)
                        ON CONFLICT(slug) DO UPDATE SET count = ?
                    ');
                    $upsert->execute([$slug, $current_count, $current_count]);

                    // Записываем хеш просмотра
                    $hit_insert = $pdo->prepare('INSERT INTO hits (hash, created_at) VALUES (?, ?)');
                    $hit_insert->execute([$hit_hash, time()]);

                    // Чистим старые хиты (старше 2 дней)
                    $ttl = 48 * 3600;
                    $pdo->prepare('DELETE FROM hits WHERE created_at < ?')->execute([time() - $ttl]);
                }
            }
        } catch (Exception $e) {
            // Ошибка БД, но вернём текущее значение
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'db_error']);
            exit;
        }
    } else {
        // JSON fallback
        $storage = new JsonStorage($data_dir);
        $current_count = $storage->read_count($slug);

        if (!$is_bot && $storage->check_and_record_hit($hit_hash)) {
            $current_count++;
            $storage->increment_count($slug);
        }
    }

    echo json_encode([
        'ok' => true,
        'slug' => $slug,
        'views' => $current_count,
    ]);
    exit;
}

if ($method === 'GET') {
    $slugs_param = (string)($_GET['slugs'] ?? '');

    if ($slugs_param === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'missing_slugs']);
        exit;
    }

    $slugs = array_filter(explode(',', $slugs_param), fn($s) => isset($valid_slugs[trim($s)]));
    $slugs = array_map('trim', $slugs);

    if (empty($slugs)) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'invalid_slugs']);
        exit;
    }

    $data_dir = get_data_dir();
    $pdo = $data_dir !== '' ? init_db($data_dir) : null;

    $views = [];

    if ($pdo !== null) {
        // SQLite
        try {
            $placeholders = implode(',', array_fill(0, count($slugs), '?'));
            $stmt = $pdo->prepare("SELECT slug, count FROM views WHERE slug IN ($placeholders)");
            $stmt->execute($slugs);

            foreach ($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                $views[$row['slug']] = (int)$row['count'];
            }

            // Добавляем нулевые значения для отсутствующих slug
            foreach ($slugs as $slug) {
                if (!isset($views[$slug])) {
                    $views[$slug] = 0;
                }
            }
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode(['ok' => false, 'error' => 'db_error']);
            exit;
        }
    } else {
        // JSON fallback
        $storage = new JsonStorage($data_dir);
        $views = $storage->read_counts($slugs);
    }

    echo json_encode([
        'ok' => true,
        'views' => $views,
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['ok' => false, 'error' => 'method']);
