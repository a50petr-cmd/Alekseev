<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Robots-Tag: noindex, nofollow');

/**
 * Одноразовая диагностика SMTP. Удалить после проверки.
 * Вызов: /api/smtp-test.php?key=LEADMAIL2026
 */
if (($_GET['key'] ?? '') !== 'LEADMAIL2026') {
    http_response_code(404);
    echo json_encode(['ok' => false]);
    exit;
}

$local = __DIR__ . '/smtp.local.php';
if (!is_file($local)) {
    echo json_encode(['ok' => false, 'error' => 'no_smtp_local']);
    exit;
}

/** @var mixed $cfg */
$cfg = include $local;
if (!is_array($cfg) || empty($cfg['user']) || empty($cfg['pass'])) {
    echo json_encode(['ok' => false, 'error' => 'bad_config']);
    exit;
}

function expect($fp, array $ok): array
{
    $response = '';
    while (($line = fgets($fp, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    $code = (int)substr($response, 0, 3);
    return [$code, trim($response), in_array($code, $ok, true)];
}

function cmd($fp, string $c, array $ok): array
{
    fwrite($fp, $c . "\r\n");
    return expect($fp, $ok);
}

$user = (string)$cfg['user'];
$pass = (string)$cfg['pass'];
$from = (string)($cfg['from'] ?? $user);
$to = 'a50petro@yandex.ru';

$attempts = [
    ['label' => 'ssl_465', 'remote' => 'ssl://smtp.yandex.ru:465', 'starttls' => false],
    ['label' => 'tcp_587_starttls', 'remote' => 'tcp://smtp.yandex.ru:587', 'starttls' => true],
];

$results = [];
$sent = false;

foreach ($attempts as $attempt) {
    $errno = 0;
    $errstr = '';
    $fp = @stream_socket_client($attempt['remote'], $errno, $errstr, 15, STREAM_CLIENT_CONNECT);
    $row = ['attempt' => $attempt['label'], 'connect' => $fp !== false, 'errno' => $errno, 'errstr' => $errstr];
    if ($fp === false) {
        $results[] = $row;
        continue;
    }
    stream_set_timeout($fp, 15);
    [$c, $r, $ok] = expect($fp, [220]);
    $row['banner'] = [$c, $r, $ok];
    if (!$ok) {
        fclose($fp);
        $results[] = $row;
        continue;
    }

    if ($attempt['starttls']) {
        [$c, $r, $ok] = cmd($fp, 'EHLO petr-alekseev.ru', [250]);
        $row['ehlo1'] = [$c, $r, $ok];
        if ($ok) {
            [$c, $r, $ok] = cmd($fp, 'STARTTLS', [220]);
            $row['starttls'] = [$c, $r, $ok];
            if ($ok) {
                $crypto = @stream_socket_enable_crypto($fp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);
                $row['crypto'] = (bool)$crypto;
                if (!$crypto) {
                    fclose($fp);
                    $results[] = $row;
                    continue;
                }
            }
        }
    }

    [$c, $r, $ok] = cmd($fp, 'EHLO petr-alekseev.ru', [250]);
    $row['ehlo'] = [$c, $r, $ok];
    if (!$ok) {
        fclose($fp);
        $results[] = $row;
        continue;
    }

    [$c, $r, $ok] = cmd($fp, 'AUTH LOGIN', [334]);
    $row['auth'] = [$c, $r, $ok];
    if ($ok) {
        [$c, $r, $ok] = cmd($fp, base64_encode($user), [334]);
        $row['user'] = [$c, $ok];
        if ($ok) {
            [$c, $r, $ok] = cmd($fp, base64_encode($pass), [235]);
            $row['pass'] = [$c, $r, $ok];
        }
    }

    if (!empty($row['pass'][2])) {
        cmd($fp, 'MAIL FROM:<' . $from . '>', [250]);
        cmd($fp, 'RCPT TO:<' . $to . '>', [250, 251]);
        [$c, $r, $ok] = cmd($fp, 'DATA', [354]);
        if ($ok) {
            $subject = '=?UTF-8?B?' . base64_encode('SMTP selftest petr-alekseev.ru') . '?=';
            $msg = "From: <$from>\r\nTo: <$to>\r\nSubject: $subject\r\n"
                . 'Message-ID: <selftest.' . bin2hex(random_bytes(8)) . '@yandex.ru>' . "\r\n"
                . "MIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n"
                . "SMTP selftest ok\r\n.\r\n";
            fwrite($fp, $msg);
            [$c, $r, $ok] = expect($fp, [250]);
            $row['data'] = [$c, $r, $ok];
            $sent = $ok;
        }
        cmd($fp, 'QUIT', [221]);
    }

    fclose($fp);
    $results[] = $row;
    if ($sent) {
        break;
    }
}

echo json_encode([
    'ok' => $sent,
    'config_user' => $user,
    'config_from' => $from,
    'has_pass' => $pass !== '',
    'pass_len' => strlen($pass),
    'results' => $results,
], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
