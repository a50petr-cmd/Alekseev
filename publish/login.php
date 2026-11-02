<?php
declare(strict_types=1);

require_once __DIR__ . '/_auth.php';

if (admin_logged_in()) {
    header('Location: /publish/');
    exit;
}

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $pass = (string)($_POST['password'] ?? '');
    if (!admin_is_configured()) {
        $error = 'Пароль не настроен. Создайте petr-alekseev-data/admin.local.php по образцу publish/config.example.php';
    } elseif (admin_try_login($pass)) {
        header('Location: /publish/');
        exit;
    } else {
        $error = 'Неверный пароль';
    }
}
?><!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Вход — админка блога</title>
  <meta name="robots" content="noindex,nofollow">
  <link rel="stylesheet" href="/publish/admin.css">
</head>
<body class="admin-body">
  <main class="login-card">
    <h1>Админка блога</h1>
    <p class="muted">Пётр Алексеев · публикация статей</p>
    <?php if ($error !== ''): ?><p class="err"><?php echo htmlspecialchars($error, ENT_QUOTES, 'UTF-8'); ?></p><?php endif; ?>
    <form method="post" action="">
      <label>Пароль<input type="password" name="password" required autofocus autocomplete="current-password"></label>
      <button type="submit" class="btn">Войти</button>
    </form>
  </main>
</body>
</html>
