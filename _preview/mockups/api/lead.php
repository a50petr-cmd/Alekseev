<?php
declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'method']);
    exit;
}

$name = trim((string)($_POST['name'] ?? ''));
$contact = trim((string)($_POST['contact'] ?? ''));
$task = trim((string)($_POST['task'] ?? ''));
$consent = isset($_POST['consent']);
$honeypot = trim((string)($_POST['website'] ?? ''));
$elapsed = (float)($_POST['_elapsed'] ?? 0);

if ($honeypot !== '') {
    echo json_encode(['ok' => true]);
    exit;
}

if ($elapsed > 0 && $elapsed < 3) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_fast']);
    exit;
}

if ($name === '' || $contact === '' || $task === '' || !$consent) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'validation']);
    exit;
}

if (mb_strlen($name) > 120 || mb_strlen($contact) > 200 || mb_strlen($task) > 4000) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'too_long']);
    exit;
}

$safeName = str_replace(["\r", "\n"], ' ', $name);
$safeContact = str_replace(["\r", "\n"], ' ', $contact);
$body = "Имя: {$safeName}\nКонтакт: {$safeContact}\n\nЗадача:\n{$task}\n";
$headers = "From: noreply@petr-alekseev.ru\r\nContent-Type: text/plain; charset=UTF-8\r\n";
$sent = @mail('a50petro@yandex.ru', 'Заявка с сайта', $body, $headers);

if (!$sent) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'mail']);
    exit;
}

echo json_encode(['ok' => true]);
