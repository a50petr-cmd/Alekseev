<?php
declare(strict_types=1);

function admin_config(): array
{
    static $cfg = null;
    if ($cfg !== null) {
        return $cfg;
    }

    $candidates = [
        dirname(__DIR__) . DIRECTORY_SEPARATOR . 'petr-alekseev-data' . DIRECTORY_SEPARATOR . 'admin.local.php',
        __DIR__ . DIRECTORY_SEPARATOR . 'config.local.php',
    ];

    foreach ($candidates as $path) {
        if (is_file($path)) {
            $loaded = require $path;
            if (is_array($loaded)) {
                $cfg = $loaded;
                return $cfg;
            }
        }
    }

    $cfg = [];
    return $cfg;
}

function admin_boot_session(): void
{
    $cfg = admin_config();
    $name = (string)($cfg['session_name'] ?? 'pa_blog_admin');
    if (session_status() !== PHP_SESSION_ACTIVE) {
        session_name($name);
        session_start([
            'cookie_httponly' => true,
            'cookie_samesite' => 'Lax',
            'use_strict_mode' => true,
        ]);
    }
}

function admin_is_configured(): bool
{
    $cfg = admin_config();
    $hash = (string)($cfg['password_hash'] ?? '');
    return $hash !== '' && strpos($hash, 'replaceWithPasswordHash') === false;
}

function admin_logged_in(): bool
{
    admin_boot_session();
    return !empty($_SESSION['admin_ok']);
}

function admin_require_login(): void
{
    if (!admin_logged_in()) {
        header('Location: /publish/login.php');
        exit;
    }
}

function admin_try_login(string $password): bool
{
    if (!admin_is_configured()) {
        return false;
    }
    $hash = (string)(admin_config()['password_hash'] ?? '');
    if (!password_verify($password, $hash)) {
        return false;
    }
    admin_boot_session();
    session_regenerate_id(true);
    $_SESSION['admin_ok'] = true;
    return true;
}

function admin_logout(): void
{
    admin_boot_session();
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $p = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $p['path'], $p['domain'], $p['secure'], $p['httponly']);
    }
    session_destroy();
}

function admin_json(array $data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('X-Content-Type-Options: nosniff');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
