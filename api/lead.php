<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

function strip_crlf(string $value): string
{
    return str_replace(["\r", "\n"], ' ', $value);
}

function digits_only(string $value): string
{
    return preg_replace('/\D+/', '', $value) ?? '';
}

function normalize_phone_digits(string $raw): string
{
    $d = digits_only($raw);
    if ($d === '') {
        return '';
    }
    if ($d[0] === '8') {
        $d = '7' . substr($d, 1);
    }
    if ($d[0] !== '7') {
        $d = '7' . $d;
    }
    return substr($d, 0, 11);
}

function format_phone(string $digits): string
{
    if (strlen($digits) !== 11 || $digits[0] !== '7') {
        return $digits;
    }
    $n = substr($digits, 1);
    return sprintf(
        '+7 (%s) %s-%s-%s',
        substr($n, 0, 3),
        substr($n, 3, 3),
        substr($n, 6, 2),
        substr($n, 8, 2)
    );
}

function is_valid_phone_digits(string $digits): bool
{
    if (strlen($digits) !== 11 || $digits[0] !== '7') {
        return false;
    }
    return in_array($digits[1], ['3', '4', '5', '8', '9'], true);
}

function extract_telegram_username(string $raw): string
{
    $v = trim($raw);
    $v = preg_replace('#^https?://#i', '', $v) ?? $v;
    $v = preg_replace('#^t\.me/#i', '', $v) ?? $v;
    $v = ltrim($v, '@');
    return $v;
}

function is_valid_telegram(string $raw): bool
{
    $user = extract_telegram_username($raw);
    return (bool)preg_match('/^[A-Za-z0-9_]{5,32}$/', $user);
}

function client_ip(): string
{
    $ip = (string)($_SERVER['REMOTE_ADDR'] ?? '0.0.0.0');
    return $ip !== '' ? $ip : '0.0.0.0';
}

/** @return bool true if allowed, false if limit exceeded */
function rate_limit_allow(string $ip): bool
{
    $dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'pa_lead_rate';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        return true;
    }

    $file = $dir . DIRECTORY_SEPARATOR . hash('sha256', $ip) . '.json';
    $now = time();
    $window = 3600;
    $max = 5;
    $times = [];

    $fp = @fopen($file, 'c+');
    if ($fp === false) {
        return true;
    }

    try {
        if (!flock($fp, LOCK_EX)) {
            return true;
        }
        $raw = stream_get_contents($fp);
        $decoded = json_decode(is_string($raw) ? $raw : '', true);
        if (is_array($decoded)) {
            foreach ($decoded as $t) {
                $ts = (int)$t;
                if ($ts > 0 && ($now - $ts) < $window) {
                    $times[] = $ts;
                }
            }
        }
        if (count($times) >= $max) {
            flock($fp, LOCK_UN);
            fclose($fp);
            return false;
        }
        $times[] = $now;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode(array_values($times)));
        fflush($fp);
        flock($fp, LOCK_UN);
        fclose($fp);
        return true;
    } catch (Throwable $e) {
        @flock($fp, LOCK_UN);
        @fclose($fp);
        return true;
    }
}

$name = trim((string)($_POST['name'] ?? ''));
$phone = trim((string)($_POST['phone'] ?? ''));
$email = trim((string)($_POST['email'] ?? ''));
$telegram = trim((string)($_POST['telegram'] ?? ''));
$task = trim((string)($_POST['task'] ?? ''));
$consent = isset($_POST['consent']);
$honeypot = trim((string)($_POST['website'] ?? ''));

if ($honeypot !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

if (!isset($_POST['_elapsed']) || (float)$_POST['_elapsed'] < 3) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_fast']);
    exit;
}

$errors = [];

if ($name === '') {
    $errors['name'] = 'Укажите имя';
} elseif (mb_strlen($name) > 120) {
    $errors['name'] = 'Слишком длинное имя';
}

$phoneDigits = normalize_phone_digits($phone);
if ($phone === '' || $phoneDigits === '' || $phoneDigits === '7') {
    $errors['phone'] = 'Укажите телефон';
} elseif (!is_valid_phone_digits($phoneDigits)) {
    $errors['phone'] = 'Введите телефон полностью: +7 (926) 923-29-29';
}

if ($email !== '') {
    if (mb_strlen($email) > 200 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
        $errors['email'] = 'Проверьте почту, например name@mail.ru';
    }
}

if ($telegram !== '') {
    if (mb_strlen($telegram) > 200 || !is_valid_telegram($telegram)) {
        $errors['telegram'] = 'Введите ник Telegram, например @username';
    }
}

if ($task === '') {
    $errors['task'] = 'Опишите задачу коротко';
} elseif (mb_strlen($task) > 4000) {
    $errors['task'] = 'Слишком длинное описание';
}

if (!$consent) {
    $errors['consent'] = 'Нужно согласие на обработку данных';
}

if ($errors !== []) {
    http_response_code(422);
    echo json_encode(['ok' => false, 'errors' => $errors], JSON_UNESCAPED_UNICODE);
    exit;
}

if (!rate_limit_allow(client_ip())) {
    http_response_code(429);
    echo json_encode([
        'ok' => false,
        'error' => 'rate_limit',
        'message' => 'Слишком много заявок, напишите в Telegram @PetroAlekseev',
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$safeName = strip_crlf($name);
$safePhone = strip_crlf(format_phone($phoneDigits));
$safeEmail = $email !== '' ? strip_crlf($email) : 'не указано';
$safeTelegram = 'не указано';
if ($telegram !== '') {
    $safeTelegram = strip_crlf('@' . extract_telegram_username($telegram));
}
$safeTask = str_replace("\0", '', $task);

$referer = strip_crlf((string)($_SERVER['HTTP_REFERER'] ?? ''));
if (mb_strlen($referer) > 300) {
    $referer = mb_substr($referer, 0, 300);
}
if ($referer === '') {
    $referer = 'не указано';
}

$to = 'a50petro@yandex.ru';
$subjectText = 'Новая заявка с сайта petr-alekseev.ru';
$bodyText = "Новая заявка с сайта petr-alekseev.ru\n"
    . "--------------------------------\n"
    . "Имя: {$safeName}\n"
    . "Телефон: {$safePhone}\n"
    . "Почта: {$safeEmail}\n"
    . "Telegram: {$safeTelegram}\n"
    . "Страница: {$referer}\n"
    . "--------------------------------\n"
    . "Задача:\n{$safeTask}\n";

$replyTo = ($email !== '' && filter_var($email, FILTER_VALIDATE_EMAIL) !== false)
    ? strip_crlf($email)
    : $to;

$sent = send_lead_email($to, $subjectText, $bodyText, $replyTo);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
    exit;
}

echo json_encode(['ok' => true]);

/**
 * @return array{host:string,port:int,user:string,pass:string,from:string,from_name:string}|null
 */
function load_smtp_config(): ?array
{
    $local = __DIR__ . '/smtp.local.php';
    if (!is_file($local)) {
        return null;
    }
    /** @var mixed $cfg */
    $cfg = include $local;
    if (!is_array($cfg)) {
        return null;
    }
    $user = trim((string)($cfg['user'] ?? ''));
    $pass = (string)($cfg['pass'] ?? '');
    if ($user === '' || $pass === '') {
        return null;
    }
    return [
        'host' => (string)($cfg['host'] ?? 'ssl://smtp.yandex.ru'),
        'port' => (int)($cfg['port'] ?? 465),
        'user' => $user,
        'pass' => $pass,
        'from' => (string)($cfg['from'] ?? $user),
        'from_name' => (string)($cfg['from_name'] ?? 'Сайт petr-alekseev.ru'),
    ];
}

function encode_mime_header(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

function build_message_id(): string
{
    return '<lead.' . bin2hex(random_bytes(12)) . '@petr-alekseev.ru>';
}

function build_raw_email(
    string $to,
    string $fromEmail,
    string $fromName,
    string $subject,
    string $body,
    string $replyTo
): string {
    $qpBody = quoted_printable_encode(str_replace("\r\n", "\n", $body));
    $qpBody = str_replace("\n", "\r\n", $qpBody);

    $headers = [
        'Date: ' . date('r'),
        'From: ' . encode_mime_header($fromName) . ' <' . $fromEmail . '>',
        'To: <' . $to . '>',
        'Reply-To: <' . $replyTo . '>',
        'Message-ID: ' . build_message_id(),
        'MIME-Version: 1.0',
        'Content-Type: text/plain; charset=UTF-8',
        'Content-Transfer-Encoding: quoted-printable',
        'X-Mailer: petr-alekseev.ru',
        'Auto-Submitted: auto-generated',
    ];

    return 'Subject: ' . encode_mime_header($subject) . "\r\n"
        . implode("\r\n", $headers) . "\r\n\r\n"
        . $qpBody . "\r\n";
}

function smtp_expect($fp, array $okCodes): bool
{
    $response = '';
    while (($line = fgets($fp, 515)) !== false) {
        $response .= $line;
        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }
    $code = (int)substr($response, 0, 3);
    return in_array($code, $okCodes, true);
}

function smtp_cmd($fp, string $cmd, array $okCodes): bool
{
    fwrite($fp, $cmd . "\r\n");
    return smtp_expect($fp, $okCodes);
}

function send_via_smtp(array $cfg, string $to, string $subject, string $body, string $replyTo): bool
{
    $host = $cfg['host'];
    $port = $cfg['port'];
    $errno = 0;
    $errstr = '';
    $fp = @stream_socket_client(
        $host . ':' . $port,
        $errno,
        $errstr,
        20,
        STREAM_CLIENT_CONNECT
    );
    if ($fp === false) {
        return false;
    }
    stream_set_timeout($fp, 20);

    try {
        if (!smtp_expect($fp, [220])) {
            return false;
        }
        $ehloHost = 'petr-alekseev.ru';
        if (!smtp_cmd($fp, 'EHLO ' . $ehloHost, [250])) {
            return false;
        }
        if (!smtp_cmd($fp, 'AUTH LOGIN', [334])) {
            return false;
        }
        if (!smtp_cmd($fp, base64_encode($cfg['user']), [334])) {
            return false;
        }
        if (!smtp_cmd($fp, base64_encode($cfg['pass']), [235])) {
            return false;
        }
        if (!smtp_cmd($fp, 'MAIL FROM:<' . $cfg['from'] . '>', [250])) {
            return false;
        }
        if (!smtp_cmd($fp, 'RCPT TO:<' . $to . '>', [250, 251])) {
            return false;
        }
        if (!smtp_cmd($fp, 'DATA', [354])) {
            return false;
        }

        $raw = build_raw_email($to, $cfg['from'], $cfg['from_name'], $subject, $body, $replyTo);
        // Dot-stuffing
        $raw = preg_replace('/^\./m', '..', $raw) ?? $raw;
        fwrite($fp, $raw . "\r\n.\r\n");
        if (!smtp_expect($fp, [250])) {
            return false;
        }
        smtp_cmd($fp, 'QUIT', [221]);
        return true;
    } finally {
        fclose($fp);
    }
}

function send_via_mail(string $to, string $subject, string $body, string $replyTo): bool
{
    // Ящик должен существовать в панели Reg.ru (Почта), иначе Яндекс часто кладёт в спам.
    $fromEmail = 'forms@petr-alekseev.ru';
    $fromName = 'Сайт petr-alekseev.ru';
    $qpBody = quoted_printable_encode(str_replace("\r\n", "\n", $body));
    $qpBody = str_replace("\n", "\r\n", $qpBody);

    $headers = 'Date: ' . date('r') . "\r\n"
        . 'From: ' . encode_mime_header($fromName) . ' <' . $fromEmail . ">\r\n"
        . 'Reply-To: <' . $replyTo . ">\r\n"
        . 'Message-ID: ' . build_message_id() . "\r\n"
        . "MIME-Version: 1.0\r\n"
        . "Content-Type: text/plain; charset=UTF-8\r\n"
        . "Content-Transfer-Encoding: quoted-printable\r\n"
        . "X-Mailer: petr-alekseev.ru\r\n"
        . "Auto-Submitted: auto-generated";

    return @mail(
        $to,
        encode_mime_header($subject),
        $qpBody,
        $headers,
        '-f ' . $fromEmail
    );
}

function send_lead_email(string $to, string $subject, string $body, string $replyTo): bool
{
    $smtp = load_smtp_config();
    if ($smtp !== null) {
        if (send_via_smtp($smtp, $to, $subject, $body, $replyTo)) {
            return true;
        }
    }
    return send_via_mail($to, $subject, $body, $replyTo);
}
